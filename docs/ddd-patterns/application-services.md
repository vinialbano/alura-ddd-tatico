# Application Services (Use Cases)

## Purpose
Application Services orchestrate use cases, coordinating aggregates, repositories, domain services, and gateways. They are part of the application layer, not the domain layer.

## Implementation Guidelines

### Layered Architecture
- **Domain Layer**: Aggregates, value objects, domain services, domain events
- **Application Layer**: Use cases, application services, DTOs
- **Infrastructure Layer**: Repositories, gateways, NestJS modules
- Domain layer should have no dependencies on infrastructure

### NestJS Integration
- Use NestJS modules to organize infrastructure concerns
- Keep domain logic independent of NestJS decorators
- Application services can be NestJS providers
- Repositories inject persistence mechanisms via NestJS DI

## Implemented Application Services

### Cart Management Service (Lesson 1)
Orchestrates shopping cart operations.

**Responsibilities**:
- Coordinate cart CRUD operations
- Use `ShoppingCartRepository`
- Transform domain models to DTOs

**Code reference**: (to be implemented in application layer)

### PlaceOrderFromCartApplicationService (Lesson 2)
Converts cart to order.

**Workflow**:
1. Validates cart is not empty
2. Uses `OrderPricingService` to calculate final pricing
3. Creates `Order` aggregate in `AwaitingPayment` state
4. Marks cart as converted/checked out
5. Persists order via `OrderRepository`

**Code reference**: (to be implemented in application layer)

### ConfirmPaymentApplicationService (Lessons 3 & 4)
Handles payment confirmation.

**Lesson 3 (Synchronous)**:
- Calls synchronous `PaymentGateway`
- On approval, calls `order.markAsPaid(paymentId)`

**Lesson 4 (Event-Driven)**:
- Triggered by `PaymentApproved` event from Payment context
- No synchronous gateway needed
- Calls `order.markAsPaid(paymentId)`

**Code reference**: (to be implemented in application layer)

### CancelOrderApplicationService (Lessons 3 & 4)
Validates and executes cancellation.

**Workflow**:
1. Load order from repository
2. Check order state allows cancellation
3. Call `order.cancel(reason)`
4. Persist updated order
5. May trigger compensating actions

**Code reference**: (to be implemented in application layer)

### ApplyStockReservedApplicationService (Lesson 4)
Handles stock reservation from Inventory context.

**Workflow**:
1. Triggered by `StockReserved` event from Inventory context
2. Load order from repository
3. Call `order.applyStockReserved()`
4. Persist updated order

**Code reference**: (to be implemented in application layer)

## Related Documentation
- Domain services: `/docs/ddd-patterns/domain-services.md`
- Domain events consumed: `/docs/ddd-patterns/domain-events.md`
- Gateways used: `/docs/ddd-patterns/gateways.md`
