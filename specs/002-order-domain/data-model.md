# Data Model: Order Domain and Checkout Flow

**Feature**: Order Domain and Checkout Flow
**Branch**: `002-order-domain`
**Date**: 2025-12-28
**Status**: Design Complete

## Overview

This document defines the complete data model for the Order domain, including aggregates, entities, value objects, and their relationships. The model emphasizes domain-driven design principles: rich behavior, value objects over primitives, and aggregate boundaries.

## Aggregate Roots

### Order

**Description**: Aggregate root representing a customer's purchase intent and order lifecycle. Enforces state machine invariants and owns OrderItems collection.

**Identifier**: `OrderId` (Value Object wrapping UUID)

**State Machine**:
- AwaitingPayment (initial state)
- Paid (can transition to Cancelled)
- Cancelled (terminal state)

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `id` | `OrderId` | Yes | Unique order identifier | System-generated UUID |
| `cartId` | `CartId` | Yes | Reference to source shopping cart | Must exist in cart repository |
| `customerId` | `CustomerId` | Yes | Customer who created order | Inherited from cart |
| `items` | `OrderItem[]` | Yes | Collection of order items | Min 1 item, owned by aggregate |
| `shippingAddress` | `ShippingAddress` | Yes | Delivery address | Complete address with 5 required fields |
| `status` | `OrderStatus` | Yes | Current order state | One of: AwaitingPayment, Paid, Cancelled |
| `orderLevelDiscount` | `Money` | Yes | Cart-wide discount applied | Non-negative, zero if no discount |
| `totalAmount` | `Money` | Yes | Total order amount after discounts | Non-negative, calculated at creation |
| `paymentId` | `string \| null` | No | Payment transaction identifier | Set when marking as paid, null otherwise |
| `cancellationReason` | `string \| null` | No | Reason for cancellation | Set when cancelling, null otherwise, min 1 char |
| `createdAt` | `Date` | Yes | Order creation timestamp | System-generated, immutable |

**Invariants**:
1. Order must have at least one OrderItem
2. All OrderItems must share same currency as Order totalAmount
3. totalAmount = sum(items.lineTotal) - sum(items.itemDiscount) - orderLevelDiscount
4. Cannot transition to Paid unless currently in AwaitingPayment
5. Can only transition to Cancelled from AwaitingPayment or Paid
6. Cannot transition from Cancelled to any other state
7. paymentId must be provided when marking as Paid
8. cancellationReason must be provided when marking as Cancelled

**Methods** (Intention-Revealing):
- `static create(...)`: Factory method to create new Order in AwaitingPayment state
- `markAsPaid(paymentId: string): void`: Transition to Paid state with payment ID
- `cancel(reason: string): void`: Transition to Cancelled state with reason
- `canBePaid(): boolean`: Check if order can accept payment
- `canBeCancelled(): boolean`: Check if order can be cancelled

**Domain Events** (future phase):
- `OrderPlaced`: When order is created
- `OrderPaid`: When order is marked as paid
- `OrderCancelled`: When order is cancelled

---

### ShoppingCart (Existing)

**Description**: Pre-existing aggregate from Stage 1. Referenced during checkout to create Order.

**Identifier**: `CartId` (Value Object)

**Key Fields**:
- `id`: CartId
- `customerId`: CustomerId
- `items`: CartItem[]
- `isConverted`: boolean (marks cart as converted to order)
- `convertedOrderId`: OrderId | null (tracks which order was created)

**Interaction with Order**:
- Checkout process reads CartItems to create OrderItems
- After successful order creation, cart is marked as converted
- Subsequent checkout attempts return existing order ID

## Entities (Owned by Aggregates)

### OrderItem

**Description**: Entity within Order aggregate representing a single line item. Lifecycle managed entirely by parent Order.

**Identifier**: No independent ID (identified by position in collection or productSnapshot.sku)

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `productSnapshot` | `ProductSnapshot` | Yes | Captured product data at checkout | Complete snapshot with 3 required fields |
| `quantity` | `Quantity` | Yes | Number of units ordered | Positive integer, min 1 |
| `unitPrice` | `Money` | Yes | Price per unit at checkout time | Non-negative |
| `itemDiscount` | `Money` | Yes | Product-level discount applied | Non-negative, zero if no discount |
| `lineTotal` | `Money` | Yes | Total for this line item | Non-negative, calculated as (unitPrice × quantity) - itemDiscount |

**Invariants**:
1. lineTotal = (unitPrice × quantity) - itemDiscount
2. All Money fields must share same currency
3. Quantity must be at least 1
4. Cannot be modified after Order creation (immutable)

**Methods**:
- `static create(...)`: Factory method to create OrderItem with calculated lineTotal
- `getLineTotal(): Money`: Get calculated line total

---

### CartItem (Existing)

**Description**: Pre-existing entity from Stage 1 within ShoppingCart aggregate.

**Key Fields**:
- `productId`: ProductId
- `quantity`: Quantity

**Interaction with OrderItem**:
- CartItem data is transformed into OrderItem during checkout
- ProductId is used to fetch ProductSnapshot from catalog
- Quantity is copied directly to OrderItem

## Value Objects

### Money

**Description**: Monetary amount with explicit currency. Prevents primitive obsession and currency ambiguity.

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `amount` | `number` | Yes | Numeric value | Non-negative decimal, precision to 2 decimal places |
| `currency` | `string` | Yes | ISO 4217 currency code | 3-letter uppercase code (USD, EUR, BRL, etc.) |

**Invariants**:
1. amount must be >= 0 (no negative money)
2. currency must be valid ISO 4217 code (validated against known list or format)
3. amount rounded to 2 decimal places for consistency

**Methods**:
- `equals(other: Money): boolean`: Value equality check (amount and currency)
- `add(other: Money): Money`: Add two Money values (must have same currency)
- `subtract(other: Money): Money`: Subtract Money values (must have same currency, result non-negative)
- `multiply(factor: number): Money`: Multiply amount by factor
- `isZero(): boolean`: Check if amount is zero
- `toString(): string`: Format as "amount currency" (e.g., "99.99 USD")

**Examples**:
```typescript
const price = new Money(99.99, 'USD');
const discount = new Money(10.00, 'USD');
const total = price.subtract(discount); // Money(89.99, 'USD')
```

---

### ShippingAddress

**Description**: Delivery location for order fulfillment. Immutable once captured.

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `street` | `string` | Yes | Street address (line 1) | Min 1 char, max 200 chars |
| `addressLine2` | `string` | No | Apartment, suite, unit, etc. | Max 200 chars if provided |
| `city` | `string` | Yes | City name | Min 1 char, max 100 chars |
| `stateOrProvince` | `string` | Yes | State, province, or region | Min 1 char, max 100 chars |
| `postalCode` | `string` | Yes | Postal/ZIP code | Min 1 char, max 20 chars |
| `country` | `string` | Yes | Country name or ISO code | Min 2 chars, max 100 chars |
| `deliveryInstructions` | `string` | No | Optional delivery notes | Max 500 chars if provided |

**Invariants**:
1. All required fields (street, city, stateOrProvince, postalCode, country) must be non-empty
2. Optional fields (addressLine2, deliveryInstructions) can be null/undefined
3. Immutable after creation

**Methods**:
- `equals(other: ShippingAddress): boolean`: Value equality check (all fields)
- `toString(): string`: Format as single-line address string
- `toFullString(): string`: Format as multi-line address string

**Examples**:
```typescript
const address = new ShippingAddress({
  street: '123 Main St',
  city: 'Springfield',
  stateOrProvince: 'IL',
  postalCode: '62701',
  country: 'USA',
  deliveryInstructions: 'Ring doorbell twice'
});
```

---

### ProductSnapshot

**Description**: Captured product information at checkout time. Ensures order stability even if catalog product is modified or deleted.

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `name` | `string` | Yes | Product name | Min 1 char, max 200 chars |
| `description` | `string` | Yes | Product description | Min 1 char, max 1000 chars |
| `sku` | `string` | Yes | Stock Keeping Unit identifier | Min 1 char, max 50 chars, unique within order |

**Invariants**:
1. All 3 fields are required and non-empty
2. Immutable after creation
3. SKU should be unique within an order (no duplicate items)

**Methods**:
- `equals(other: ProductSnapshot): boolean`: Value equality check (all fields)
- `toString(): string`: Format as "name (SKU: sku)"

**Examples**:
```typescript
const snapshot = new ProductSnapshot({
  name: 'Premium Coffee Beans',
  description: 'Single-origin Arabica beans from Colombia, medium roast',
  sku: 'COFFEE-COL-001'
});
```

---

### OrderId

**Description**: Unique identifier for Order aggregate. Value Object wrapper around UUID.

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `value` | `string` | Yes | UUID string | Valid UUID v4 format |

**Invariants**:
1. Must be a valid UUID format
2. Immutable after creation

**Methods**:
- `static generate(): OrderId`: Generate new random OrderId
- `equals(other: OrderId): boolean`: Value equality check
- `toString(): string`: Return UUID string

---

### OrderStatus

**Description**: Order state enumeration or value object representing current lifecycle stage.

**Implementation Options**:

**Option 1: TypeScript Enum**
```typescript
enum OrderStatus {
  AwaitingPayment = 'AWAITING_PAYMENT',
  Paid = 'PAID',
  Cancelled = 'CANCELLED'
}
```

**Option 2: Value Object**
```typescript
class OrderStatus {
  private constructor(private readonly value: string) {}

  static readonly AwaitingPayment = new OrderStatus('AWAITING_PAYMENT');
  static readonly Paid = new OrderStatus('PAID');
  static readonly Cancelled = new OrderStatus('CANCELLED');

  equals(other: OrderStatus): boolean;
  toString(): string;
}
```

**Recommendation**: Use Value Object approach for better type safety and future extensibility (can add methods like `canTransitionTo(other: OrderStatus)`).

---

### Existing Value Objects (Reused from Stage 1)

#### ProductId
- Unique identifier for products in catalog
- Value Object wrapping UUID or string

#### Quantity
- Number of units for cart/order items
- Value Object wrapping positive integer
- Validation: Must be >= 1

#### CartId
- Unique identifier for Shopping Cart aggregate
- Value Object wrapping UUID

#### CustomerId
- Unique identifier for customer
- Value Object wrapping UUID or string

## Domain Services

### OrderPricingService

**Description**: Domain Service orchestrating pricing logic during checkout. Coordinates with external contexts to produce fully priced OrderItems.

**Dependencies** (via Application layer interfaces):
- `CatalogGateway`: Retrieves product data for snapshots
- `PricingGateway`: Calculates prices, line totals, discounts

**Method Signature**:
```typescript
pricе(cartItems: CartItem[]): Promise<PricedOrderData>
```

**Input**: Array of CartItem (productId + quantity)

**Output**: PricedOrderData containing:
- `items: OrderItemData[]`: Fully priced items (snapshot, quantity, unitPrice, itemDiscount, lineTotal)
- `orderLevelDiscount: Money`: Cart-wide discount
- `orderTotal: Money`: Total amount after all discounts

**Process**:
1. For each CartItem, retrieve product data from CatalogGateway → create ProductSnapshot
2. Send all CartItems to PricingGateway → receive unit prices, line totals, discounts
3. Validate all prices share same currency
4. Calculate order total: sum(lineTotals) - sum(itemDiscounts) - orderLevelDiscount
5. Return PricedOrderData ready for Order.create()

**Error Handling**:
- Throws `ProductDataUnavailableError` if catalog lookup fails for any product
- Throws `ProductPricingFailedError` if pricing calculation fails
- Enforces 2-second timeout on external calls

## External Context Contracts

### Product Catalog Context (via CatalogGateway)

**Contract Interface**:
```typescript
interface CatalogGateway {
  getProductData(productId: ProductId): Promise<ProductData>;
}

interface ProductData {
  name: string;
  description: string;
  sku: string;
}
```

**Timeout**: 2 seconds
**Error Handling**: Throw `ProductDataUnavailableError` on failure or timeout

---

### Pricing Context (via PricingGateway)

**Contract Interface**:
```typescript
interface PricingGateway {
  calculatePricing(items: PricingInput[]): Promise<PricingResult>;
}

interface PricingInput {
  productId: ProductId;
  quantity: Quantity;
}

interface PricingResult {
  items: ItemPricing[];
  orderLevelDiscount: Money;
  orderTotal: Money;
}

interface ItemPricing {
  productId: ProductId;
  unitPrice: Money;
  itemDiscount: Money;
  lineTotal: Money;
}
```

**Timeout**: 2 seconds
**Error Handling**: Throw `ProductPricingFailedError` on failure or timeout

## Relationships

### Aggregate Relationships

```
ShoppingCart (1) --converts-to--> (1) Order
  - One cart creates at most one order
  - Cart.convertedOrderId references Order.id
  - Cart.isConverted = true after order creation

Order (1) --owns--> (1..*) OrderItem
  - Order is aggregate root
  - OrderItems have no independent existence
  - OrderItems deleted if Order deleted
```

### Value Object Usage

```
Order contains:
  - OrderId (identifier)
  - CartId (reference to source cart)
  - CustomerId (customer reference)
  - ShippingAddress (delivery location)
  - OrderStatus (state)
  - Money (orderLevelDiscount, totalAmount)

OrderItem contains:
  - ProductSnapshot (captured product data)
  - Quantity (units ordered)
  - Money (unitPrice, itemDiscount, lineTotal)
```

## Data Model Validation Rules Summary

| Entity/VO | Key Validation | Error Type |
|-----------|---------------|------------|
| Order | Min 1 OrderItem | InvalidOrderStateError |
| Order | State machine transitions | InvalidOrderStateTransitionError |
| Order | PaymentId required when marking paid | InvalidOrderStateError |
| Order | Cancellation reason required | InvalidOrderStateError |
| OrderItem | lineTotal = (unitPrice × quantity) - itemDiscount | InvalidOrderItemError |
| Money | amount >= 0 | InvalidMoneyError |
| Money | Valid ISO 4217 currency | InvalidCurrencyError |
| ShippingAddress | All 5 required fields non-empty | InvalidShippingAddressError |
| ProductSnapshot | All 3 fields non-empty | InvalidProductSnapshotError |
| Quantity | value >= 1 | InvalidQuantityError |
| OrderId | Valid UUID format | InvalidOrderIdError |

## Database Schema (Future Reference)

**Note**: Current implementation uses in-memory storage. This section documents future database schema for reference.

### orders table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  cart_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  order_level_discount_amount DECIMAL(10,2) NOT NULL,
  order_level_discount_currency CHAR(3) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  total_currency CHAR(3) NOT NULL,
  payment_id VARCHAR(255),
  cancellation_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  -- Shipping address denormalized
  shipping_street VARCHAR(200) NOT NULL,
  shipping_address_line2 VARCHAR(200),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state_province VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) NOT NULL,
  shipping_delivery_instructions VARCHAR(500),
  CONSTRAINT fk_cart FOREIGN KEY (cart_id) REFERENCES carts(id),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_orders_cart_id ON orders(cart_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### order_items table
```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL,
  product_snapshot_name VARCHAR(200) NOT NULL,
  product_snapshot_description VARCHAR(1000) NOT NULL,
  product_snapshot_sku VARCHAR(50) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 1),
  unit_price_amount DECIMAL(10,2) NOT NULL,
  unit_price_currency CHAR(3) NOT NULL,
  item_discount_amount DECIMAL(10,2) NOT NULL,
  item_discount_currency CHAR(3) NOT NULL,
  line_total_amount DECIMAL(10,2) NOT NULL,
  line_total_currency CHAR(3) NOT NULL,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

## Migration from Shopping Cart Data Model

**Existing Entities (Unchanged)**:
- ShoppingCart aggregate
- CartItem entity
- ProductId, Quantity, CartId, CustomerId value objects

**New Entities (This Phase)**:
- Order aggregate
- OrderItem entity
- Money, ShippingAddress, ProductSnapshot, OrderId, OrderStatus value objects
- OrderPricingService domain service

**Integration Points**:
- Checkout service reads ShoppingCart.items (CartItem[])
- OrderPricingService transforms CartItem[] → OrderItem[] with pricing
- Order.create() uses transformed OrderItems
- ShoppingCart.markAsConverted() called after successful order creation

## References

- Feature Specification: [spec.md](./spec.md)
- Research Document: [research.md](./research.md)
- Implementation Plan: [plan.md](./plan.md)
- DDD Aggregates Pattern: `/docs/ddd-patterns/aggregates.md`
- DDD Value Objects Pattern: `/docs/ddd-patterns/value-objects.md`
- DDD Domain Services Pattern: `/docs/ddd-patterns/domain-services.md`
