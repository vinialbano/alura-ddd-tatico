# Educational Codebase Simplification - Design Document

**Date:** 2026-01-10
**Status:** Approved
**Type:** Educational Optimization

## Overview

Simplify the DDD tactical patterns codebase to create the ideal learning environment for a 4-hour educational course. Remove features, infrastructure complexity, and noise that don't directly support the four core lesson flows.

## Goals

### Primary Goal
Create a lean, focused codebase where students can:
- Read the entire domain layer in 30 minutes
- Understand complete flows in 1 hour
- Focus on DDD patterns, not navigate complexity
- Complete hands-on exercises in 4 hours

### Teaching Objectives (4 Lessons)
1. **Lesson 1:** Shopping cart aggregate creation
2. **Lesson 2:** Checkout and cart-to-order conversion
3. **Lesson 3:** Synchronous payment integration (Payments → Orders)
4. **Lesson 4:** Asynchronous payment integration (event-driven)

### Success Criteria
- ✅ 55-60 source files (from 79) - ~25% reduction
- ✅ 2 E2E test files aligned with lessons
- ✅ All 4 lesson flows functional
- ✅ Comments teach patterns, not describe obvious code
- ✅ Clean build, all tests passing

## Simplification Principles

1. **YAGNI Ruthlessly** - Remove anything not directly teaching DDD patterns
2. **Keep Domain Rich** - Maintain comprehensive value objects, aggregates, domain services
3. **Simplify Infrastructure** - Reduce NestJS boilerplate that doesn't teach DDD
4. **Focus on Patterns** - One good example > multiple similar examples

## Detailed Changes

### 1. Order Cancellation (Complete Removal)

**Rationale:** Cancellation doesn't teach new DDD patterns beyond what payment flow demonstrates. State transitions are adequately covered by AwaitingPayment → Paid.

**Files to Delete:**
```
src/contexts/orders/domain/order/events/order-cancelled.event.ts
src/contexts/orders/application/dtos/cancel-order.dto.ts
```

**Code to Remove:**
- `Order.cancel()` method and domain logic
- `Order._cancellationReason` field
- `OrderStatus.canBeCancelled()` validation
- `OrderController.cancel()` endpoint (POST /orders/:id/cancel)
- `OrderService.cancel()` method
- `OrdersConsumer.handleOrderCancelled()` in Payments BC
- `DomainEventPublisher.publishOrderCancelled()` mapping
- `OrderCancelledPayload` interface in integration-message.ts

**Tests to Remove:**
- All cancellation test cases in `test/order.e2e-spec.ts` (~5 tests)
- Cancellation propagation tests in `test/event-driven-flow.e2e-spec.ts` (~2 tests)
- Domain unit tests for cancellation logic

**Impact:** ~8-10 files/methods removed, ~200 lines of code

---

### 2. ProductSnapshot & CatalogGateway Removal

**Rationale:** Product metadata (name, description, SKU) isn't needed for DDD pattern teaching. Using productId + price from PricingGateway is sufficient.

**Files to Delete:**
```
src/contexts/orders/domain/order/value-objects/product-snapshot.ts
src/contexts/orders/domain/order/__tests__/product-snapshot.spec.ts (if exists)
src/contexts/orders/application/gateways/catalog.gateway.interface.ts
src/contexts/orders/infrastructure/gateways/stub-catalog.gateway.ts
```

**Simplifications:**

**OrderItem changes:**
```typescript
// BEFORE
class OrderItem {
  productSnapshot: ProductSnapshot,  // name, description, sku
  quantity: Quantity,
  unitPrice: Money,
  itemDiscount: Money
}

// AFTER
class OrderItem {
  productId: ProductId,  // Just the ID
  quantity: Quantity,
  unitPrice: Money,
  itemDiscount: Money
}
```

**CheckoutService changes:**
- Remove `CatalogGateway` injection
- Remove `catalogGateway.getProductInfo()` calls
- Simplify `OrderCreationService` - no product snapshot mapping

**OrderPlacedPayload changes:**
```typescript
// BEFORE
items: Array<{
  productId: string;
  productName: string;    // From catalog
  quantity: number;
  unitPrice: number;
}>;

// AFTER
items: Array<{
  productId: string;
  quantity: number;
  unitPrice: number;
}>;
```

**Impact:** ~120 lines removed, one gateway pattern example (PricingGateway) remains

---

### 3. Cart Operations Simplification

**Rationale:** UPDATE and DELETE don't teach new DDD concepts beyond what ADD demonstrates.

**Files to Delete:**
```
src/contexts/orders/application/dtos/update-quantity.dto.ts
```

**Code to Remove:**
- `ShoppingCart.updateItemQuantity()` method
- `ShoppingCart.removeItem()` method
- `CartService.updateItemQuantity()` method
- `CartService.removeItem()` method
- `CartController.updateItemQuantity()` endpoint (PUT /carts/:id/items/:productId)
- `CartController.removeItem()` endpoint (DELETE /carts/:id/items/:productId)

**Remaining Cart API:**
```
POST   /carts                    - Create cart
POST   /carts/:id/items          - Add item (consolidates if exists)
GET    /carts/:id                - Get cart
POST   /orders/checkout          - Convert to order
```

**Impact:** ~80 lines removed, 4 essential cart operations remain

---

### 4. Module Consolidation

#### 4.1 Merge CartModule + OrderModule → OrdersModule

**Rationale:** Same bounded context - no need for separate modules in educational code.

**Changes:**
- Delete `src/contexts/orders/cart.module.ts`
- Delete `src/contexts/orders/cart.tokens.ts`
- Rename `order.module.ts` → `orders.module.ts`
- Merge tokens into single file
- Update `AppModule` imports

**New OrdersModule structure:**
```typescript
@Module({
  controllers: [CartController, OrderController],
  providers: [
    // Application Services
    CartService,
    CheckoutService,
    OrderService,

    // Repositories
    { provide: SHOPPING_CART_REPOSITORY, useClass: InMemoryShoppingCartRepository },
    { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },

    // Gateways
    { provide: PRICING_GATEWAY, useClass: StubPricingGateway },

    // Domain Services
    OrderCreationService,
    OrderPricingService,

    // Event Handlers
    PaymentApprovedHandler,
    PaymentsConsumer,
  ],
  exports: [PaymentApprovedHandler, PaymentsConsumer],
})
export class OrdersModule {}
```

#### 4.2 Remove SharedKernelModule

**Rationale:** Completely empty module (no providers, no exports) - just documentation.

**Delete:**
```
src/contexts/shared-kernel/  (entire directory)
```

**Impact:** 3 modules → 1 module, clearer bounded context structure

---

### 5. DTO Flattening

**Rationale:** Keep boundary separation but reduce mapping complexity for students.

**Current (Complex):**
```typescript
OrderResponseDTO {
  id: string;
  items: Array<{
    productSnapshot: { name, description, sku };
    quantity: number;
    unitPrice: { amount: number; currency: string };
    itemDiscount: { amount: number; currency: string };
  }>;
  shippingAddress: {
    street, city, stateOrProvince, postalCode, country
  };
  totalAmount: { amount: number; currency: string };
  orderLevelDiscount: { amount: number; currency: string };
}
```

**Simplified (Flat):**
```typescript
OrderResponseDTO {
  orderId: string;
  cartId: string;
  customerId: string;
  status: string;

  // Flat items
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    itemDiscount: number;
  }>;

  // Single currency for all amounts
  currency: string;
  totalAmount: number;
  orderLevelDiscount: number;

  // Flat shipping address
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;

  paymentId?: string;
  createdAt: string;
}
```

**Apply to:**
- `OrderResponseDTO`
- `CartResponseDto`
- `CheckoutDTO`
- All response DTOs

**Impact:** ~30% reduction in DTO mapping code, simpler for students

---

### 6. Exception Simplification

**Strategy:** Domain exceptions for business rules, NestJS built-ins for application concerns

**Keep (Domain Exceptions):**
- `EmptyCartError` - Business rule: can't checkout empty cart
- `InvalidCartOperationError` - Business rule: can't modify converted cart
- `InvalidOrderStateTransitionError` - Business rule: state machine violations

**Remove (Application Exceptions):**
- `CartNotFoundException` → use `NotFoundException('Cart not found')`
- `OrderNotFoundException` → use `NotFoundException('Order not found')`

**Simplified DomainExceptionFilter:**
```typescript
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    // Domain exceptions → HTTP status codes
    if (exception instanceof EmptyCartError) {
      return response.status(400).json({ message: exception.message });
    }
    if (exception instanceof InvalidCartOperationError) {
      return response.status(409).json({ message: exception.message });
    }
    if (exception instanceof InvalidOrderStateTransitionError) {
      return response.status(409).json({ message: exception.message });
    }

    // NestJS HTTP exceptions pass through
    if (exception instanceof HttpException) {
      throw exception;
    }

    // Unknown errors
    return response.status(500).json({ message: 'Internal server error' });
  }
}
```

**Impact:** Delete 2-3 exception files, simpler error handling strategy

---

### 7. Remove Unused Integration Events

**Rationale:** `order.paid` is published but nobody subscribes - dead code.

**Remove:**
- `OrderPaidPayload` interface from integration-message.ts
- `DomainEventPublisher.publishOrderPaid()` method
- All `order.paid` topic references

**Keep (Used Events):**
- `order.placed` - Orders BC → Payments BC
- `payment.approved` - Payments BC → Orders BC

**Impact:** Clearer event flow, less confusion about which events matter

---

### 8. E2E Test Consolidation

**Current Structure:**
- `test/cart.e2e-spec.ts` - Cart operations
- `test/order.e2e-spec.ts` - Checkout, payment, cancellation
- `test/event-driven-flow.e2e-spec.ts` - Async flows, cancellation events

**New Structure:**

**`test/cart-checkout.e2e-spec.ts` (Lessons 1-2):**
```typescript
describe('Cart & Checkout E2E', () => {
  describe('Cart Operations (Lesson 1)', () => {
    it('should create cart')
    it('should add items to cart')
    it('should get cart details')
    it('should reject invalid operations')
  });

  describe('Checkout Flow (Lesson 2)', () => {
    it('should checkout cart successfully')
    it('should reject empty cart checkout')
    it('should reject non-existent cart')
    it('should handle duplicate checkout (idempotency)')
  });
});
```

**`test/payment-flows.e2e-spec.ts` (Lessons 3-4):**
```typescript
describe('Payment Integration E2E', () => {
  describe('Synchronous Payment (Lesson 3)', () => {
    it('should process payment via POST /payments')
    it('should validate payment (deterministic order IDs)')
    it('should reject already paid order')
    it('should reject non-existent order')
    it('should handle gateway latency gracefully')
  });

  describe('Asynchronous Payment (Lesson 4)', () => {
    it('should complete event-driven flow: order.placed → payment.approved')
    it('should complete within 5 seconds (performance requirement)')
    it('should reject invalid state transitions')
  });
});
```

**Remove:**
- All cancellation test cases (~7 tests)
- Cart UPDATE/DELETE endpoint tests
- Redundant validation tests

**Impact:** ~250 lines removed, clear alignment with 4 lessons

---

### 9. Comment Simplification

**Remove:**
1. **Obvious descriptions:**
   ```typescript
   // BAD: Creates a new shopping cart
   static create(cartId: CartId, customerId: CustomerId): ShoppingCart

   // GOOD: Remove comment - method name is clear
   static create(cartId: CartId, customerId: CustomerId): ShoppingCart
   ```

2. **JSDoc duplicating TypeScript:**
   ```typescript
   // BAD
   /**
    * @param cartId - Cart identifier
    * @param customerId - Customer identifier
    * @returns ShoppingCart instance
    */
   static create(cartId: CartId, customerId: CustomerId): ShoppingCart

   // GOOD: Types are self-documenting, remove JSDoc
   ```

3. **Implementation details:**
   ```typescript
   // BAD: Uses Map internally for O(1) lookup
   // GOOD: Remove - not relevant for students
   ```

**Keep:**
1. **Business rules & invariants:**
   ```typescript
   // GOOD: Teaches invariant concept
   // Invariant: Cart must have at least 1 item to be converted
   markAsConverted(): void
   ```

2. **DDD pattern explanations:**
   ```typescript
   // GOOD: Explains Anti-Corruption Layer pattern
   // ACL: Translates external pricing model to domain Money
   async getProductPrice(productId: string): Promise<Money>
   ```

3. **State machine transitions:**
   ```typescript
   // GOOD: Documents valid transition
   // State transition: AwaitingPayment → Paid
   markAsPaid(paymentId: string): void
   ```

4. **Why, not what:**
   ```typescript
   // GOOD: Explains rationale
   // Consolidates quantity rather than creating duplicate items
   if (existingItem) {
     existingItem.addQuantity(quantity);
   }
   ```

5. **Integration points:**
   ```typescript
   // GOOD: Shows bounded context communication
   // Publishes to message bus for Payments BC consumption
   await this.messageBus.publish('order.placed', payload);
   ```

**Target:** 40-50% comment reduction

---

## Final File Structure

```
src/
├── contexts/
│   ├── orders/                           # Orders Bounded Context
│   │   ├── domain/
│   │   │   ├── shopping-cart/           # Cart aggregate, CartItem
│   │   │   │   ├── shopping-cart.ts
│   │   │   │   ├── cart-item.ts
│   │   │   │   ├── cart-id.ts
│   │   │   │   ├── exceptions/
│   │   │   │   └── __tests__/
│   │   │   ├── order/                   # Order aggregate, OrderItem
│   │   │   │   ├── order.ts
│   │   │   │   ├── order-item.ts
│   │   │   │   ├── events/             # OrderPlaced, OrderPaid (2 events)
│   │   │   │   ├── services/           # OrderCreationService, OrderPricingService
│   │   │   │   ├── value-objects/      # OrderStatus, ShippingAddress
│   │   │   │   ├── exceptions/
│   │   │   │   └── __tests__/
│   │   │   └── shared/
│   │   │       ├── domain-event.ts
│   │   │       └── value-objects/      # CustomerId, ProductId, Quantity, EventId
│   │   ├── application/
│   │   │   ├── services/               # CartService, CheckoutService, OrderService
│   │   │   ├── dtos/                   # Flattened DTOs (5 files)
│   │   │   ├── exceptions/             # Domain exceptions only (3 files)
│   │   │   ├── gateways/               # PricingGateway interface
│   │   │   └── events/
│   │   │       └── handlers/           # PaymentApprovedHandler
│   │   ├── infrastructure/
│   │   │   ├── controllers/            # CartController, OrderController
│   │   │   ├── repositories/           # InMemory implementations
│   │   │   ├── gateways/               # StubPricingGateway (1 file)
│   │   │   ├── events/
│   │   │   │   └── consumers/          # PaymentsConsumer
│   │   │   └── filters/                # DomainExceptionFilter
│   │   ├── orders.module.ts            # Single module (merged Cart + Order)
│   │   └── orders.tokens.ts            # DI tokens
│   └── payments/                        # Payments Bounded Context
│       ├── application/
│       │   ├── process-payment.service.ts
│       │   ├── process-payment.dto.ts
│       │   └── order-gateway.interface.ts
│       ├── infrastructure/
│       │   ├── payment.controller.ts
│       │   ├── in-process-order.gateway.ts
│       │   └── orders-consumer.ts
│       └── payment.module.ts
├── shared/                              # Shared infrastructure
│   ├── value-objects/                  # Money, OrderId, PaymentId, base classes
│   ├── events/                         # IntegrationMessage, DomainEventPublisher
│   ├── message-bus/                    # IMessageBus, InMemoryMessageBus
│   └── shared.module.ts
├── app.module.ts
└── main.ts

test/
├── cart-checkout.e2e-spec.ts           # Lessons 1-2 tests
├── payment-flows.e2e-spec.ts           # Lessons 3-4 tests
└── jest-e2e.json
```

**File Count:**
- **Before:** ~79 TypeScript files in src/
- **After:** ~55-60 TypeScript files
- **Reduction:** 25-30%

---

## Implementation Phases

### Phase 1: Remove Cancellation Feature
**Duration:** 1-2 hours

1. Delete files:
   - `order-cancelled.event.ts`
   - `cancel-order.dto.ts`
2. Remove code:
   - `Order.cancel()` method
   - `Order._cancellationReason` field
   - Controller endpoint
   - Service method
   - Consumer handler
   - Event publisher mapping
   - Integration payload type
3. Remove tests:
   - Cancellation test cases in E2E specs
   - Domain unit tests
4. Run tests: `npm test && npm run test:e2e`
5. Commit: "refactor: remove order cancellation feature"

### Phase 2: Remove ProductSnapshot & CatalogGateway
**Duration:** 2-3 hours

1. Delete files:
   - `product-snapshot.ts` + tests
   - `catalog.gateway.interface.ts`
   - `stub-catalog.gateway.ts`
2. Simplify domain:
   - Update `OrderItem` to use `productId: ProductId`
   - Update `OrderItem` tests
3. Simplify application:
   - Remove catalog from `CheckoutService`
   - Simplify `OrderCreationService`
   - Update `OrderPlacedPayload`
4. Update tests:
   - Domain tests
   - E2E assertions
5. Run tests: `npm test && npm run test:e2e`
6. Commit: "refactor: remove ProductSnapshot and CatalogGateway"

### Phase 3: Simplify Cart Operations
**Duration:** 1 hour

1. Delete `update-quantity.dto.ts`
2. Remove methods from:
   - `ShoppingCart` aggregate
   - `CartService`
   - `CartController`
3. Remove test cases
4. Run tests: `npm test && npm run test:e2e`
5. Commit: "refactor: remove cart UPDATE/DELETE operations"

### Phase 4: Module & Exception Consolidation
**Duration:** 2 hours

1. Merge modules:
   - Merge CartModule + OrderModule → OrdersModule
   - Update imports in AppModule
   - Delete CartModule files
2. Remove SharedKernelModule directory
3. Simplify exceptions:
   - Delete application exception files
   - Update services to use NestJS exceptions
   - Simplify DomainExceptionFilter
4. Run tests: `npm test && npm run test:e2e`
5. Commit: "refactor: consolidate modules and simplify exceptions"

### Phase 5: Flatten DTOs
**Duration:** 2-3 hours

1. Simplify DTO structures:
   - `OrderResponseDTO`
   - `CartResponseDto`
   - `CheckoutDTO`
2. Update service mapping logic
3. Update E2E test assertions
4. Run tests: `npm test && npm run test:e2e`
5. Commit: "refactor: flatten DTO structures"

### Phase 6: Remove Unused Events & Consolidate Tests
**Duration:** 2 hours

1. Remove `order.paid` event:
   - Delete `OrderPaidPayload`
   - Remove publisher method
2. Consolidate E2E tests:
   - Create `cart-checkout.e2e-spec.ts`
   - Create `payment-flows.e2e-spec.ts`
   - Delete old test files
   - Remove cancelled/UPDATE/DELETE test cases
3. Run tests: `npm run test:e2e`
4. Commit: "refactor: remove unused events and consolidate tests"

### Phase 7: Comment Cleanup
**Duration:** 2-3 hours

1. Review all domain files
2. Remove obvious/redundant comments
3. Keep pedagogical comments
4. Add pattern explanations where needed
5. Review with instructor
6. Commit: "docs: clean up comments to focus on teaching"

---

## Testing Strategy

### After Each Phase:
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run lint          # Linting
npm run build         # Build check
```

### Final Validation:
```bash
npm run test          # All unit tests pass
npm run test:e2e      # All E2E tests pass
npm run lint          # No linting errors
npm run build         # Clean build
npm run start:dev     # Application starts successfully
```

### Manual Testing Checklist:
- [ ] Create cart, add items
- [ ] Checkout cart → order created
- [ ] Sync payment (ENABLE_AUTOMATIC_PAYMENT=false): POST /payments
- [ ] Async payment (ENABLE_AUTOMATIC_PAYMENT=true): auto payment after checkout
- [ ] Verify event-driven flow completes within 5 seconds
- [ ] Verify all domain exceptions mapped to correct HTTP codes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing tests | Run tests after each phase, fix immediately |
| Import path errors after refactoring | Use IDE refactoring tools, TypeScript compiler catches errors |
| Missing edge cases | Comprehensive E2E tests cover all 4 lesson flows |
| Students confused by changes | Update README with new structure, add inline comments explaining patterns |
| Regression in lesson flows | Manual testing checklist ensures all 4 flows work |

---

## Success Metrics

### Quantitative:
- ✅ 55-60 source files (25-30% reduction)
- ✅ 2 E2E test files (aligned with lessons)
- ✅ 40-50% comment reduction
- ✅ Zero test failures
- ✅ Clean build

### Qualitative:
- ✅ Students can read domain layer in 30 minutes
- ✅ Clear focus on 4 lesson flows
- ✅ No distracting unused features
- ✅ Comments teach DDD patterns
- ✅ Simplified DTO mapping
- ✅ Single module per bounded context

---

## Next Steps

1. **Review & Approval:** Get instructor sign-off on design
2. **Implementation:** Execute phases 1-7 sequentially
3. **Testing:** Comprehensive testing after each phase
4. **Documentation:** Update README with simplified structure
5. **Course Material:** Update lesson plans to reflect changes

---

## Notes

- All value objects remain (instructor choice - teach pattern comprehensively)
- ID inheritance hierarchy stays (good OOP + DDD example)
- All domain unit tests kept (demonstrate testing patterns)
- PricingGateway remains as single Gateway/ACL example
- Both domain services kept (different concerns: orchestration vs calculation)
- Event-driven and synchronous flows both preserved

---

**Approved by:** [Instructor Name]
**Implementation Start:** [Date]
**Target Completion:** [Date]
