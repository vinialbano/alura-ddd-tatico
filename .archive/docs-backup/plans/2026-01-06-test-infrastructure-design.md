# Test Infrastructure & Code Optimization Design

**Date:** 2026-01-06
**Status:** Approved
**Goal:** Improve developer velocity by reducing test setup complexity and code duplication

## Problem Statement

Current test infrastructure has two major pain points:

1. **Complex aggregate creation:** Creating Orders and related objects requires 10-20 lines of boilerplate per test (ProductSnapshots, OrderItems, Money objects, ShippingAddresses)
2. **Repetitive mock setup:** Every test file duplicates the same `jest.Mocked<T>` setup with `as any` casting

These pain points slow down test authoring and maintenance across ~1,800 lines of test code.

## Design Goals

**Primary goal:** Developer velocity - make tests faster to write and easier to maintain

**Priority breakdown:**
- **P1:** Test builders + mock factories (immediate velocity impact)
- **P2:** ID base classes (reduce duplication, moderate velocity impact)
- **P3:** Centralized mappers, type safety improvements, exception base class (nice to have)

## Solution Architecture

### File Structure

```
test/
├── builders/
│   ├── order.builder.ts
│   ├── order-item.builder.ts
│   └── shopping-cart.builder.ts
├── factories/
│   ├── mock-repositories.factory.ts
│   └── mock-services.factory.ts
└── fixtures/
    └── common-values.ts
```

**Key decisions:**
- Separate `builders/` (domain objects) and `factories/` (mocks) for clear separation
- No barrel files (`index.ts`) - direct imports only
- Fixtures hold common test constants (addresses, IDs) to reduce duplication further

**Import examples:**
```typescript
import { OrderBuilder } from '@test/builders/order.builder';
import { createMockOrderRepository } from '@test/factories/mock-repositories.factory';
import { TEST_ADDRESS } from '@test/fixtures/common-values';
```

### Test Builders Design

**Philosophy:** Test-only builders with happy path defaults and basic customization. Cover 80% of use cases, can extend later.

**OrderBuilder API:**

```typescript
// Happy path - valid order with sensible defaults
const order = OrderBuilder.create();
// Returns: Order with 2 items, USD currency, standard shipping, PENDING status

// Basic customization via fluent API
const order = OrderBuilder.create()
  .withStatus(OrderStatus.PAID)
  .withCustomerId(CustomerId.fromString('cust-456'))
  .build();

// Custom items when needed
const order = OrderBuilder.create()
  .withItems([
    OrderItemBuilder.create().withUnitPrice(Money.of(99.99, 'USD')),
    OrderItemBuilder.create().withQuantity(5),
  ])
  .build();
```

**Default values:**
- 2 order items (Coffee product, Tea product)
- USD currency
- Standard US shipping address (from `TEST_ADDRESS` fixture)
- PENDING status
- Auto-generated IDs

**Customization methods:**
- `.withStatus(OrderStatus)` - Test different order states
- `.withCustomerId(CustomerId)` - Test specific customers
- `.withItems(OrderItem[])` - Replace all items
- `.withShippingAddress(ShippingAddress)` - Custom address
- `.build()` - Explicit build step

**No validation:** Builders are test-only, so you CAN create invalid states for testing edge cases if needed.

**OrderItemBuilder API:**

```typescript
const item = OrderItemBuilder.create()
  .withQuantity(3)
  .withUnitPrice(Money.of(25.50, 'USD'))
  .build();
```

**ShoppingCartBuilder API:**

```typescript
const cart = ShoppingCartBuilder.create()
  .withCustomerId(testCustomerId)
  .withItems([/* cart items */])
  .build();
```

### Mock Factories Design

**Problem solved:** Eliminate repetitive mock setup with `as any` casting.

**Repository mock factory:**

```typescript
// test/factories/mock-repositories.factory.ts
export function createMockOrderRepository(
  overrides?: Partial<jest.Mocked<OrderRepository>>
): jest.Mocked<OrderRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCartId: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function createMockCartRepository(
  overrides?: Partial<jest.Mocked<ShoppingCartRepository>>
): jest.Mocked<ShoppingCartRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCustomerId: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}
```

**Service mock factory:**

```typescript
// test/factories/mock-services.factory.ts
export function createMockPricingService(
  overrides?: Partial<jest.Mocked<OrderPricingService>>
): jest.Mocked<OrderPricingService> {
  return {
    price: jest.fn(),
    ...overrides,
  };
}

export function createMockEventPublisher(
  overrides?: Partial<jest.Mocked<DomainEventPublisher>>
): jest.Mocked<DomainEventPublisher> {
  return {
    publishDomainEvents: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

**Usage in tests:**

```typescript
// Simple case - use defaults
const mockOrderRepo = createMockOrderRepository();

// Override specific methods when needed
const mockOrderRepo = createMockOrderRepository({
  findById: jest.fn().mockResolvedValue(OrderBuilder.create()),
});

// For services with many dependencies
const service = new CheckoutService(
  createMockCartRepository(),
  createMockOrderRepository(),
  createMockPricingService(),
  createMockOrderCreationService(),
  createMockEventPublisher(),
);
```

**Benefits:**
- No more `as any` casting
- Proper TypeScript typing throughout
- Sensible defaults (nulls for queries, resolved promises for commands)
- Easy to override when test needs specific behavior

### ID Base Classes Design

**Goal:** Consolidate duplicate validation and equality logic across 7 ID value objects.

**Two base classes:**

**StringId - for simple string identifiers:**

```typescript
// src/domain/shared/base/string-id.base.ts
export abstract class StringId {
  protected readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error(`${this.constructor.name} cannot be empty`);
    }
    this.value = value.trim();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: StringId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**UuidId - for UUID-based identifiers:**

```typescript
// src/domain/shared/base/uuid-id.base.ts
import { randomUUID } from 'crypto';

export abstract class UuidId extends StringId {
  constructor(value: string) {
    super(value);
    this.validateUuid(value);
    this.value = value.toLowerCase();
  }

  static generate<T extends UuidId>(this: new (value: string) => T): T {
    return new this(randomUUID());
  }

  private validateUuid(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UUID format for ${this.constructor.name}`);
    }
  }
}
```

**Refactored ID implementations:**

```typescript
// UUID-based IDs (OrderId, CartId, EventId)
export class OrderId extends UuidId {
  static generate(): OrderId {
    return super.generate.call(this);
  }
}

// Simple string IDs (ProductId, CustomerId)
export class ProductId extends StringId {
  static fromString(value: string): ProductId {
    return new ProductId(value);
  }
}

// Prefixed IDs (PaymentId, ReservationId) - extend StringId, add prefix validation
export class PaymentId extends StringId {
  constructor(value: string) {
    super(value);
    if (!value.startsWith('PAY-')) {
      throw new Error("PaymentId must start with 'PAY-'");
    }
  }

  static fromString(value: string): PaymentId {
    return new PaymentId(value);
  }
}

export class ReservationId extends StringId {
  constructor(value: string) {
    super(value);
    if (!value.startsWith('RES-')) {
      throw new Error("ReservationId must start with 'RES-'");
    }
  }

  static fromString(value: string): ReservationId {
    return new ReservationId(value);
  }
}
```

**Impact:** ~200 lines of duplicated validation/equality logic consolidated into ~60 lines of base classes.

## Implementation Plan

### Phase 1: Immediate Velocity (P1 - Week 1)

1. **Common fixtures** (`test/fixtures/common-values.ts`)
   - Standard shipping addresses, product IDs, customer IDs
   - ~30 minutes
   - Used by all builders

2. **OrderItemBuilder**
   - Simplest builder, needed by OrderBuilder
   - ~1-2 hours
   - Immediate relief for verbose test setup

3. **OrderBuilder**
   - Biggest pain point solved
   - Creates orders in 1-3 lines instead of 20
   - ~2-3 hours

4. **Mock factories**
   - `mock-repositories.factory.ts`
   - `mock-services.factory.ts`
   - Eliminates mock boilerplate
   - ~2 hours

**Deliverable:** Test builders + mock factories working. Can be used in new tests immediately.

### Phase 2: Foundation Cleanup (P2 - Week 2)

5. **StringId base class**
   - ~30 minutes

6. **UuidId base class**
   - ~30 minutes

7. **Refactor existing IDs** (7 total: OrderId, CartId, EventId, ProductId, CustomerId, PaymentId, ReservationId)
   - One at a time, run tests after each
   - ~2-3 hours total
   - Can be done incrementally

8. **ShoppingCartBuilder** (if needed)
   - Less critical than OrderBuilder
   - ~1-2 hours

**Deliverable:** All IDs using base classes. Reduced duplication. Foundation for future IDs.

### Phase 3: Nice to Haves (P3 - If Time Permits)

9. Centralized Order-to-DTO mapper
10. Type safety improvements (PaymentId/ReservationId in Order aggregate)
11. Domain exception base class

## Migration Strategy

**Approach:** Dedicated cleanup sprint to achieve consistent, clean codebase (educational project goal).

**Steps:**

1. **Implement Phase 1** (builders + factories)
2. **Verify with new test examples** - Write 1-2 new tests using builders to validate API
3. **Migrate existing tests** in order of impact:
   - `src/domain/order/__tests__/order.spec.ts` (1287 lines - biggest impact)
   - `src/application/services/__tests__/checkout.service.spec.ts` (246 lines)
   - `src/application/services/__tests__/order.service.spec.ts` (240 lines)
   - Remaining test files
4. **Goal:** 100% of tests using new infrastructure

**Benefits for educational project:**
- Clean, consistent examples throughout
- Demonstrates refactoring discipline
- Shows "before/after" improvement clearly
- Tests become living documentation of best practices

## Success Metrics

**Quantitative:**
- Test file line count reduced by 30-40% (from ~1,800 lines to ~1,200 lines)
- New test setup reduced from 10-20 lines to 1-3 lines (80-90% reduction)
- ID value object code reduced by ~140 lines (200 lines → 60 lines base classes)
- Zero `as any` casting in test mocks

**Qualitative:**
- Faster test authoring (developers can write tests without referencing existing setup)
- Easier test maintenance (change defaults in one place, all tests benefit)
- Better test readability (focus on what's being tested, not setup ceremony)
- Consistent patterns across all test files

## P3 Items (Deferred)

These improvements remain in scope as "if time permits" after P1 and P2 deliver:

**Centralized mappers:**
- Order-to-DTO mapper consolidation (eliminate 90 lines of duplication across CheckoutService and OrderService)

**Type safety:**
- Order aggregate stores `PaymentId` and `ReservationId` value objects instead of nullable strings
- MessageHandler interface enforces specific payload types instead of `any` default

**Domain exception base class:**
- Consolidate exception boilerplate (reduce 70 lines to ~28 lines)

## Notes

This design prioritizes **developer velocity** through:
1. Reducing test setup complexity (builders)
2. Eliminating mock boilerplate (factories)
3. Consolidating duplicate code patterns (ID base classes)

The test-only approach for builders allows for rapid implementation without risking production domain integrity. Migration as a dedicated sprint ensures the educational codebase maintains consistent, clean examples throughout.
