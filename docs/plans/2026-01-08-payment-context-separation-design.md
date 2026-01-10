# Payment Context Separation - Design Document

**Date:** 2026-01-08
**Status:** Approved
**Type:** Architectural Refactoring

## Overview

Refactor the codebase to properly separate the Payment bounded context from the Orders bounded context. Currently, payment-related logic lives within the Orders BC, creating improper coupling. This refactoring demonstrates correct bounded context separation and communication patterns for educational purposes.

## Problem Statement

Current architecture issues:
- Payment processing logic (`StubPaymentGateway`, `ConfirmPaymentService`) lives in Orders BC
- Mixed communication: Orders→Payments (sync) and Payments→Orders (async)
- `PaymentsConsumer` simulates a separate context but shares the Orders BC structure
- Violates bounded context isolation principles

## Goals

1. **Separate Payments BC** with its own structure (application + infrastructure layers)
2. **Reverse sync communication direction**: Payments→Orders via `OrderGateway`
3. **Maintain async flows**: Orders publishes events, Payments consumes them
4. **Keep behavior unchanged**: Both HTTP and event-driven flows continue working
5. **Demonstrate clean context communication** without over-engineering

## High-Level Architecture

### Bounded Context Structure

```
src/
├── contexts/
│   ├── orders/           # Orders Bounded Context
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   └── payments/         # Payments Bounded Context (NEW)
│       ├── application/
│       └── infrastructure/
├── shared/               # Shared Kernel (NEW)
│   ├── value-objects/
│   ├── events/
│   └── message-bus/
└── app.module.ts
```

### Communication Patterns

**Synchronous (Payments → Orders):**
- `OrderGateway` interface in Payments BC
- Implementation calls `PaymentApprovedHandler` directly (in-process)
- Used by HTTP payment endpoint

**Asynchronous (Orders → Payments):**
- Orders publishes: `order.placed`, `order.cancelled`
- Payments consumes: via `PaymentsConsumer`

**Asynchronous (Payments → Orders):**
- Payments publishes: `payment.approved` (from auto-approval flow)
- Orders consumes: via `PaymentApprovedHandler`

### Payment Flows

**Flow 1: HTTP Payment Processing**

```
POST /payments { orderId, amount, currency }
  → PaymentController
  → ProcessPaymentService
      ├── Process payment (inline stub logic)
      ├── Generate paymentId
      └── OrderGateway.markOrderAsPaid(orderId, paymentId)
          → PaymentApprovedHandler (Orders BC)
              ├── Load Order aggregate
              ├── order.markAsPaid(paymentId)
              ├── Save order
              └── Publish OrderPaid domain event
  ← { success: true, paymentId }
```

**Flow 2: Async Auto-Approval (unchanged)**

```
Orders BC → order.placed event
Payments BC (PaymentsConsumer) → processes → payment.approved event
Orders BC (PaymentApprovedHandler) → marks order as paid
```

**Flow 3: Order Cancellation (unchanged)**

```
Orders BC → order.cancelled event
Payments BC (PaymentsConsumer) → logs refund action
```

## Detailed Design

### Payments Bounded Context

**Application Layer:**

```typescript
// src/contexts/payments/application/services/process-payment.service.ts
@Injectable()
export class ProcessPaymentService {
  constructor(private readonly orderGateway: IOrderGateway) {}

  async execute(orderId: string, amount: Money): Promise<PaymentResult> {
    // Inline stub payment logic (from old StubPaymentGateway)
    await this.simulateLatency();
    const paymentId = this.generatePaymentId(orderId);

    // Validate payment (deterministic patterns for testing)
    if (!this.validatePayment(orderId, amount)) {
      return { success: false, reason: 'Payment declined' };
    }

    // Call Orders BC to mark as paid
    await this.orderGateway.markOrderAsPaid(orderId, paymentId);

    return { success: true, paymentId };
  }

  private simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 1500) + 500;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private generatePaymentId(orderId: string): string {
    return `PAY-${orderId}`;
  }

  private validatePayment(orderId: string, amount: Money): boolean {
    // Same validation logic from StubPaymentGateway
    if (amount.amount < 0.01) return false;
    if (amount.amount > 10000) return false;

    const lastChar = orderId.charAt(orderId.length - 1);
    if (lastChar === '5' || lastChar === '9') return false;

    return true;
  }
}
```

```typescript
// src/contexts/payments/application/gateways/order-gateway.interface.ts
export interface IOrderGateway {
  /**
   * Mark an order as paid
   * Called by Payments BC after successful payment processing
   */
  markOrderAsPaid(orderId: string, paymentId: string): Promise<void>;
}
```

**Infrastructure Layer:**

```typescript
// src/contexts/payments/infrastructure/controllers/payment.controller.ts
@Controller('payments')
export class PaymentController {
  constructor(private readonly processPaymentService: ProcessPaymentService) {}

  @Post()
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const orderId = dto.orderId;
    const amount = new Money(dto.amount, dto.currency);

    const result = await this.processPaymentService.execute(orderId, amount);

    if (!result.success) {
      throw new BadRequestException(result.reason);
    }

    return {
      paymentId: result.paymentId,
      status: 'approved',
      orderId,
    };
  }
}
```

```typescript
// src/contexts/payments/infrastructure/gateways/in-process-order.gateway.ts
@Injectable()
export class InProcessOrderGateway implements IOrderGateway {
  constructor(
    private readonly paymentApprovedHandler: PaymentApprovedHandler
  ) {}

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    // Call Orders BC handler directly (in-process communication)
    await this.paymentApprovedHandler.handle({
      orderId,
      paymentId,
      approvedAmount: 0, // Not used by handler
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }
}
```

```typescript
// src/contexts/payments/infrastructure/modules/payment.module.ts
@Module({
  imports: [OrderModule], // Access PaymentApprovedHandler
  controllers: [PaymentController],
  providers: [
    ProcessPaymentService,
    PaymentsConsumer,
    {
      provide: 'ORDER_GATEWAY',
      useClass: InProcessOrderGateway,
    },
  ],
  exports: [PaymentsConsumer],
})
export class PaymentModule {}
```

### Orders Bounded Context

**Changes:**

1. **OrderController** - Remove `POST /orders/:id/payment` endpoint
2. **OrderModule** - Export `PaymentApprovedHandler`, remove `PAYMENT_GATEWAY` provider
3. **File moves** - Relocate existing files to `src/contexts/orders/` structure

**No changes needed:**
- Order aggregate domain logic
- `PaymentApprovedHandler` (still consumes `payment.approved` events)
- Domain events
- Repositories

### Shared Kernel

**Value Objects:**
- `PaymentId` - from `src/domain/shared/value-objects/`
- `OrderId` - from `src/domain/order/value-objects/`
- `Money` - from `src/domain/order/value-objects/`

**Events:**
- `integration-message.ts` - All integration message types and payloads

**Message Bus:**
- `message-bus.interface.ts` - `IMessageBus` interface

### Module Wiring

```typescript
// src/app.module.ts
@Module({
  imports: [
    OrderModule,
    PaymentModule, // NEW
  ],
  providers: [
    InMemoryMessageBus, // Shared instance
    DomainEventPublisher,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly paymentsConsumer: PaymentsConsumer) {}

  onModuleInit() {
    this.paymentsConsumer.initialize();
  }
}
```

## File Migration Plan

### Payments BC - New Files

```
src/contexts/payments/
├── application/
│   ├── services/
│   │   └── process-payment.service.ts      # Adapted from confirm-payment.service.ts
│   └── gateways/
│       └── order-gateway.interface.ts      # NEW
└── infrastructure/
    ├── controllers/
    │   └── payment.controller.ts           # NEW
    ├── gateways/
    │   └── in-process-order.gateway.ts     # NEW
    ├── events/
    │   └── consumers/
    │       └── payments-consumer.ts        # MOVED from infrastructure/events/consumers/
    └── modules/
        └── payment.module.ts               # NEW
```

### Orders BC - Relocated Files

```
src/contexts/orders/
├── domain/
│   └── order/                              # All existing Order domain files
├── application/
│   ├── services/                           # CheckoutService, OrderService, etc.
│   ├── dtos/                              # All DTOs
│   └── events/
│       └── handlers/
│           └── payment-approved.handler.ts # MOVED (no changes)
└── infrastructure/
    ├── controllers/
    │   └── order.controller.ts             # MOVED, remove payment endpoint
    ├── repositories/
    │   └── in-memory-order.repository.ts   # MOVED
    └── modules/
        └── order.module.ts                 # MOVED, updated exports
```

### Shared Kernel - New Location

```
src/shared/
├── value-objects/
│   ├── payment-id.ts                       # MOVED from domain/shared/
│   ├── order-id.ts                         # MOVED from domain/order/value-objects/
│   └── money.ts                            # MOVED from domain/order/value-objects/
├── events/
│   └── integration-message.ts              # MOVED from application/events/
└── message-bus/
    └── message-bus.interface.ts            # MOVED from application/events/
```

### Files to Delete

- `src/infrastructure/gateways/stub-payment.gateway.ts` - Logic moves to ProcessPaymentService
- `src/application/gateways/payment-gateway.interface.ts` - No longer needed
- `src/application/gateways/payment-result.ts` - Can be inlined or kept as simple type
- `src/application/services/confirm-payment.service.ts` - Becomes ProcessPaymentService

## Testing Strategy

### Tests to Update

1. **E2E Tests (`test/order.e2e-spec.ts`):**
   - Change endpoint: `POST /orders/:id/payment` → `POST /payments`
   - Update request body: `{ orderId, amount, currency }`
   - Update response assertions

2. **E2E Tests (`test/event-driven-flow.e2e-spec.ts`):**
   - Should work without changes (async flow unchanged)

3. **Unit Tests:**
   - Move `ConfirmPaymentService` tests → `ProcessPaymentService` tests
   - Delete `StubPaymentGateway` tests
   - Add `InProcessOrderGateway` tests (simple wrapper)
   - Add `PaymentController` tests
   - Keep `PaymentApprovedHandler` tests (no changes)

4. **Domain Tests:**
   - No changes needed (domain logic unchanged)

## Implementation Steps

1. **Create shared kernel:**
   - Create `src/shared/` structure
   - Move value objects, events, message bus interface
   - Update all imports across codebase

2. **Create Payments BC:**
   - Create `src/contexts/payments/` structure
   - Move `PaymentsConsumer`
   - Create `OrderGateway` interface and implementation
   - Create `ProcessPaymentService`
   - Create `PaymentController`
   - Create `PaymentModule`

3. **Relocate Orders BC:**
   - Create `src/contexts/orders/` structure
   - Move all existing order files
   - Update `OrderModule` exports
   - Remove payment endpoint from `OrderController`

4. **Wire modules:**
   - Update `AppModule`
   - Configure dependency injection
   - Initialize consumers

5. **Update tests:**
   - Fix imports
   - Update E2E tests
   - Add new component tests

6. **Delete obsolete files:**
   - Remove old payment gateway files
   - Clean up unused interfaces

## Breaking Changes

**API Changes:**
- Endpoint: `POST /orders/:id/payment` → `POST /payments`
- Request body: Path param → `{ orderId, amount, currency }` in body
- Response format: Order-centric → Payment-centric

**Internal Changes:**
- Import paths change for shared types
- Module dependencies restructured

## Risks and Mitigations

**Risk: Import path errors during migration**
- Mitigation: Use IDE refactoring tools, update incrementally, run TypeScript compiler frequently

**Risk: Circular module dependencies**
- Mitigation: PaymentModule imports OrderModule (one-way), careful with exports

**Risk: Test breakage during migration**
- Mitigation: Fix tests incrementally, start with unit tests, then integration, then E2E

**Risk: Missing file moves**
- Mitigation: Use checklist, verify with `git status`, ensure all files accounted for

## Future Considerations

- Could split into true microservices with HTTP-based OrderGateway
- Could add payment domain logic (Payment aggregate, payment states)
- Could add payment repository for persistence
- Could use command/event pattern instead of direct handler calls

## Success Criteria

- ✅ Payments BC has independent structure under `src/contexts/payments/`
- ✅ Orders BC isolated under `src/contexts/orders/`
- ✅ Shared types in `src/shared/`
- ✅ Both payment flows work (HTTP + async)
- ✅ All tests passing
- ✅ Clean bounded context separation demonstrated
- ✅ No behavioral changes to end-users
