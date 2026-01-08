# Codebase Minimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce codebase from 154 files to ~48 files (69% reduction) for 4-hour DDD educational course

**Architecture:** Phased removal approach - remove stock reservation, simplify tests, consolidate exceptions, trim domain/application layers, update documentation

**Tech Stack:** NestJS 11, TypeScript 5.7, Jest, in-memory storage

---

## Phase 1: Remove Stock Reservation Infrastructure

### Task 1.1: Delete Stock Reservation Files

**Files:**
- Delete: `src/application/events/handlers/stock-reserved.handler.ts`
- Delete: `src/application/events/handlers/stock-reserved.handler.spec.ts`
- Delete: `src/infrastructure/order/event-handlers/stock-reserved.handler.ts`
- Delete: `src/infrastructure/events/consumers/stock-consumer.ts`
- Delete: `src/infrastructure/events/consumers/stock-consumer.spec.ts`
- Delete: `src/domain/shared/value-objects/reservation-id.ts`

**Step 1: Delete stock handler files**

```bash
rm src/application/events/handlers/stock-reserved.handler.ts
rm src/application/events/handlers/stock-reserved.handler.spec.ts
rm src/infrastructure/order/event-handlers/stock-reserved.handler.ts
rm src/infrastructure/events/consumers/stock-consumer.ts
rm src/infrastructure/events/consumers/stock-consumer.spec.ts
rm src/domain/shared/value-objects/reservation-id.ts
```

**Step 2: Verify files deleted**

Run: `git status`
Expected: 6 files deleted

**Step 3: Run tests to identify dependencies**

Run: `npm test`
Expected: Import errors for deleted files

**Step 4: Commit deletion**

```bash
git add -A
git commit -m "refactor: remove stock reservation files

Removes stock reservation implementation to reduce codebase complexity.
Will be replaced with TODO comments for student homework."
```

### Task 1.2: Remove Stock Reservation Imports and References

**Files:**
- Modify: `src/infrastructure/modules/events.module.ts`
- Modify: `src/infrastructure/modules/order.module.ts`
- Modify: `test/event-driven-flow.e2e-spec.ts`

**Step 1: Remove from events module**

Find and remove any imports/references to:
- `StockReservedHandler`
- `StockConsumer`

**Step 2: Remove from order module**

Find and remove any imports/references to stock handlers

**Step 3: Update e2e tests**

Remove stock reservation test cases from `test/event-driven-flow.e2e-spec.ts`

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove stock reservation module references"
```

### Task 1.3: Add TODO Comments for Stock Reservation

**Files:**
- Modify: `src/domain/order/value-objects/order-status.ts`
- Modify: `src/domain/order/order.ts`

**Step 1: Add TODO to OrderStatus**

In `src/domain/order/value-objects/order-status.ts`, update:

```typescript
export class OrderStatus {
  private constructor(private readonly value: string) {}

  static readonly AwaitingPayment = new OrderStatus('AWAITING_PAYMENT');
  static readonly Paid = new OrderStatus('PAID');

  // TODO: Student exercise - implement stock reservation flow
  // This status should be reached after payment is confirmed and inventory
  // system reserves products. Students should:
  // 1. Create StockReservedHandler in application layer
  // 2. Handle 'stock.reserved' events from inventory context
  // 3. Add order.applyStockReserved() method
  // 4. Update state machine to allow AwaitingPayment → Paid → StockReserved
  static readonly StockReserved = new OrderStatus('STOCK_RESERVED');

  static readonly Cancelled = new OrderStatus('CANCELLED');

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Step 2: Add TODO to Order aggregate**

In `src/domain/order/order.ts`, after `markAsPaid` method, add:

```typescript
// TODO: Student exercise - implement stock reservation
// applyStockReserved(reservationId: ReservationId): void {
//   // Validate current status is Paid
//   // Transition to StockReserved
//   // Store reservationId
//   // Add to domain events if needed
// }
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: add TODO comments for stock reservation homework"
```

### Task 1.4: Remove Idempotency Tracking from Order

**Files:**
- Modify: `src/domain/order/order.ts`

**Step 1: Remove idempotency fields**

Remove these lines from Order aggregate:
```typescript
private readonly _processedPaymentIds: Set<string> = new Set();
private readonly _processedReservationIds: Set<string> = new Set();
```

And remove any usage of these fields in methods

**Step 2: Run domain tests**

Run: `npm test src/domain/order/__tests__/order.spec.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/domain/order/order.ts
git commit -m "refactor: remove idempotency tracking from Order

Simplifies Order aggregate for educational purposes.
Idempotency should be handled at infrastructure level in production."
```

---

## Phase 2: Delete Test Infrastructure

### Task 2.1: Delete Test Builders, Factories, Fixtures

**Files:**
- Delete: `test/builders/*` (4 files)
- Delete: `test/factories/*` (4 files)
- Delete: `test/fixtures/*` (1 file)

**Step 1: Delete test infrastructure directories**

```bash
rm -rf test/builders
rm -rf test/factories
rm -rf test/fixtures
```

**Step 2: Verify deletion**

Run: `git status`
Expected: 9 files deleted (4 + 4 + 1)

**Step 3: Run tests to identify usage**

Run: `npm test`
Expected: Import errors in e2e tests

**Step 4: Commit deletion**

```bash
git add -A
git commit -m "refactor: remove test infrastructure (builders, factories, fixtures)

Simplifies test setup by using inline test data construction instead
of complex builder patterns. More readable for educational purposes."
```

### Task 2.2: Update E2E Tests to Use Inline Data

**Files:**
- Modify: `test/cart.e2e-spec.ts`
- Modify: `test/order.e2e-spec.ts`
- Modify: `test/event-driven-flow.e2e-spec.ts`

**Step 1: Update cart e2e test**

Replace builder imports with inline construction:

```typescript
// Remove: import { OrderBuilder } from './builders/order.builder';
// Remove: import { mockRepositories } from './factories/mock-repositories.factory';

// Replace builder usage with:
const createTestCart = (cartId: string, customerId: string) => ({
  id: cartId,
  customerId,
  items: [],
  conversionStatus: 'active' as const,
});
```

**Step 2: Update order e2e test**

Similar pattern - use inline test data construction

**Step 3: Update event-driven e2e test**

Similar pattern - use inline test data construction

**Step 4: Run e2e tests**

Run: `npm run test:e2e`
Expected: All tests pass

**Step 5: Commit**

```bash
git add test/*.e2e-spec.ts
git commit -m "refactor: convert e2e tests to use inline test data

Replaces builder pattern with simple inline construction for clarity."
```

---

## Phase 3: Consolidate Exception Classes

### Task 3.1: Create Generic Cart Exception

**Files:**
- Create: `src/domain/shopping-cart/exceptions/invalid-cart-operation.error.ts`
- Delete: `src/domain/shopping-cart/exceptions/cart-already-converted.error.ts`
- Delete: `src/domain/shopping-cart/exceptions/invalid-quantity.error.ts`
- Delete: `src/domain/shopping-cart/exceptions/max-products-exceeded.error.ts`
- Delete: `src/domain/shopping-cart/exceptions/product-not-in-cart.error.ts`
- Keep: `src/domain/shopping-cart/exceptions/empty-cart.error.ts`

**Step 1: Create generic exception**

Create `src/domain/shopping-cart/exceptions/invalid-cart-operation.error.ts`:

```typescript
export class InvalidCartOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCartOperationError';
  }
}
```

**Step 2: Update ShoppingCart to use generic exception**

In `src/domain/shopping-cart/shopping-cart.ts`, replace specific exceptions:

```typescript
// Replace MaxProductsExceededError with:
throw new InvalidCartOperationError('Cannot add more products to cart');

// Replace CartAlreadyConvertedError with:
throw new InvalidCartOperationError('Cart has already been converted to order');

// Replace ProductNotInCartError with:
throw new InvalidCartOperationError(`Product ${productId} not found in cart`);

// Replace InvalidQuantityError with:
throw new InvalidCartOperationError('Invalid quantity specified');
```

**Step 3: Update imports**

Remove old exception imports, add new one

**Step 4: Delete old exception files**

```bash
rm src/domain/shopping-cart/exceptions/cart-already-converted.error.ts
rm src/domain/shopping-cart/exceptions/invalid-quantity.error.ts
rm src/domain/shopping-cart/exceptions/max-products-exceeded.error.ts
rm src/domain/shopping-cart/exceptions/product-not-in-cart.error.ts
```

**Step 5: Run cart tests**

Run: `npm test src/domain/shopping-cart`
Expected: All tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: consolidate cart exceptions into generic error

Replaces 4 specific exception classes with single InvalidCartOperationError
for simpler error handling."
```

### Task 3.2: Consolidate Order Exceptions

**Files:**
- Keep: `src/domain/order/exceptions/invalid-order-state-transition.error.ts`
- Delete: `src/domain/order/exceptions/product-data-unavailable.error.ts`
- Delete: `src/domain/order/exceptions/product-pricing-failed.error.ts`

**Step 1: Delete specific gateway errors**

```bash
rm src/domain/order/exceptions/product-data-unavailable.error.ts
rm src/domain/order/exceptions/product-pricing-failed.error.ts
```

**Step 2: Update domain services**

In `src/domain/order/services/order-creation.service.ts` and `order-pricing.service.ts`:

Replace specific errors with generic Error:
```typescript
throw new Error('Failed to fetch product data from catalog');
throw new Error('Failed to calculate pricing');
```

**Step 3: Run order tests**

Run: `npm test src/domain/order`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove specific gateway error classes

Uses generic Error for gateway failures. Simplifies error hierarchy."
```

---

## Phase 4: Simplify Domain Layer

### Task 4.1: Remove MAX_PRODUCTS Constraint

**Files:**
- Modify: `src/domain/shopping-cart/shopping-cart.ts`

**Step 1: Remove MAX_PRODUCTS constant and validation**

Remove:
```typescript
private static readonly MAX_PRODUCTS = 20;

private ensureWithinProductLimit(): void {
  if (this.items.size >= ShoppingCart.MAX_PRODUCTS) {
    throw new InvalidCartOperationError('Cannot add more products to cart');
  }
}
```

**Step 2: Remove call to validation**

In `addItem` method, remove call to `this.ensureWithinProductLimit()`

**Step 3: Run cart tests**

Run: `npm test src/domain/shopping-cart/__tests__/shopping-cart.spec.ts`
Expected: All tests pass

**Step 4: Remove MAX_PRODUCTS test if exists**

**Step 5: Commit**

```bash
git add src/domain/shopping-cart/shopping-cart.ts
git commit -m "refactor: remove MAX_PRODUCTS constraint

Unnecessary business rule for educational purposes."
```

### Task 4.2: Consolidate Duplicate DTOs

**Files:**
- Delete: `src/application/order/dtos/cancel-order.dto.ts`
- Delete: `src/application/order/dtos/pay-order.dto.ts`
- Keep: `src/application/dtos/*.ts` (consolidated location)

**Step 1: Check if order/dtos are duplicates**

Compare `src/application/order/dtos/` with `src/application/dtos/`

**Step 2: Delete duplicate directory if confirmed**

```bash
rm -rf src/application/order/dtos
```

**Step 3: Update imports in services**

Update `src/application/order/services/confirm-payment.service.ts` to import from `src/application/dtos`

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: consolidate DTOs into single directory

Removes duplicate DTO directory for simpler organization."
```

### Task 4.3: Evaluate OrderMapper Necessity

**Files:**
- Evaluate: `src/application/mappers/order.mapper.ts`

**Step 1: Check if OrderMapper is used**

```bash
grep -r "OrderMapper" src/
```

**Step 2: If used only for simple mapping, inline it**

Move mapping logic directly into controllers or services

**Step 3: Delete mapper file**

```bash
rm src/application/mappers/order.mapper.ts
```

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: inline order mapping logic

Removes mapper abstraction for simpler direct mapping."
```

---

## Phase 5: Remove Unnecessary Tests

### Task 5.1: Remove Application Service Unit Tests

**Files:**
- Delete: `src/application/services/__tests__/cart.service.spec.ts`
- Delete: `src/application/services/__tests__/checkout.service.spec.ts`
- Delete: `src/application/services/__tests__/order.service.spec.ts`
- Delete: `src/application/order/services/__tests__/confirm-payment.service.spec.ts`
- Delete: `src/application/events/handlers/payment-approved.handler.spec.ts`

**Step 1: Delete application service tests (covered by e2e)**

```bash
rm -rf src/application/services/__tests__
rm -rf src/application/order/services/__tests__
rm src/application/events/handlers/payment-approved.handler.spec.ts
```

**Step 2: Verify e2e tests cover these scenarios**

Check: `test/cart.e2e-spec.ts`, `test/order.e2e-spec.ts`, `test/event-driven-flow.e2e-spec.ts`

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass (e2e coverage sufficient)

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove application service unit tests

E2E tests provide sufficient coverage. Reduces test maintenance."
```

### Task 5.2: Remove Infrastructure Tests

**Files:**
- Delete: `src/infrastructure/repositories/__tests__/in-memory-order.repository.spec.ts`
- Delete: `src/infrastructure/events/domain-event-publisher.spec.ts`
- Delete: `src/infrastructure/events/in-memory-message-bus.spec.ts`
- Delete: `src/infrastructure/events/consumers/payments-consumer.spec.ts`

**Step 1: Delete infrastructure unit tests**

```bash
rm src/infrastructure/repositories/__tests__/in-memory-order.repository.spec.ts
rm src/infrastructure/events/domain-event-publisher.spec.ts
rm src/infrastructure/events/in-memory-message-bus.spec.ts
rm src/infrastructure/events/consumers/payments-consumer.spec.ts
```

**Step 2: Run tests**

Run: `npm test`
Expected: All remaining tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove infrastructure unit tests

In-memory implementations are simple enough to not require dedicated tests."
```

### Task 5.3: Remove Value Object Tests (Except Key Examples)

**Files:**
- Keep: `src/domain/order/value-objects/__tests__/money.spec.ts`
- Keep: `src/domain/shared/value-objects/__tests__/quantity.spec.ts`
- Delete: Other value object tests

**Step 1: Delete non-essential value object tests**

```bash
rm src/domain/order/value-objects/__tests__/order-id.spec.ts
rm src/domain/order/value-objects/__tests__/order-status.spec.ts
rm src/domain/order/value-objects/__tests__/product-snapshot.spec.ts
rm src/domain/order/value-objects/__tests__/shipping-address.spec.ts
rm src/domain/shared/value-objects/__tests__/customer-id.spec.ts
rm src/domain/shared/value-objects/__tests__/product-id.spec.ts
rm src/domain/shopping-cart/value-objects/__tests__/cart-id.spec.ts
rm src/domain/shared/base/__tests__/string-id.base.spec.ts
rm src/domain/shared/base/__tests__/uuid-id.base.spec.ts
```

**Step 2: Run remaining tests**

Run: `npm test`
Expected: Money and Quantity tests still pass

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: keep only key value object tests (Money, Quantity)

These serve as examples for teaching value object testing patterns."
```

---

## Phase 6: Documentation and Final Cleanup

### Task 6.1: Create Comprehensive README

**Files:**
- Create: `README.md` (replace existing or create new)

**Step 1: Write comprehensive README**

```markdown
# DDD Tactical Patterns - E-commerce Order Management

Educational NestJS application demonstrating **Tactical DDD patterns** through a complete order management flow.

## Course Structure

This codebase supports a 4-hour DDD course with four lessons:

### Lesson 1: Creating a Cart (Shopping Cart Aggregate)
- **Concepts**: Aggregates, Value Objects, Entities
- **Live code**: Value object examples (Money, Quantity), Cart methods
- **Pre-implemented**: Repository interfaces, controllers, NestJS setup

### Lesson 2: Converting Cart to Order (Domain Services)
- **Concepts**: Domain Services, orchestration within bounded context
- **Live code**: OrderCreationService, checkout flow
- **Pre-implemented**: Order aggregate, value objects

### Lesson 3: Synchronous Payment (Gateway Pattern)
- **Concepts**: Cross-context integration, Gateway pattern, Anti-Corruption Layer
- **Live code**: PaymentGateway interface, markAsPaid(), state transitions
- **Pre-implemented**: Gateway stubs, OrderStatus states

### Lesson 4: Asynchronous Payment (Event-Driven Architecture)
- **Concepts**: Domain events, event dispatcher, message bus, eventual consistency
- **Live code**: Domain events, event handlers, message bus interface
- **Pre-implemented**: Message bus implementation, payment simulator

## Tech Stack

- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3 (target ES2023)
- **Testing**: Jest
- **Storage**: In-memory (educational - no database)
- **Architecture**: Layered DDD (Domain → Application → Infrastructure)

## Project Structure

```
src/
├── domain/              # Domain layer (business logic)
│   ├── shopping-cart/   # Shopping Cart aggregate
│   ├── order/          # Order aggregate + domain services
│   └── shared/         # Shared kernel (value objects, base classes)
├── application/        # Application layer (use cases)
│   ├── services/       # Application services
│   ├── dtos/          # Data transfer objects
│   ├── gateways/      # Gateway interfaces
│   └── events/        # Event handlers
└── infrastructure/     # Infrastructure layer (NestJS)
    ├── controllers/    # REST controllers
    ├── repositories/   # In-memory repositories
    ├── gateways/      # Gateway implementations (stubs)
    ├── events/        # Message bus implementation
    └── modules/       # NestJS modules
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Start development server
npm run start:dev

# Lint code
npm run lint

# Format code
npm run format
```

## API Endpoints

### Cart Operations
- `POST /cart` - Create cart
- `POST /cart/:cartId/items` - Add item to cart
- `PATCH /cart/:cartId/items/:productId` - Update quantity
- `POST /cart/:cartId/checkout` - Checkout (convert to order)

### Order Operations
- `GET /orders/:orderId` - Get order details
- `POST /orders/:orderId/pay` - Mark order as paid (sync)
- `POST /orders/:orderId/cancel` - Cancel order

## Key DDD Concepts Demonstrated

### Aggregates
- **ShoppingCart**: Manages cart lifecycle, enforces cart invariants
- **Order**: Manages order state machine, enforces order invariants

### Value Objects
- **Money**: Encapsulates currency and amount
- **Quantity**: Validates product quantities
- **ProductId, CartId, OrderId**: Typed identifiers

### Domain Services
- **OrderCreationService**: Orchestrates order creation from cart
- **OrderPricingService**: Calculates order pricing

### Domain Events
- **OrderPlaced**: Published when order created
- **OrderPaid**: Published when payment confirmed
- **OrderCancelled**: Published when order cancelled

### Gateways (Anti-Corruption Layer)
- **CatalogGateway**: Fetches product information
- **PricingGateway**: Calculates pricing
- **PaymentGateway**: Processes payments

### Repository Pattern
- **ShoppingCartRepository**: Persists shopping carts
- **OrderRepository**: Persists orders

## Student Exercises

### Homework: Stock Reservation Flow

Implement the stock reservation feature by completing TODOs in:

1. **Domain Layer** (`src/domain/order/order.ts`):
   - Implement `applyStockReserved()` method
   - Handle state transition: Paid → StockReserved

2. **Application Layer**:
   - Create `StockReservedHandler`
   - Subscribe to `stock.reserved` events

3. **Infrastructure Layer**:
   - Register event handler in module
   - Update message bus subscriptions

See TODO comments in code for guidance.

## Testing Approach

```bash
# Run all tests
npm test

# Run specific test suite
npm test src/domain/shopping-cart/__tests__/shopping-cart.spec.ts

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Domain tests**: Business rule validation (aggregates, value objects, domain services)
- **E2E tests**: Complete flows (cart → checkout → payment)

## Design Decisions

### Why In-Memory Storage?
Focus on DDD patterns, not infrastructure complexity. Production apps would use PostgreSQL, MongoDB, etc.

### Why Stubbed External Services?
Demonstrates Gateway pattern and ACL without external dependencies. Production would integrate real services.

### Why Simple Error Handling?
Educational clarity over production robustness. Production would have comprehensive error handling.

## Learning Resources

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **NestJS Documentation**: https://docs.nestjs.com

## License

MIT - Educational purposes
```

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: create comprehensive educational README

Replaces verbose documentation with single, focused README covering:
- Course structure and lesson breakdown
- Setup and installation
- Project structure
- API endpoints
- Key DDD concepts
- Student exercises
- Testing approach"
```

### Task 6.2: Delete Documentation Directory

**Files:**
- Delete: `docs/` (entire directory except plans)

**Step 1: Move plans to preserve**

```bash
mkdir -p .archive/docs-backup
cp -r docs/plans .archive/docs-backup/
```

**Step 2: Delete docs directory**

```bash
rm -rf docs/lessons
rm -rf docs/ddd-patterns
rm -rf docs/domain
rm -rf docs/reference
```

**Step 3: Keep only plans directory**

Ensure `docs/plans/` still exists with our design and implementation plans

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: remove verbose documentation

Removes 3,640+ lines of documentation in favor of focused README.
DDD concepts will be taught live during course."
```

### Task 6.3: Strip Verbose Inline Comments

**Files:**
- Modify: All domain aggregate files

**Step 1: Review and simplify comments in aggregates**

Replace verbose JSDoc with brief, essential comments:

**Before:**
```typescript
/**
 * Factory method to create a new Order in AwaitingPayment status
 *
 * @param id - Unique order identifier
 * @param cartId - Reference to source shopping cart
 * @param customerId - Customer who created the order
 * @param items - Collection of order items (min 1 required)
 * @param shippingAddress - Delivery address
 * @param orderLevelDiscount - Cart-wide discount applied
 * @param totalAmount - Total order amount after all discounts
 * @returns New Order instance in AwaitingPayment status
 * @throws Error if items array is empty
 */
```

**After:**
```typescript
// Creates new order in AwaitingPayment status
```

**Step 2: Focus on keeping only non-obvious explanations**

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass (no logic changes)

**Step 4: Commit**

```bash
git add src/domain
git commit -m "docs: simplify inline comments in domain layer

Removes verbose JSDoc in favor of brief, essential comments."
```

---

## Phase 7: Verification and Finalization

### Task 7.1: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run e2e tests**

```bash
npm run test:e2e
```

Expected: All 3 e2e test files pass (cart, order, event-driven)

**Step 3: Check test coverage**

```bash
npm run test:cov
```

Note coverage for reference

### Task 7.2: Count Final Files

**Step 1: Count source files**

```bash
find src -type f -name "*.ts" ! -name "*.spec.ts" | wc -l
```

Expected: ~35 files

**Step 2: Count test files**

```bash
find src test -type f -name "*.spec.ts" -o -name "*.e2e-spec.ts" | wc -l
```

Expected: ~12 files

**Step 3: Count documentation files**

```bash
find . -maxdepth 1 -name "*.md" | wc -l
```

Expected: 1 (README.md)

**Step 4: Total file count**

```bash
find src test -type f -name "*.ts" | wc -l
```

Expected: ~47-48 files

### Task 7.3: Verify All Lessons Still Work

**Step 1: Start application**

```bash
npm run start:dev
```

**Step 2: Test Lesson 1 (Cart)**

```bash
# Create cart
curl -X POST http://localhost:3000/cart -H "Content-Type: application/json" -d '{"customerId":"customer-1"}'

# Add item
curl -X POST http://localhost:3000/cart/{cartId}/items -H "Content-Type: application/json" -d '{"productId":"product-1","quantity":2}'
```

**Step 3: Test Lesson 2 (Checkout)**

```bash
# Checkout
curl -X POST http://localhost:3000/cart/{cartId}/checkout -H "Content-Type: application/json" -d '{"shippingAddress":{"street":"123 Main St","city":"City","state":"ST","zipCode":"12345","country":"US"}}'
```

**Step 4: Test Lesson 3 (Sync Payment)**

```bash
# Pay order
curl -X POST http://localhost:3000/orders/{orderId}/pay
```

**Step 5: Test Lesson 4 (Async Payment)**

Verify via e2e test: `npm run test:e2e -- event-driven-flow.e2e-spec.ts`

### Task 7.4: Final Commit and Summary

**Step 1: Create summary commit**

```bash
git add -A
git commit -m "chore: finalize codebase minimization

Summary of changes:
- Removed stock reservation (6 files) with TODO comments for homework
- Deleted test infrastructure (9 files): builders, factories, fixtures
- Consolidated exceptions (6 files): generic errors instead of specific
- Removed unnecessary constraints (MAX_PRODUCTS)
- Removed idempotency tracking from Order
- Deleted application/infrastructure unit tests (12+ files)
- Removed most value object tests (kept Money, Quantity as examples)
- Replaced 18 doc files with 1 comprehensive README
- Simplified inline comments

Results:
- Before: 154 files (105 src + 31 tests + 18 docs)
- After: ~48 files (35 src + 12 tests + 1 doc)
- Reduction: 69%

All 4 lesson flows verified working:
✓ Lesson 1: Cart creation and management
✓ Lesson 2: Checkout and order creation
✓ Lesson 3: Synchronous payment
✓ Lesson 4: Asynchronous payment (event-driven)

Test status: All tests passing"
```

**Step 2: Generate file count report**

Create final report showing before/after:

```bash
echo "=== Codebase Minimization Complete ===" > minimization-report.txt
echo "" >> minimization-report.txt
echo "Before:" >> minimization-report.txt
echo "- Source files: 105" >> minimization-report.txt
echo "- Test files: 31" >> minimization-report.txt
echo "- Documentation: 18 files (3,640 lines)" >> minimization-report.txt
echo "- Total: 154 files" >> minimization-report.txt
echo "" >> minimization-report.txt
echo "After:" >> minimization-report.txt
echo "- Source files: $(find src -type f -name "*.ts" ! -name "*.spec.ts" | wc -l | xargs)" >> minimization-report.txt
echo "- Test files: $(find src test -type f \( -name "*.spec.ts" -o -name "*.e2e-spec.ts" \) | wc -l | xargs)" >> minimization-report.txt
echo "- Documentation: 1 file (README.md)" >> minimization-report.txt
echo "- Total: $(find src test -type f -name "*.ts" | wc -l | xargs) files" >> minimization-report.txt
echo "" >> minimization-report.txt
echo "Reduction: 69%" >> minimization-report.txt

cat minimization-report.txt
```

**Step 3: Commit report**

```bash
git add minimization-report.txt
git commit -m "docs: add minimization completion report"
```

---

## Success Criteria Checklist

- [ ] Codebase reduced to ~48 files (69% reduction)
- [ ] All 4 lesson flows still functional and verified
- [ ] Both sync and async payment examples working
- [ ] Stock reservation removed with clear TODO guidance
- [ ] Tests pass and demonstrate key business rules
- [ ] README provides complete setup and overview
- [ ] Code remains idiomatic NestJS + DDD
- [ ] Application starts and responds to API calls
- [ ] E2E tests cover all main flows
- [ ] No broken imports or references
