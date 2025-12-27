# Lesson 2: Checkout Flow with Domain Service

## Implementation Objective
Transform cart into order using domain service and external gateways for pricing.

## Components to Implement

### Order Aggregate (Root)
- Internal entity: `OrderItem`
- Initial state: `AwaitingPayment`
- Created from `ShoppingCart` via application service

### Value Objects
- `Money` - Amount and currency with arithmetic operations
- `ShippingAddress` - Immutable address with validation
- `ProductSnapshot` - Point-in-time product data (name, price, description)

### Domain Service
**OrderPricingService** - Pricing logic spanning external contexts
- Use `CatalogGateway` to fetch product data
- Use `PricingGateway` to calculate prices
- Return `Money` and `ProductSnapshot` value objects

### Gateways (Anti-Corruption Layer)
**CatalogGateway**:
- `getProductById(productId: ProductId): Promise<ProductInfo>`
- `validateProductAvailability(productId: ProductId): Promise<boolean>`

**PricingGateway**:
- `calculatePrice(productId: ProductId, quantity: Quantity): Promise<Money>`
- `applyPromotions(items: CartItem[]): Promise<Money>`

### Application Service
**PlaceOrderFromCartApplicationService**:
1. Validate cart not empty
2. Use `OrderPricingService` for pricing
3. Create `Order` aggregate in `AwaitingPayment`
4. Mark cart as converted
5. Persist order

### Repository
- `OrderRepository` - In-memory implementation

## API Endpoint
- `POST /orders/checkout` - Transform cart to order

## Code Location
- Domain: Order aggregate, value objects, `OrderPricingService`, gateway interfaces
- Application: `PlaceOrderFromCartApplicationService`
- Infrastructure: Gateway implementations, repository, controller
