# Implementation Plan: Event-Driven Integration Flow

**Branch**: `004-event-driven-integration` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-event-driven-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement an event-driven integration architecture for the Orders bounded context using domain events and a publish/subscribe message bus. The Orders domain will emit domain events (OrderPlaced, OrderPaid, OrderCancelled) that are mapped to integration message topics and published to external bounded contexts. Two simulated consumers (Payments and Stock) will subscribe to Orders events and publish their own events back, enabling asynchronous cross-context coordination. Orders will handle external events (payment.approved, stock.reserved) with idempotency and state machine validation, demonstrating eventual consistency and loose coupling.

**Technical Approach**: Build on existing Order aggregate and domain events, add message bus infrastructure layer, implement event-to-topic mapping, create simulated consumers as NestJS providers, and add event handlers in Orders context with idempotency tracking.

## Technical Context

**Language/Version**: TypeScript 5.7.3 with Node.js (target ES2023)
**Primary Dependencies**: NestJS 11.0.1, class-validator 0.14.3, class-transformer 0.5.1
**Storage**: In-memory (educational - no persistent database for events or idempotency tracking)
**Testing**: Jest 30.0.0 (unit tests for domain logic, integration tests for application services, e2e tests for complete flow)
**Target Platform**: Node.js server (development with hot reload via nest start --watch)
**Project Type**: NestJS single project (layered DDD architecture: Domain/Application/Infrastructure)
**Performance Goals**: Event publishing <100ms, end-to-end flow completion <5 seconds
**Constraints**: Educational focus (in-memory message bus, simulated consumers, no advanced features like dead letter queues or retry policies)
**Scale/Scope**: 3 bounded contexts (Orders, Payments, Stock), 3 domain events, 4 integration message topics, 2 external event handlers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [constitution principles](../../.specify/memory/constitution.md):

- [x] **Domain Layer Purity**: No infrastructure dependencies in domain layer (Principle I)
  - Domain events (OrderPlaced, OrderPaid, OrderCancelled) will be pure TypeScript classes
  - Order aggregate emits events but doesn't depend on message bus
- [x] **Layered Architecture**: Proper separation of Domain/Application/Infrastructure (Principle II)
  - Domain: events, Order aggregate state transitions
  - Application: event handler interfaces, integration DTOs
  - Infrastructure: message bus implementation, event publishers, consumers
- [x] **Aggregate Design**: Aggregates designed around transaction boundaries (Principle III)
  - Order aggregate manages state transitions and emits events atomically
  - Idempotency tracking scoped per order (aggregate boundary)
- [x] **Value Objects**: Domain concepts modeled as Value Objects, not primitives (Principle IV)
  - EventId, PaymentId, ReservationId will be value objects
  - Reuse existing OrderId, Money, etc.
- [x] **TDD**: Tests written before implementation (Principle V)
  - Unit tests for domain events and Order state transitions
  - Integration tests for message bus publish/subscribe
  - E2E tests for complete eventual consistency flow
- [x] **Anti-Corruption Layer**: External integration uses gateways (Principle VI)
  - Message bus acts as ACL between bounded contexts
  - Events translated to/from integration message format
- [x] **Intention-Revealing Design**: Ubiquitous language used throughout (Principle VII)
  - Method names: `publishDomainEvents()`, `handlePaymentApproved()`, `handleStockReserved()`
  - Event names: past tense (OrderPlaced, OrderPaid, OrderCancelled)
- [x] **Atomic Commits**: Conventional Commits specification followed (Principle VIII)
  - Commits will follow format: `feat(events): add OrderPlaced domain event`

**Quality Gates**:
- [x] Linting configured and passing (ESLint 9.18.0 with Prettier)
- [x] Formatting configured (Prettier 3.4.2)
- [x] Test framework configured (Jest 30.0.0)
- [x] TypeScript strict mode enabled (TypeScript 5.7.3)
- [x] Build pipeline functional (NestJS CLI 11.0.0)

## Project Structure

### Documentation (this feature)

```text
specs/004-event-driven-integration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── message-bus.interface.md
│   ├── domain-events.md
│   └── integration-messages.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── order/
│   │   ├── events/
│   │   │   ├── order-placed.event.ts         # NEW: Domain event for checkout completion
│   │   │   ├── order-paid.event.ts           # EXISTS: Enhanced with eventId
│   │   │   └── order-cancelled.event.ts      # EXISTS: Enhanced with eventId
│   │   ├── order.ts                          # MODIFIED: Add OrderPlaced emission, idempotency tracking
│   │   └── order.repository.ts               # EXISTS: No changes needed
│   └── shared/
│       ├── domain-event.ts                   # EXISTS: Base class for domain events
│       └── value-objects/
│           ├── event-id.ts                   # NEW: Unique identifier for events
│           ├── payment-id.ts                 # NEW: External payment identifier
│           └── reservation-id.ts             # NEW: External stock reservation identifier
├── application/
│   ├── events/
│   │   ├── message-bus.interface.ts          # NEW: Message bus contract (publish/subscribe)
│   │   ├── integration-message.ts            # NEW: Envelope for integration messages
│   │   └── handlers/
│   │       ├── payment-approved.handler.ts   # NEW: Handle payment.approved events
│   │       └── stock-reserved.handler.ts     # NEW: Handle stock.reserved events
│   └── order/
│       └── services/
│           └── checkout.service.ts           # MODIFIED: Publish domain events after checkout
└── infrastructure/
    ├── events/
    │   ├── in-memory-message-bus.ts          # NEW: In-memory pub/sub implementation
    │   ├── domain-event-publisher.ts         # NEW: Maps domain events to integration messages
    │   └── consumers/
    │       ├── payments-consumer.ts          # NEW: Simulated Payments BC (order.placed → payment.approved)
    │       └── stock-consumer.ts             # NEW: Simulated Stock BC (order.paid → stock.reserved)
    ├── order/
    │   └── event-handlers/
    │       ├── payment-approved.handler.ts   # NEW: Infrastructure adapter for payment.approved
    │       └── stock-reserved.handler.ts     # NEW: Infrastructure adapter for stock.reserved
    └── app.module.ts                         # MODIFIED: Register message bus and consumers

test/
└── e2e/
    └── event-driven-flow.e2e-spec.ts         # NEW: End-to-end eventual consistency test
```

**Structure Decision**: Using existing NestJS layered DDD architecture (Domain/Application/Infrastructure). Event-driven components follow same layering: domain events in Domain layer, handler interfaces in Application layer, message bus and consumers in Infrastructure layer. This maintains constitutional principles while adding event-driven capabilities as a cross-cutting concern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitutional principles are satisfied by this design.

---

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **In-Memory Message Bus Pattern**
   - **Goal**: Design simple, testable pub/sub message bus for educational use
   - **Key Questions**:
     - How to implement topic-based routing without external dependencies?
     - How to enable multiple subscribers per topic?
     - How to simulate async processing while remaining testable?
   - **Deliverable**: Message bus interface and implementation approach

2. **Domain Event to Integration Message Mapping**
   - **Goal**: Define translation layer between domain events and integration messages
   - **Key Questions**:
     - What metadata should integration messages include beyond domain event payload?
     - How to maintain correlation between events across contexts?
     - Should mapping be automatic or explicit per event type?
   - **Deliverable**: Event publisher pattern and message envelope structure

3. **Idempotency Tracking Without Persistence**
   - **Goal**: Implement duplicate detection in memory for educational demo
   - **Key Questions**:
     - What identifiers uniquely identify external events (paymentId, reservationId)?
     - How to scope idempotency (per order, global)?
     - What time window for duplicate detection (24 hours per spec assumption A-008)?
   - **Deliverable**: Idempotency tracking design in Order aggregate

4. **Simulated Consumer Implementation**
   - **Goal**: Create realistic but simple external bounded context simulators
   - **Key Questions**:
     - Should consumers run as separate NestJS providers or modules?
     - How to trigger async processing without real queues?
     - How to make consumer behavior configurable for testing (success/failure)?
   - **Deliverable**: Consumer architecture pattern

5. **Event Handler Registration in NestJS**
   - **Goal**: Integrate event-driven flow with NestJS dependency injection
   - **Key Questions**:
     - How to auto-register event handlers at startup?
     - How to inject dependencies (repositories, services) into handlers?
     - Should handlers be scoped or singleton?
   - **Deliverable**: NestJS integration pattern for event handlers

### Research Output Location

All research findings will be documented in [research.md](./research.md).

---

## Phase 1: Design Artifacts

### 1. Data Model

**Output**: [data-model.md](./data-model.md)

**Entities & Value Objects**:
- **EventId** (Value Object): Unique identifier for domain events (UUID)
- **PaymentId** (Value Object): External payment transaction identifier (string)
- **ReservationId** (Value Object): External stock reservation identifier (string)
- **IntegrationMessage** (Entity): Envelope for cross-context messages (messageId, topic, timestamp, payload, correlationId)
- **OrderPlaced** (Domain Event): Emitted after successful checkout
- **OrderPaid** (Domain Event - Enhanced): Add eventId for idempotency
- **OrderCancelled** (Domain Event - Enhanced): Add eventId for idempotency

**State Transitions**:
- Order: AwaitingPayment → (payment.approved) → Paid → (stock.reserved) → StockReserved
- Order: AwaitingPayment/Paid → (cancel()) → Cancelled
- Idempotency: Track processed paymentIds and reservationIds per order

**Validation Rules**:
- EventId must be unique per domain event instance
- PaymentId must be provided in payment.approved message
- ReservationId must be provided in stock.reserved message
- Duplicate events (same paymentId/reservationId for same orderId) are idempotent
- Events for non-existent orders are rejected with error log

### 2. Message Bus Contracts

**Output**: [contracts/message-bus.interface.md](./contracts/message-bus.interface.md)

**IMessageBus Interface**:
```typescript
interface IMessageBus {
  // Publish message to topic
  publish<T>(topic: string, payload: T): Promise<void>;

  // Subscribe handler to topic (multiple subscribers allowed)
  subscribe<T>(topic: string, handler: (message: IntegrationMessage<T>) => Promise<void>): void;
}
```

**Topics**:
- `order.placed`: Published by Orders after checkout
- `order.paid`: Published by Orders after payment confirmation
- `order.cancelled`: Published by Orders after cancellation
- `payment.approved`: Published by Payments consumer after processing order.placed
- `stock.reserved`: Published by Stock consumer after processing order.paid

**IntegrationMessage Envelope**:
```typescript
interface IntegrationMessage<T> {
  messageId: string;       // Unique message identifier
  topic: string;           // Message topic
  timestamp: Date;         // When message was published
  payload: T;              // Domain-specific data
  correlationId: string;   // For tracing (orderId)
}
```

### 3. Domain Event Contracts

**Output**: [contracts/domain-events.md](./contracts/domain-events.md)

**OrderPlaced Event**:
```typescript
class OrderPlaced extends DomainEvent {
  constructor(
    eventId: EventId,
    orderId: OrderId,
    customerId: CustomerId,
    items: OrderItem[],
    totalAmount: Money,
    shippingAddress: ShippingAddress,
    timestamp: Date,
  )
}
```

**OrderPaid Event** (Enhanced):
```typescript
class OrderPaid extends DomainEvent {
  constructor(
    eventId: EventId,        // NEW
    orderId: OrderId,
    paymentId: string,
    amount: Money,
    timestamp: Date,
  )
}
```

**OrderCancelled Event** (Enhanced):
```typescript
class OrderCancelled extends DomainEvent {
  constructor(
    eventId: EventId,        // NEW
    orderId: OrderId,
    reason: string,
    previousStatus: OrderStatus,
    timestamp: Date,
  )
}
```

### 4. Integration Message Contracts

**Output**: [contracts/integration-messages.md](./contracts/integration-messages.md)

**order.placed Payload**:
```typescript
interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  items: Array<{productId: string; quantity: number; price: number}>;
  totalAmount: number;
  currency: string;
  timestamp: string;
}
```

**payment.approved Payload**:
```typescript
interface PaymentApprovedPayload {
  orderId: string;
  paymentId: string;
  approvedAmount: number;
  currency: string;
  timestamp: string;
}
```

**stock.reserved Payload**:
```typescript
interface StockReservedPayload {
  orderId: string;
  reservationId: string;
  items: Array<{productId: string; quantity: number}>;
  timestamp: string;
}
```

### 5. Quickstart Guide

**Output**: [quickstart.md](./quickstart.md)

Provides step-by-step instructions to:
1. Run the application with event-driven flow enabled
2. Trigger end-to-end scenario (checkout → payment → stock → order complete)
3. Observe event flow through logs
4. Test idempotency by replaying events
5. Run e2e test suite demonstrating eventual consistency

---

## Phase 2: Task Breakdown

**Note**: Task breakdown is generated by `/speckit.tasks` command, NOT by `/speckit.plan`.

The planning phase ends here. To proceed with task generation, run `/speckit.tasks`.

---

## Implementation Notes

### Critical Path

1. **Domain Events** (P1): Add OrderPlaced, enhance OrderPaid/OrderCancelled with eventId
2. **Message Bus** (P1): Implement in-memory pub/sub with topic routing
3. **Event Publisher** (P1): Map domain events to integration messages and publish
4. **Simulated Consumers** (P1): Payments and Stock consumers with configurable behavior
5. **Event Handlers** (P1): Orders-side handlers for payment.approved and stock.reserved
6. **Idempotency** (P1): Track processed paymentIds and reservationIds in Order aggregate
7. **E2E Test** (P1): Demonstrate complete eventual consistency flow
8. **Cancellation** (P2): Propagate order.cancelled to external contexts
9. **State Validation** (P3): Enhanced logging for invalid state transitions

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| In-memory message bus loses messages on restart | Medium | Acceptable for educational demo; document limitation |
| Race conditions in async event processing | High | Use in-memory queue to serialize events per order |
| Idempotency tracking grows unbounded | Low | Implement time-based cleanup (24-hour window per spec) |
| Simulated consumers too simplistic | Low | Make behavior configurable for realistic testing scenarios |

### Dependencies

- Existing Order aggregate with state machine (AwaitingPayment, Paid, Cancelled, StockReserved)
- Existing checkout flow (CheckoutService)
- Existing order cancellation capability (Order.cancel())
- NestJS provider registration and dependency injection

### Performance Considerations

- Event publishing must complete in <100ms (SC-001)
- End-to-end flow should complete in <5 seconds (SC-002)
- In-memory message bus should handle sequential event processing per order to avoid race conditions
- Idempotency checks should be O(1) lookups (use Map/Set data structures)

### Testing Strategy

1. **Unit Tests**:
   - Domain events: payload construction, immutability
   - Order aggregate: state transitions with event emission
   - Message bus: publish/subscribe mechanics
   - Event handlers: idempotency logic, state validation

2. **Integration Tests**:
   - Event publisher: domain event → integration message mapping
   - Consumers: subscribe to topics, publish responses
   - Event handlers: repository interaction, event emission

3. **E2E Tests**:
   - Complete flow: checkout → order.placed → payment.approved → Paid → order.paid → stock.reserved → StockReserved
   - Idempotency: replay events, verify no state corruption
   - Invalid states: send events to incompatible states, verify rejection
   - Cancellation: cancel order, verify event propagation

---

## Next Steps

1. Review this plan for completeness and accuracy
2. Run `/speckit.tasks` to generate task breakdown from this plan
3. Begin implementation following TDD principles (tests first)
4. Commit frequently using Conventional Commits format
5. Update PR description incrementally as work progresses
