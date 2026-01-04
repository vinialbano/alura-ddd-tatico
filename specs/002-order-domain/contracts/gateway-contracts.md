# Gateway Contracts: External Context Integration

**Feature**: Order Domain and Checkout Flow
**Branch**: `002-order-domain`
**Date**: 2025-12-28
**Status**: Design Complete

## Overview

This document defines functional contracts for synchronous integration with external bounded contexts (Product Catalog and Pricing). These contracts serve as Anti-Corruption Layer (ACL) interfaces, protecting the Order domain from external system changes.

**Implementation Pattern**:
- Gateway interfaces defined in **Application layer** (`src/application/gateways/`)
- Gateway implementations in **Infrastructure layer** (`src/infrastructure/gateways/`)
- Domain services depend on gateway interfaces (dependency inversion)

## Product Catalog Gateway

### Purpose

Retrieves product data from the Product Catalog bounded context to create ProductSnapshot value objects during checkout. This ensures Order aggregate captures essential product information at the moment of purchase, maintaining stability even if catalog data changes or products are deleted.

### Interface Definition

**Location**: `src/application/gateways/catalog.gateway.interface.ts`

```typescript
export interface CatalogGateway {
  /**
   * Retrieves product data for creating ProductSnapshot.
   *
   * @param productId - Product identifier from cart item
   * @returns Product data with required snapshot fields (name, description, SKU)
   * @throws ProductDataUnavailableError - If product not found or service unavailable
   */
  getProductData(productId: ProductId): Promise<ProductData>;

  /**
   * Batch retrieves product data for multiple products.
   * More efficient when processing multiple cart items.
   *
   * @param productIds - Array of product identifiers
   * @returns Map of productId to ProductData
   * @throws ProductDataUnavailableError - If any product fails to load
   */
  getProductDataBatch(productIds: ProductId[]): Promise<Map<ProductId, ProductData>>;
}

export interface ProductData {
  /** Product name as it should appear in order history */
  name: string;

  /** Product description for customer reference */
  description: string;

  /** Stock Keeping Unit identifier (unique product code) */
  sku: string;
}
```

### Request/Response Contract

#### Single Product Request

**Input**:
```typescript
{
  productId: ProductId  // Value Object wrapping product UUID or code
}
```

**Output** (Success):
```typescript
{
  name: "Premium Coffee Beans",
  description: "Single-origin Arabica beans from Colombia, medium roast",
  sku: "COFFEE-COL-001"
}
```

**Output** (Error):
```typescript
throw new ProductDataUnavailableError(
  `Product data unavailable for product ${productId.toString()}: ${reason}`
);
```

#### Batch Request

**Input**:
```typescript
{
  productIds: [ProductId('uuid-1'), ProductId('uuid-2'), ProductId('uuid-3')]
}
```

**Output** (Success):
```typescript
Map {
  ProductId('uuid-1') => { name: "Coffee Beans", description: "...", sku: "COF-001" },
  ProductId('uuid-2') => { name: "Tea Leaves", description: "...", sku: "TEA-001" },
  ProductId('uuid-3') => { name: "Hot Chocolate", description: "...", sku: "HOT-001" }
}
```

### Error Conditions

| Error Scenario | Error Type | HTTP Status (if remote) | Description |
|----------------|------------|-------------------------|-------------|
| Product not found in catalog | `ProductDataUnavailableError` | 404 | Product ID does not exist |
| Catalog service timeout | `ProductDataUnavailableError` | 500 | Service did not respond within 2 seconds |
| Catalog service unavailable | `ProductDataUnavailableError` | 503 | Service is down or unreachable |
| Network error | `ProductDataUnavailableError` | 500 | Connection failed |
| Invalid product data | `ProductDataUnavailableError` | 500 | Response missing required fields |

### Timeout Requirement

**Maximum duration**: 2 seconds per request

**Behavior on timeout**: Throw `ProductDataUnavailableError` immediately. No retries. Checkout fails fast.

### Stub Implementation

For this educational phase, a stubbed implementation will be provided with hardcoded product data.

**Location**: `src/infrastructure/gateways/stub-catalog.gateway.ts`

**Stub Behavior**:
- Returns hardcoded ProductData for known product IDs
- Throws `ProductDataUnavailableError` for unknown product IDs
- Simulates 100ms network latency (configurable)
- Can simulate timeout scenarios for testing

**Example Stub Data**:
```typescript
const STUB_PRODUCTS: Map<string, ProductData> = new Map([
  ['COFFEE-COL-001', {
    name: 'Premium Coffee Beans',
    description: 'Single-origin Arabica beans from Colombia, medium roast',
    sku: 'COFFEE-COL-001'
  }],
  ['TEA-GRN-001', {
    name: 'Organic Green Tea',
    description: 'Premium sencha green tea leaves from Japan',
    sku: 'TEA-GRN-001'
  }],
  ['HOT-CHO-001', {
    name: 'Artisan Hot Chocolate',
    description: 'Rich dark chocolate drinking powder',
    sku: 'HOT-CHO-001'
  }]
]);
```

---

## Pricing Gateway

### Purpose

Calculates prices, line totals, discounts, and order totals for cart items by coordinating with the Pricing bounded context. This allows centralized pricing business rules (promotions, volume discounts, tax calculations) to be managed by the Pricing context while keeping the Order domain focused on order lifecycle management.

### Interface Definition

**Location**: `src/application/gateways/pricing.gateway.interface.ts`

```typescript
export interface PricingGateway {
  /**
   * Calculates comprehensive pricing for all cart items including discounts and totals.
   *
   * @param items - Array of cart items with product ID and quantity
   * @returns Complete pricing breakdown with item-level and order-level pricing
   * @throws ProductPricingFailedError - If pricing calculation fails for any item
   */
  calculatePricing(items: PricingInput[]): Promise<PricingResult>;
}

export interface PricingInput {
  /** Product identifier for price lookup */
  productId: ProductId;

  /** Number of units to price (affects volume discounts) */
  quantity: Quantity;
}

export interface PricingResult {
  /** Individual item pricing breakdown */
  items: ItemPricing[];

  /** Cart-wide discount applied (coupons, promotions affecting entire order) */
  orderLevelDiscount: Money;

  /** Final order total: sum(lineTotals) - sum(itemDiscounts) - orderLevelDiscount */
  orderTotal: Money;
}

export interface ItemPricing {
  /** Product identifier (matches input) */
  productId: ProductId;

  /** Price per unit at current time */
  unitPrice: Money;

  /** Product-level discount applied (zero if no discount) */
  itemDiscount: Money;

  /** Line total: (unitPrice × quantity) - itemDiscount */
  lineTotal: Money;
}
```

### Request/Response Contract

#### Pricing Request

**Input**:
```typescript
{
  items: [
    { productId: ProductId('COFFEE-COL-001'), quantity: Quantity(2) },
    { productId: ProductId('TEA-GRN-001'), quantity: Quantity(1) }
  ]
}
```

**Output** (Success):
```typescript
{
  items: [
    {
      productId: ProductId('COFFEE-COL-001'),
      unitPrice: Money(24.99, 'USD'),
      itemDiscount: Money(0.00, 'USD'),
      lineTotal: Money(49.98, 'USD')  // 24.99 × 2
    },
    {
      productId: ProductId('TEA-GRN-001'),
      unitPrice: Money(15.99, 'USD'),
      itemDiscount: Money(1.00, 'USD'),  // Product promotion
      lineTotal: Money(14.99, 'USD')     // 15.99 - 1.00
    }
  ],
  orderLevelDiscount: Money(5.00, 'USD'),  // Coupon applied
  orderTotal: Money(59.97, 'USD')          // 49.98 + 14.99 - 5.00
}
```

**Output** (Error):
```typescript
throw new ProductPricingFailedError(
  `Pricing calculation failed for product ${productId.toString()}: ${reason}`
);
```

### Pricing Calculation Rules

**Line Total Calculation**:
```
lineTotal = (unitPrice × quantity) - itemDiscount
```

**Order Total Calculation**:
```
orderTotal = sum(all lineTotals) - orderLevelDiscount
```

**Currency Consistency**:
- All Money values in PricingResult must share the same currency
- If items have different base currencies, pricing service must handle conversion
- Order domain validates currency consistency

**Discount Types**:
- **Item-level discount**: Product promotions, bundle discounts, volume discounts (per OrderItem)
- **Order-level discount**: Coupon codes, loyalty rewards, cart-wide promotions (per Order)

### Error Conditions

| Error Scenario | Error Type | HTTP Status (if remote) | Description |
|----------------|------------|-------------------------|-------------|
| Product price not found | `ProductPricingFailedError` | 404 | No price defined for product |
| Pricing service timeout | `ProductPricingFailedError` | 500 | Service did not respond within 2 seconds |
| Pricing service unavailable | `ProductPricingFailedError` | 503 | Service is down or unreachable |
| Invalid pricing data | `ProductPricingFailedError` | 500 | Response missing required fields |
| Currency mismatch | `ProductPricingFailedError` | 500 | Items priced in different currencies |
| Negative price | `ProductPricingFailedError` | 500 | Price calculation resulted in negative amount |

### Timeout Requirement

**Maximum duration**: 2 seconds per request

**Behavior on timeout**: Throw `ProductPricingFailedError` immediately. No retries. Checkout fails fast.

### Stub Implementation

For this educational phase, a stubbed implementation will be provided with hardcoded pricing rules.

**Location**: `src/infrastructure/gateways/stub-pricing.gateway.ts`

**Stub Behavior**:
- Returns hardcoded prices for known product IDs
- Throws `ProductPricingFailedError` for unknown product IDs
- Applies simple discount logic (configurable):
  - Item discount: 10% off for quantity >= 3 (volume discount)
  - Order discount: $5 off if order subtotal > $50
- Simulates 150ms network latency (configurable)
- Can simulate timeout scenarios for testing

**Example Stub Pricing Data**:
```typescript
const STUB_PRICES: Map<string, Money> = new Map([
  ['COFFEE-COL-001', new Money(24.99, 'USD')],
  ['TEA-GRN-001', new Money(15.99, 'USD')],
  ['HOT-CHO-001', new Money(8.99, 'USD')]
]);

// Stub discount rules
const VOLUME_DISCOUNT_THRESHOLD = 3;       // 10% off if qty >= 3
const VOLUME_DISCOUNT_PERCENT = 0.10;

const ORDER_DISCOUNT_THRESHOLD = 50.00;    // $5 off if subtotal > $50
const ORDER_DISCOUNT_AMOUNT = 5.00;
```

---

## Integration Patterns

### Gateway Usage in Domain Service

**OrderPricingService** orchestrates both gateways to produce complete PricedOrderData:

```typescript
class OrderPricingService {
  constructor(
    private readonly catalogGateway: CatalogGateway,
    private readonly pricingGateway: PricingGateway
  ) {}

  async price(cartItems: CartItem[]): Promise<PricedOrderData> {
    // Step 1: Retrieve product data for snapshots
    const productIds = cartItems.map(item => item.productId);
    const productDataMap = await this.catalogGateway.getProductDataBatch(productIds);

    // Step 2: Calculate pricing
    const pricingInput = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));
    const pricingResult = await this.pricingGateway.calculatePricing(pricingInput);

    // Step 3: Combine data into OrderItemData
    const orderItems = cartItems.map(cartItem => {
      const productData = productDataMap.get(cartItem.productId);
      const itemPricing = pricingResult.items.find(
        p => p.productId.equals(cartItem.productId)
      );

      return {
        productSnapshot: new ProductSnapshot(productData),
        quantity: cartItem.quantity,
        unitPrice: itemPricing.unitPrice,
        itemDiscount: itemPricing.itemDiscount,
        lineTotal: itemPricing.lineTotal
      };
    });

    return {
      items: orderItems,
      orderLevelDiscount: pricingResult.orderLevelDiscount,
      orderTotal: pricingResult.orderTotal
    };
  }
}
```

### Error Handling Strategy

**Domain Service Responsibility**:
- Catch gateway errors (ProductDataUnavailableError, ProductPricingFailedError)
- Re-throw as domain exceptions with enriched context
- No retry logic (fail fast for better UX)

**Application Service Responsibility**:
- Catch domain exceptions
- Translate to appropriate HTTP status codes
- Return clear error messages to client

**Example**:
```typescript
// In OrderPricingService (Domain)
try {
  const productData = await this.catalogGateway.getProductData(productId);
} catch (error) {
  if (error instanceof ProductDataUnavailableError) {
    throw new ProductDataUnavailableError(
      `Cannot create order: product data unavailable for ${productId.toString()}`
    );
  }
  throw error;
}

// In CheckoutService (Application)
try {
  const pricedData = await this.pricingService.price(cartItems);
} catch (error) {
  if (error instanceof ProductDataUnavailableError) {
    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
  if (error instanceof ProductPricingFailedError) {
    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
```

### Timeout Configuration

**Implementation Approach**: Use Promise.race pattern with timeout

```typescript
async getProductData(productId: ProductId): Promise<ProductData> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout after 2 seconds')), 2000)
  );

  const dataPromise = this.fetchProductDataFromExternalService(productId);

  try {
    return await Promise.race([dataPromise, timeoutPromise]);
  } catch (error) {
    throw new ProductDataUnavailableError(
      `Product data unavailable: ${error.message}`
    );
  }
}
```

---

## Testing Strategy

### Unit Testing (Domain Service)

**Test with Mocked Gateways**:
```typescript
describe('OrderPricingService', () => {
  let pricingService: OrderPricingService;
  let mockCatalogGateway: jest.Mocked<CatalogGateway>;
  let mockPricingGateway: jest.Mocked<PricingGateway>;

  beforeEach(() => {
    mockCatalogGateway = {
      getProductData: jest.fn(),
      getProductDataBatch: jest.fn()
    };
    mockPricingGateway = {
      calculatePricing: jest.fn()
    };
    pricingService = new OrderPricingService(
      mockCatalogGateway,
      mockPricingGateway
    );
  });

  it('should combine product data and pricing into order items', async () => {
    // Arrange
    mockCatalogGateway.getProductDataBatch.mockResolvedValue(/* ... */);
    mockPricingGateway.calculatePricing.mockResolvedValue(/* ... */);

    // Act
    const result = await pricingService.price(cartItems);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(mockCatalogGateway.getProductDataBatch).toHaveBeenCalledWith(/* ... */);
  });

  it('should throw ProductDataUnavailableError when catalog fails', async () => {
    // Arrange
    mockCatalogGateway.getProductDataBatch.mockRejectedValue(
      new ProductDataUnavailableError('Catalog unavailable')
    );

    // Act & Assert
    await expect(pricingService.price(cartItems)).rejects.toThrow(
      ProductDataUnavailableError
    );
  });
});
```

### Integration Testing (Stub Gateways)

**Test with Stub Implementations**:
```typescript
describe('CheckoutService (Integration)', () => {
  let checkoutService: CheckoutService;
  let catalogGateway: StubCatalogGateway;
  let pricingGateway: StubPricingGateway;

  beforeEach(() => {
    catalogGateway = new StubCatalogGateway();
    pricingGateway = new StubPricingGateway();
    const pricingService = new OrderPricingService(catalogGateway, pricingGateway);
    checkoutService = new CheckoutService(/* ... */, pricingService);
  });

  it('should create order with real stub pricing logic', async () => {
    // Act
    const order = await checkoutService.checkout(cartId, shippingAddress);

    // Assert
    expect(order.status).toBe(OrderStatus.AwaitingPayment);
    expect(order.items[0].unitPrice.amount).toBe(24.99);
  });
});
```

### E2E Testing

**Test with HTTP Endpoints**:
```typescript
describe('POST /orders/checkout (E2E)', () => {
  it('should create order successfully with valid cart', async () => {
    // Arrange
    const cart = await createTestCart();

    // Act
    const response = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send({ cartId: cart.id, shippingAddress: testAddress })
      .expect(201);

    // Assert
    expect(response.body.status).toBe('AWAITING_PAYMENT');
    expect(response.body.totalAmount.amount).toBeGreaterThan(0);
  });

  it('should return 500 when pricing service times out', async () => {
    // Arrange
    pricingGatewayStub.simulateTimeout();

    // Act
    const response = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send({ cartId: cart.id, shippingAddress: testAddress })
      .expect(500);

    // Assert
    expect(response.body.message).toContain('timeout');
  });
});
```

---

## Future Considerations

### Asynchronous Integration (Stage 4)

In the future event-driven architecture phase, these synchronous gateways will remain for checkout-time operations, but additional asynchronous patterns will be added:

- **Payment Context**: Asynchronous via domain events (OrderPlaced → PaymentRequested)
- **Inventory Context**: Asynchronous via domain events (OrderPlaced → StockReserved)

### Caching Strategy (Future Enhancement)

For production systems, consider:
- Cache product data (TTL: 5-10 minutes) to reduce catalog calls
- Cache pricing rules (invalidate on promotion changes)
- Implement circuit breaker pattern for gateway resilience

### Monitoring and Observability

Gateway implementations should instrument:
- Request duration metrics
- Timeout frequency
- Error rates by type
- External service availability

---

## References

- Feature Specification: [spec.md](../spec.md)
- Data Model: [data-model.md](../data-model.md)
- API Contract: [openapi.yaml](./openapi.yaml)
- DDD Gateways Pattern: `/docs/ddd-patterns/gateways.md`
- DDD Anti-Corruption Layer: `/docs/ddd-patterns/gateways.md#anti-corruption-layer`
