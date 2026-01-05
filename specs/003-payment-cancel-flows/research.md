# Research: Synchronous Payment and Order Cancellation Flows

**Feature**: 003-payment-cancel-flows
**Date**: 2026-01-04
**Status**: Complete

## Overview

This document consolidates research findings for implementing synchronous payment processing and order cancellation flows within the existing DDD-structured Orders bounded context. Since this project builds on established patterns from Stages 1-2, most technical decisions inherit from prior work. New decisions focus on domain events, gateway patterns, and test coverage strategies.

## Technical Decisions

### Decision 1: Domain Event Infrastructure

**Decision**: Introduce base `DomainEvent` interface with timestamp and aggregate ID, raise events from aggregate methods

**Rationale**:
- Order aggregate methods (markAsPaid, cancel) represent significant business moments that should emit events
- Events enable future event-driven integration (Stage 4) without changing aggregate logic
- Keeping events in domain layer maintains purity - infrastructure subscribes to events
- Event metadata (timestamp, aggregate ID) standardized for observability

**Alternatives Considered**:
1. No events (simplest) - Rejected: Prevents future async integration, loses audit trail
2. Infrastructure-level events via AOP - Rejected: Violates domain purity, couples to framework
3. Application service emits events - Rejected: Breaks single source of truth, aggregate loses control

**Implementation**:
- Base interface: `DomainEvent { aggregateId: string, occurredAt: Date }`
- Specific events: `OrderPaid extends DomainEvent { paymentId: string }`, `OrderCancelled extends DomainEvent { reason: string, previousState: OrderStatus }`
- Aggregate collects events in private array, exposes via `getDomainEvents()` readonly method
- Application service publishes events after successful repository save (transactional outbox pattern concept)

**References**:
- `/docs/ddd-patterns/domain-events.md` - Project's domain event guidelines
- Vernon, "Implementing Domain-Driven Design" Chapter 8 - Domain Events
- Existing pattern: `OrderPlaced` event from Stage 2 (not yet implemented, planned for Stage 4)

### Decision 2: Gateway Pattern for External Payment System

**Decision**: Define `IPaymentGateway` interface in application layer, implement stubbed version in infrastructure

**Rationale**:
- Anti-Corruption Layer principle: isolate domain from external payment system changes
- Synchronous gateway fits educational objective (demonstrate request-response before events)
- Interface defines contract: `processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult>`
- Stubbed implementation returns deterministic results based on test data patterns

**Alternatives Considered**:
1. Direct HTTP client in application service - Rejected: Violates ACL, couples to specific payment API
2. Domain service with external dependency - Rejected: Violates domain purity
3. NestJS HttpService directly - Rejected: Locks into NestJS HTTP module, prevents testing

**Implementation**:
```typescript
// application/order/gateways/payment-gateway.interface.ts
export interface IPaymentGateway {
  processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult>;
}

export type PaymentResult =
  | { success: true; paymentId: string }
  | { success: false; reason: string };

// infrastructure/order/gateways/stubbed-payment.gateway.ts
@Injectable()
export class StubbedPaymentGateway implements IPaymentGateway {
  async processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult> {
    // Deterministic logic: orderId ending in "0" = approved, others = rejected
    // Amount < $0.01 = invalid, > $10000 = fraud check failure
    // Simulates 500ms-2s latency
  }
}
```

**References**:
- `/docs/ddd-patterns/gateways.md` - Project's gateway pattern documentation
- Lesson 3 spec: PaymentGateway synchronous pattern (will be async in Lesson 4)
- Existing pattern: `CatalogGateway`, `PricingGateway` from Stage 2

### Decision 3: Application Service Orchestration Pattern

**Decision**: Create dedicated application services (`ConfirmPaymentService`, `CancelOrderService`) for use case orchestration

**Rationale**:
- Application layer responsibility: coordinate domain and infrastructure without business logic
- Each service encapsulates single use case following SRP
- Services handle: loading aggregate, calling gateway (if needed), invoking domain method, persisting, publishing events
- Thin orchestration: all business rules stay in Order aggregate

**Alternatives Considered**:
1. Controller handles orchestration - Rejected: Violates layering, couples HTTP concerns to use case
2. Single OrderService with multiple methods - Rejected: Grows too large, harder to test independently
3. Domain service orchestrates - Rejected: Domain services for domain logic only, not infrastructure coordination

**Implementation**:
```typescript
// application/order/services/confirm-payment.service.ts
@Injectable()
export class ConfirmPaymentService {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentGateway: IPaymentGateway,
    private eventPublisher: IDomainEventPublisher, // future: NestJS EventEmitter or message bus
  ) {}

  async execute(orderId: string): Promise<OrderDto> {
    // 1. Load aggregate
    const order = await this.orderRepo.findById(new OrderId(orderId));
    // 2. Call gateway
    const result = await this.paymentGateway.processPayment(order.id, order.totalAmount);
    if (!result.success) throw new PaymentDeclinedError(result.reason);
    // 3. Invoke domain method (business logic)
    order.markAsPaid(result.paymentId);
    // 4. Persist
    await this.orderRepo.save(order);
    // 5. Publish events
    this.eventPublisher.publishAll(order.getDomainEvents());
    // 6. Return DTO
    return OrderDto.fromDomain(order);
  }
}
```

**References**:
- `/docs/ddd-patterns/application-services.md` - Project's application service guidelines
- Existing pattern: `CheckoutService` from Stage 2
- Vernon, "Implementing Domain-Driven Design" Chapter 14 - Application Services

### Decision 4: HTTP Status Codes for State Transition Errors

**Decision**: Use 409 Conflict for invalid state transitions, 422 Unprocessable Entity for validation errors

**Rationale**:
- 409 Conflict: "The request could not be completed due to a conflict with the current state of the target resource"
  - Perfect for "Cannot pay order in Cancelled state" scenarios
  - Indicates client should reload resource state before retrying
- 422 Unprocessable Entity: Semantic validation failures (empty reason, whitespace-only)
- 4xx range as specified in requirements (not 5xx - these are business rule violations, not server errors)

**Alternatives Considered**:
1. 400 Bad Request for all errors - Rejected: Too generic, doesn't distinguish state conflicts from malformed requests
2. 403 Forbidden - Rejected: Implies authorization issue, not state machine violation
3. Custom 4xx code (449 Retry With) - Rejected: Non-standard, adds complexity

**Implementation**:
```typescript
// infrastructure/order/controllers/order.controller.ts
try {
  return await this.confirmPaymentService.execute(id);
} catch (error) {
  if (error instanceof InvalidOrderStateTransitionError) {
    throw new ConflictException(error.message); // 409
  }
  if (error instanceof PaymentDeclinedError) {
    throw new UnprocessableEntityException({
      message: 'Payment declined',
      reason: error.reason
    }); // 422
  }
  throw error; // Unexpected errors become 500
}
```

**References**:
- RFC 7231 Section 6.5.8 (409 Conflict), 6.5.1 (422 Unprocessable Entity)
- Requirement FR-025: "System MUST return 4xx functional errors"
- Success Criterion SC-009: "All state transition errors return 4xx status codes"

### Decision 5: Test Strategy - TDD with Three-Layer Coverage

**Decision**: Write tests first at three levels: Domain (unit) → Application (integration) → API (e2e)

**Rationale**:
- TDD enforced by Constitution Principle V
- Domain tests: Aggregate state transitions (markAsPaid/cancel), event raising, invariant validation
- Application tests: Service orchestration with mocked gateway and repository
- E2E tests: Full HTTP request through controller → service → domain → repository (in-memory)
- Test pyramid: Many unit tests, fewer integration tests, focused e2e smoke tests

**Test Coverage Plan**:

**Domain Layer (`order.spec.ts`)**:
- markAsPaid: success from AwaitingPayment, rejection from Paid/Cancelled, event raised
- cancel: success from AwaitingPayment/Paid, rejection from Cancelled, reason validation, event raised
- Edge cases: empty paymentId, whitespace-only reason

**Application Layer**:
- `confirm-payment.service.spec.ts`: Gateway approval/rejection, state transition errors, event publishing
- `cancel-order.service.spec.ts`: Cancellation from different states, reason validation, event publishing

**E2E Layer**:
- `order-payment.e2e-spec.ts`: POST /orders/:id/pay success (200), already paid (409), cancelled order (409), payment declined (422)
- `order-cancellation.e2e-spec.ts`: POST /orders/:id/cancel success from AwaitingPayment (200), success from Paid (200), already cancelled (409), empty reason (422)

**Alternatives Considered**:
1. Test after implementation - Rejected: Violates TDD principle, loses design feedback
2. Only e2e tests - Rejected: Slow feedback, unclear failure points, violates test pyramid
3. Integration tests with real HTTP clients - Rejected: Educational project uses stubs, no real payment system

**References**:
- Constitution Principle V: Test-Driven Development
- Fowler, "Test Pyramid" - https://martinfowler.com/bliki/TestPyramid.html
- Existing test structure: `/src/domain/order/__tests__/order.spec.ts`

### Decision 6: DTO Structure for API Requests/Responses

**Decision**: Use class-validator decorators on DTOs for request validation, transform domain models to response DTOs in controllers

**Rationale**:
- NestJS ValidationPipe auto-validates incoming requests against class-validator decorators
- DTOs serve as API contract, isolating external API shape from domain model
- Response DTOs include only relevant fields for each endpoint (e.g., paymentId visible only after payment)
- Follows existing project pattern (CheckoutDto, OrderResponseDto from Stage 2)

**DTO Designs**:

**PayOrderDto** (input):
```typescript
export class PayOrderDto {
  // Empty body for now; payment details abstracted by stubbed gateway
  // Future: add payment method, billing address when gateway expanded
}
```

**CancelOrderDto** (input):
```typescript
export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
```

**OrderResponseDto** (output - extend existing):
```typescript
export class OrderResponseDto {
  id: string;
  customerId: string;
  status: string; // "AwaitingPayment" | "Paid" | "Cancelled"
  totalAmount: { amount: number; currency: string };
  paymentId: string | null; // Populated when status = Paid
  cancellationReason: string | null; // Populated when status = Cancelled
  createdAt: string; // ISO 8601
  // ... existing fields from Stage 2
}
```

**Alternatives Considered**:
1. Pass domain objects directly to HTTP layer - Rejected: Leaks domain to API, prevents API evolution
2. Joi schema validation - Rejected: class-validator standard for NestJS, already in use
3. Separate DTOs per endpoint - Rejected: Premature, shared DTO works for now

**References**:
- NestJS Validation documentation: https://docs.nestjs.com/techniques/validation
- Existing DTOs: `/src/application/order/dtos/checkout.dto.ts`

## Summary

All technical decisions documented above are **approved** and ready for Phase 1 (design artifacts). Key takeaways:

✅ No NEEDS CLARIFICATION items remain - all unknowns resolved
✅ All decisions align with project constitution and existing patterns
✅ Implementation follows established DDD layering from Stages 1-2
✅ Test strategy follows TDD with comprehensive coverage plan
✅ Gateway pattern provides clear anti-corruption layer
✅ Domain events enable future async integration without rework

**Next Phase**: Generate data-model.md, contracts/, and quickstart.md

