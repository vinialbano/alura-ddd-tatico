# Codebase Minimization Design

**Date:** 2026-01-07
**Goal:** Create the leanest possible codebase for a 4-hour DDD educational course

## Course Structure

Four lessons focusing on tactical DDD patterns:

1. **Lesson 1: Creating a Cart** (Shopping Cart aggregate)
2. **Lesson 2: Converting Cart to Order** (Domain services, same bounded context)
3. **Lesson 3: Synchronous Payment** (Gateway pattern, cross-context integration, ACL)
4. **Lesson 4: Asynchronous Payment** (Event-driven architecture)

## Teaching Approach

**Lesson 1:**
- Code live: First value object examples, first Cart aggregate methods (DDD theory)
- Pre-implemented: NestJS setup, repository interface, controller, extra value objects/methods
- Skip: Edge case validations, unnecessary features

**Lesson 2:**
- Code live: OrderCreationService, domain service orchestration, checkout flow
- Pre-implemented: Order aggregate, value objects
- Skip: Complex pricing rules, extensive catalog validation

**Lesson 3:**
- Code live: PaymentGateway interface, anti-corruption layer, markAsPaid() method, state transitions
- Pre-implemented: Gateway stub, OrderStatus states, application service boilerplate
- Focus: Bounded context isolation and communication

**Lesson 4:**
- Code live: Domain events, event dispatcher, message bus interface, event handlers
- Pre-implemented: Message bus implementation, simulated external contexts, handler registration
- Skip: Idempotency tracking, event replay, complex orchestration

## Stock Reservation Strategy

**Approach:** Remove implementation, leave strategic TODO comments for student homework

- Keep `StockReserved` status definition with comment
- Add TODO comments at integration points
- Delete all handler and consumer implementations

## Current State Analysis

- **105 source files** (34 in domain layer)
- **31 test files** (27 unit + 4 e2e)
- **12 test infrastructure files** (builders, factories, fixtures + tests)
- **18 documentation files** (3,640 lines)
- **6 stock reservation files** (full implementation)

## Target State

- **~35 source files** (12-15 domain + 8-10 application + 12-15 infrastructure)
- **~12 test files** (8-10 unit + 3 e2e)
- **1 documentation file** (README only)
- **~48 total files** (69% reduction)

## Detailed Minimization Plan

### Domain Layer Simplification

**Shopping Cart (Keep):**
- Core aggregate with 3-4 essential methods (create, addItem, updateQuantity, markAsConverted)
- Essential value objects: `CartId`, `ProductId`, `Quantity`
- `CartItem` entity
- Critical exceptions: `EmptyCartError`, generic `InvalidCartOperationError`

**Shopping Cart (Remove):**
- Individual exception classes: `MaxProductsExceededError`, `CartAlreadyConvertedError`, `ProductNotInCartError`
- MAX_PRODUCTS constraint (unnecessary for education)
- Complex quantity consolidation logic

**Order Aggregate (Keep):**
- Core aggregate with state machine methods (create, markAsPaid, cancel)
- Essential value objects: `OrderId`, `OrderStatus`, `Money`, `ShippingAddress`
- `OrderItem` entity
- Domain events: `OrderPlaced`, `OrderPaid`, `OrderCancelled`
- State transition error

**Order Aggregate (Remove):**
- `StockReserved` implementation (leave status + TODO)
- `ReservationId` value object
- Complex `ProductSnapshot` (simplify or inline)
- Idempotency tracking (`_processedPaymentIds`, `_processedReservationIds`)
- Specific gateway errors: `ProductDataUnavailableError`, `ProductPricingFailedError`

**Shared Kernel (Keep):**
- `CustomerId`, `EventId`, `PaymentId`
- Base ID classes
- `DomainEvent`

**Shared Kernel (Remove):**
- `ReservationId`
- Overly abstract base classes not used for teaching

### Application Layer Simplification

**Keep:**
- `CartService` (basic CRUD for Lesson 1)
- `CheckoutService` (domain service orchestration for Lesson 2)
- `OrderService` with `markAsPaid()` and `cancel()` (Lesson 3)
- `ConfirmPaymentService` (Lesson 4 async payment)
- Gateway interfaces: `CatalogGateway`, `PricingGateway`, `PaymentGateway`
- `MessageBus` interface (Lesson 4)
- Payment event handler (Lesson 4)
- Essential DTOs (1 per endpoint)
- Simple exceptions: `CartNotFound`, `OrderNotFound`

**Remove:**
- Stock reservation files (6 files: handlers, consumers, specs)
- Duplicate DTO directories (consolidate)
- Complex DTO validation (minimal class-validator decorators)
- `OrderMapper` if not teaching mapping explicitly

### Infrastructure Layer Simplification

**Keep:**
- In-memory repositories (2 files)
- Simple gateway stubs (hardcoded data)
- Basic NestJS modules (AppModule + 2-3 feature modules)
- REST controllers (CartController, OrderController)
- In-memory message bus (Lesson 4)
- Payment context simulator (Lesson 4)

**Remove:**
- Stock context simulator
- Complex module organization (flatten)
- Excessive event handler registration boilerplate

### Testing Strategy

**Unit Tests (Keep):**
- Domain aggregate tests showcasing business rules (ShoppingCart + Order core methods)
- Value object tests for key examples (Money, Quantity)
- Domain service tests (OrderCreationService, OrderPricingService)
- ~8-10 total unit test files

**Unit Tests (Remove):**
- All test infrastructure: builders, factories, fixtures (12 files)
- Tests for test infrastructure
- Infrastructure unit tests (repository tests, gateway stub tests)
- Application service unit tests (covered by e2e)
- Exception class tests

**E2E Tests (Keep):**
- Cart flow: create → add items → checkout (Lessons 1-2)
- Synchronous payment flow: order → pay → verify (Lesson 3)
- Asynchronous payment flow: order → event → paid (Lesson 4)
- ~3 e2e test files total

**E2E Tests (Remove):**
- Stock reservation e2e tests
- Edge case scenarios not teaching core concepts
- Complex test fixtures

**Test Data Approach:**
Use simple inline objects instead of builders:
```typescript
const cart = ShoppingCart.create(
  new CartId('cart-1'),
  new CustomerId('customer-1')
);
```

### Documentation Strategy

**Keep:**
- README.md only (setup, running, course structure overview)

**Remove:**
- All 18 doc files in `/docs` directory (3,640 lines)
- Lesson guides (verbose explanations taught live)
- DDD pattern documentation (8 files)
- Domain specifications
- Architecture documentation
- Test infrastructure design docs
- Verbose inline code comments (keep brief ones only)

**Rationale:** The instructor teaches DDD concepts live. Documentation is redundant and adds maintenance burden.

## Implementation Phases

### Phase 1: Remove Stock Reservation (with TODO comments)

**Delete files:**
- `src/application/events/handlers/stock-reserved.handler.ts` + spec
- `src/infrastructure/order/event-handlers/stock-reserved.handler.ts`
- `src/infrastructure/events/consumers/stock-consumer.ts` + spec
- `src/domain/shared/value-objects/reservation-id.ts`

**Update with TODO comments:**
- `OrderStatus`: Keep `StockReserved` with `// TODO: Student exercise - implement stock reservation flow`
- Order aggregate: `// TODO: Implement applyStockReserved() method`
- Message bus setup: `// TODO: Subscribe to 'stock.reserved' event`
- Application layer: `// TODO: Create StockReservedHandler`

### Phase 2: Simplify Test Infrastructure

**Delete:**
- `test/builders/*` (4 files)
- `test/factories/*` (4 files)
- `test/fixtures/*` (1 file)

**Update:**
- Refactor remaining tests to use inline data construction
- Simple, explicit test data instead of builder pattern

### Phase 3: Consolidate Exceptions

**Replace multiple exceptions with generic ones:**
- Cart exceptions → `InvalidCartOperationError`
- Order exceptions → `InvalidOrderStateError`

**Keep essential:**
- `CartNotFound`
- `OrderNotFound`
- `EmptyCartError`

### Phase 4: Simplify Domain Layer

**Remove:**
- MAX_PRODUCTS limit from ShoppingCart
- Idempotency tracking from Order aggregate
- Complex ProductSnapshot (simplify or inline)

**Consolidate:**
- Duplicate DTOs between `/application/dtos` and `/application/order/dtos`

### Phase 5: Trim Tests

**Keep:**
- Core domain tests (business rule examples for teaching)
- 3 e2e flows (cart, sync payment, async payment)

**Remove:**
- Infrastructure/service unit tests
- Edge case tests not demonstrating core concepts
- Over-engineered test setup

### Phase 6: Documentation Cleanup

**Delete:**
- Entire `/docs` directory

**Create:**
- Comprehensive README with:
  - Project setup instructions
  - Running the application
  - Course structure overview
  - Key DDD concepts reference
  - Commands (test, lint, format, run)

**Update code:**
- Strip verbose inline comments
- Keep brief, clarifying comments only

## Expected Benefits

**Time Savings:**
- Students can read entire domain layer in 30 minutes
- Understand full flow in 1 hour
- Focus on DDD concepts, not navigating complexity

**Teaching Efficiency:**
- Clearer focus on patterns being taught
- Less "magic" happening in hidden code
- Easier to modify during live coding
- Students can realistically build it in 4 hours

**Maintenance:**
- 69% fewer files to maintain
- Single README instead of 18 docs
- Simpler test setup
- Less cognitive overhead

## Success Criteria

1. Codebase reduced to ~48 files
2. All 4 lesson flows still functional
3. Both sync and async payment examples working
4. Stock reservation removed with clear TODO guidance
5. Tests pass and demonstrate key business rules
6. README provides complete setup and overview
7. Code remains idiomatic NestJS + DDD
8. Students can understand and extend the codebase in 4-hour session
