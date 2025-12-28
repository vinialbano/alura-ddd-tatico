# Aggregates & Entities

## Implementation Guidelines

### Aggregate Design Rules
- Keep aggregates small and focused on transaction boundaries
- Enforce invariants within aggregate boundaries
- Use repository pattern to persist/retrieve entire aggregates

### Aggregate Reconstitution

When loading aggregates from persistence, use the `restore()` factory method pattern to reconstitute aggregates with their full state:

```typescript
// Creating new aggregate (empty state, active status)
const cart = ShoppingCart.create(cartId, customerId);

// Restoring from persistence (with existing items and status)
const cart = ShoppingCart.restore(cartId, customerId, items, conversionStatus);
```

**Key differences**:
- `create()`: Initializes new aggregate with default state
- `restore()`: Reconstitutes aggregate from persistence with arbitrary state

The `restore()` method bypasses initialization logic and accepts full aggregate state, enabling seamless persistence layer integration without exposing aggregate internals.

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
