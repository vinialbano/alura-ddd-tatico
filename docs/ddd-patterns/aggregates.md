# Aggregates & Entities

## Implementation Guidelines

### Aggregate Design Rules
- Keep aggregates small and focused on transaction boundaries
- Enforce invariants within aggregate boundaries
- Use repository pattern to persist/retrieve entire aggregates

### Aggregate Reconstitution

When loading aggregates from persistence, use direct construction with the parameter object pattern to reconstitute aggregates with their full state:

```typescript
// Creating new aggregate (empty state, active status)
const cart = ShoppingCart.create(cartId, customerId);

// Reconstituting from persistence (with existing items and status)
const cart = new ShoppingCart({
  cartId,
  customerId,
  items,
  conversionStatus,
});
```

**Validation During Construction**:

The constructor enforces all domain invariants to ensure aggregates are always in a valid state:

- **MAX_PRODUCTS limit**: Cannot construct cart with more than 20 unique products
- **Quantity boundaries**: All items must have quantities between 1-10 (enforced by Quantity value object)
- **Business rules**: Cannot construct empty cart with converted status
- **Type safety**: conversionStatus must be 'active' or 'converted'

If any invariant is violated, the constructor throws a descriptive error. This ensures:
1. Domain integrity is maintained even with corrupted persistence data
2. Invalid states fail early at the persistence boundary
3. Application layer can handle construction failures consistently

**Key differences**:
- `ShoppingCart.create(cartId, customerId)`: Factory method for common case - creates new empty active cart (2 parameters)
- `new ShoppingCart(params)`: Direct construction for general case - handles any valid state including restoration (parameter object)

**Benefits of Parameter Object Pattern**:
- **Named parameters**: Clear intent at call site with property names
- **Extensibility**: Easy to add optional parameters in future without breaking changes
- **Type safety**: TypeScript ensures all required properties are provided
- **Self-documenting**: The `ShoppingCartParams` type documents the structure

The constructor accepts full aggregate state for persistence layer integration, but validates all invariants to prevent invalid states from entering the domain.

## ShoppingCart (Aggregate Root)

**Internal entity**: `CartItem`

**Key methods**:
- `addItem(productId, quantity)` - Add product to cart with validation
- `updateItemQuantity(productId, newQuantity)` - Update item quantity
- `removeItem(productId)` - Remove item from cart

**Invariants enforced**:
- Quantity must be > 0
- No duplicate products (same product = update quantity, not new item)
- Product must exist and be available

**Repository**: `ShoppingCartRepository` (in-memory)

**Code reference**: (to be implemented in domain layer)

## Order (Aggregate Root)

**Internal entity**: `OrderItem`

**Key methods**:
- `markAsPaid(paymentId)` - Confirm payment and transition state
- `cancel(reason)` - Cancel order with business rules validation
- `applyStockReserved()` (Lesson 4) - Apply stock reservation

**State management**: Explicit state machine with states: `AwaitingPayment`, `Paid`, `StockReserved`, `Cancelled`

**Creation**: Created from `ShoppingCart` during checkout via Application Service

**Repository**: `OrderRepository` (in-memory)

**Code reference**: (to be implemented in domain layer)

## Related Documentation
- State machine details: `/docs/domain/order-state-machine.md`
- Application services that orchestrate aggregates: `/docs/ddd-patterns/application-services.md`
- Lesson 1 (ShoppingCart): `/docs/lessons/lesson-1-shopping-cart.md`
- Lesson 2 (Order): `/docs/lessons/lesson-2-checkout-flow.md`
