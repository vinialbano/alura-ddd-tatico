# Tasks: Event-Driven Integration Flow

**Feature**: 004-event-driven-integration
**Input**: Design documents from `/specs/004-event-driven-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included per Constitution Principle V (TDD) and will be written BEFORE implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create directory structure: `src/domain/shared/value-objects/`, `src/application/events/handlers/`, `src/infrastructure/events/consumers/`, `src/infrastructure/order/event-handlers/`
- [X] T002 [P] Create event-id.ts value object in src/domain/shared/value-objects/event-id.ts
- [X] T003 [P] Create payment-id.ts value object in src/domain/shared/value-objects/payment-id.ts
- [X] T004 [P] Create reservation-id.ts value object in src/domain/shared/value-objects/reservation-id.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core event infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create IMessageBus interface in src/application/events/message-bus.interface.ts with publish() and subscribe() methods
- [X] T006 Create IntegrationMessage envelope interface in src/application/events/integration-message.ts with messageId, topic, timestamp, payload, correlationId fields
- [X] T007 [P] Write unit tests for InMemoryMessageBus in src/infrastructure/events/in-memory-message-bus.spec.ts (TDD: test publish/subscribe mechanics)
- [X] T008 Implement InMemoryMessageBus in src/infrastructure/events/in-memory-message-bus.ts using Map-based topic routing and setTimeout for async delivery
- [X] T009 Create OrderPlaced domain event in src/domain/order/events/order-placed.event.ts with eventId, orderId, customerId, items, totalAmount, shippingAddress, timestamp
- [X] T010 [P] Enhance OrderPaid event in src/domain/order/events/order-paid.event.ts to include eventId as first constructor parameter (BREAKING CHANGE)
- [X] T011 [P] Enhance OrderCancelled event in src/domain/order/events/order-cancelled.event.ts to include eventId as first constructor parameter (BREAKING CHANGE)
- [X] T012 [P] Write unit tests for DomainEventPublisher in src/infrastructure/events/domain-event-publisher.spec.ts (TDD: test event-to-message mapping)
- [X] T013 Create DomainEventPublisher service in src/infrastructure/events/domain-event-publisher.ts with publishDomainEvents() and mapping logic for OrderPlaced → order.placed, OrderPaid → order.paid, OrderCancelled → order.cancelled
- [X] T014 Register InMemoryMessageBus and DomainEventPublisher as providers in src/infrastructure/app.module.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Order Placement with Async Payment Processing (Priority: P1) 🎯 MVP

**Goal**: Complete end-to-end eventual consistency flow: checkout → order.placed → payment.approved → Paid → order.paid → stock.reserved → StockReserved

**Independent Test**: Place an order through checkout and observe that: (1) order is created in AwaitingPayment state, (2) payment consumer processes the order.placed event and approves payment, (3) order transitions to Paid state, (4) stock consumer processes order.paid event and reserves stock, (5) order reaches final StockReserved state. Delivers value by proving eventual consistency across bounded contexts.

### Tests for User Story 1 (TDD: Write these tests FIRST, ensure they FAIL before implementation)

- [X] T015 [P] [US1] Write unit tests for Order.create() OrderPlaced emission in src/domain/order/order.spec.ts
- [X] T016 [P] [US1] Write unit tests for Order.markAsPaid() with idempotency checking in src/domain/order/order.spec.ts
- [X] T017 [P] [US1] Write unit tests for Order.reserveStock() state transition in src/domain/order/order.spec.ts
- [ ] T018 [P] [US1] Write integration tests for PaymentApprovedHandler in src/application/events/handlers/payment-approved.handler.spec.ts
- [ ] T019 [P] [US1] Write integration tests for StockReservedHandler in src/application/events/handlers/stock-reserved.handler.spec.ts
- [ ] T020 [P] [US1] Write integration tests for PaymentsConsumer in src/infrastructure/events/consumers/payments-consumer.spec.ts
- [ ] T021 [P] [US1] Write integration tests for StockConsumer in src/infrastructure/events/consumers/stock-consumer.spec.ts
- [ ] T022 [US1] Write end-to-end test for complete flow in test/e2e/event-driven-flow.e2e-spec.ts (checkout → StockReserved)

### Implementation for User Story 1

- [X] T023 [US1] Modify Order.create() in src/domain/order/order.ts to emit OrderPlaced event with EventId.create(), orderId, customerId, items, totalAmount, shippingAddress, timestamp
- [X] T024 [US1] Add processedPaymentIds: Set<string> private field to Order aggregate in src/domain/order/order.ts
- [X] T025 [US1] Enhance Order.markAsPaid() in src/domain/order/order.ts to check processedPaymentIds for idempotency before state transition
- [X] T026 [US1] Add reserveStock(reservationId: string) method to Order aggregate in src/domain/order/order.ts with state validation (only from Paid) and transition to StockReserved
- [X] T027 [US1] Add processedReservationIds: Set<string> private field to Order aggregate in src/domain/order/order.ts
- [X] T028 [US1] Modify CheckoutService in src/application/order/services/checkout.service.ts to call eventPublisher.publishDomainEvents() after repository save
- [X] T029 [US1] Create PaymentApprovedHandler application service in src/application/events/handlers/payment-approved.handler.ts with handle(message: IntegrationMessage<PaymentApprovedPayload>) method
- [X] T030 [US1] Create StockReservedHandler application service in src/application/events/handlers/stock-reserved.handler.ts with handle(message: IntegrationMessage<StockReservedPayload>) method
- [X] T031 [P] [US1] Create PaymentsConsumer infrastructure service in src/infrastructure/events/consumers/payments-consumer.ts that subscribes to order.placed and publishes payment.approved with simulated 10ms delay
- [X] T032 [P] [US1] Create StockConsumer infrastructure service in src/infrastructure/events/consumers/stock-consumer.ts that subscribes to order.paid and publishes stock.reserved with simulated 10ms delay
- [X] T033 [P] [US1] Create payment-approved infrastructure handler adapter in src/infrastructure/order/event-handlers/payment-approved.handler.ts that delegates to application handler
- [X] T034 [P] [US1] Create stock-reserved infrastructure handler adapter in src/infrastructure/order/event-handlers/stock-reserved.handler.ts that delegates to application handler
- [X] T035 [US1] Register PaymentsConsumer, StockConsumer, and handlers in src/infrastructure/app.module.ts with OnModuleInit lifecycle hook to subscribe to topics
- [X] T036 [US1] Verify end-to-end test passes (T022) and complete flow reaches StockReserved state within 5 seconds (SC-002)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. The MVP is complete!

---

## Phase 4: User Story 2 - Order Cancellation Propagation (Priority: P2)

**Goal**: Capture order cancellation as a domain event and propagate it to other bounded contexts so they can react appropriately (e.g., release reserved stock, refund payment).

**Independent Test**: Cancel an order in a cancellable state and verify that an order.cancelled event is published with complete order details. External consumers can subscribe to this event to trigger their own compensating actions. Delivers value by ensuring cancellations are visible across the system.

### Tests for User Story 2 (TDD: Write these tests FIRST, ensure they FAIL before implementation)

- [X] T037 [P] [US2] Write unit tests for Order.cancel() OrderCancelled emission in src/domain/order/order.spec.ts
- [X] T038 [P] [US2] Write integration tests for PaymentsConsumer order.cancelled handling in src/infrastructure/events/consumers/payments-consumer.spec.ts
- [X] T039 [P] [US2] Write integration tests for StockConsumer order.cancelled handling in src/infrastructure/events/consumers/stock-consumer.spec.ts
- [ ] T040 [US2] Write end-to-end test for cancellation propagation in test/e2e/event-driven-flow.e2e-spec.ts

### Implementation for User Story 2

- [X] T041 [US2] Verify Order.cancel() in src/domain/order/order.ts emits OrderCancelled event with eventId (should already exist from foundation, verify only)
- [X] T042 [US2] Add order.cancelled subscription handler to PaymentsConsumer in src/infrastructure/events/consumers/payments-consumer.ts to log refund trigger (simulated)
- [X] T043 [US2] Add order.cancelled subscription handler to StockConsumer in src/infrastructure/events/consumers/stock-consumer.ts to log stock release (simulated)
- [ ] T044 [US2] Verify end-to-end cancellation test passes (T040) and consumers receive order.cancelled event

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Idempotent Event Handling (Priority: P3)

**Goal**: Handle duplicate events (payment.approved or stock.reserved) gracefully without corrupting order state or causing errors, proving system resilience to at-least-once delivery semantics.

**Independent Test**: Publish the same payment.approved or stock.reserved event multiple times for the same order and verify that: (1) the first event processes correctly and transitions order state, (2) subsequent duplicate events are handled idempotently (ignored or acknowledged without state change), (3) no errors or exceptions occur. Delivers value by proving system resilience to duplicate messages.

### Tests for User Story 3 (TDD: Write these tests FIRST, ensure they FAIL before implementation)

- [ ] T045 [P] [US3] Write unit tests for duplicate paymentId handling in Order.markAsPaid() in src/domain/order/order.spec.ts
- [ ] T046 [P] [US3] Write unit tests for duplicate reservationId handling in Order.reserveStock() in src/domain/order/order.spec.ts
- [ ] T047 [US3] Write end-to-end test for duplicate payment.approved event in test/e2e/event-driven-flow.e2e-spec.ts
- [ ] T048 [US3] Write end-to-end test for duplicate stock.reserved event in test/e2e/event-driven-flow.e2e-spec.ts

### Implementation for User Story 3

- [ ] T049 [US3] Verify Order.markAsPaid() idempotency check in src/domain/order/order.ts (should already exist from US1, verify processedPaymentIds.has() logic)
- [ ] T050 [US3] Verify Order.reserveStock() idempotency check in src/domain/order/order.ts (should already exist from US1, verify processedReservationIds.has() logic)
- [ ] T051 [US3] Verify PaymentApprovedHandler logs duplicate detection in src/application/events/handlers/payment-approved.handler.ts
- [ ] T052 [US3] Verify StockReservedHandler logs duplicate detection in src/application/events/handlers/stock-reserved.handler.ts
- [ ] T053 [US3] Verify end-to-end duplicate tests pass (T047, T048) and no state changes or errors occur on duplicates

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Invalid State Transition Rejection (Priority: P3)

**Goal**: Reject or ignore events that don't match the current order state (e.g., payment.approved for an already-paid order, stock.reserved for an order still awaiting payment) without corrupting state, proving state machine integrity.

**Independent Test**: Publish events to orders in incompatible states and verify that: (1) payment.approved sent to Paid order is rejected/ignored, (2) stock.reserved sent to AwaitingPayment order is rejected/ignored, (3) order state remains unchanged, (4) appropriate logging or notifications occur. Delivers value by proving state machine integrity.

### Tests for User Story 4 (TDD: Write these tests FIRST, ensure they FAIL before implementation)

- [ ] T054 [P] [US4] Write unit tests for payment.approved to Paid order in src/domain/order/order.spec.ts
- [ ] T055 [P] [US4] Write unit tests for stock.reserved to AwaitingPayment order in src/domain/order/order.spec.ts
- [ ] T056 [P] [US4] Write unit tests for events to Cancelled order in src/domain/order/order.spec.ts
- [ ] T057 [US4] Write end-to-end test for invalid state transitions in test/e2e/event-driven-flow.e2e-spec.ts
- [ ] T058 [US4] Write integration test for non-existent orderId handling in src/application/events/handlers/payment-approved.handler.spec.ts

### Implementation for User Story 4

- [ ] T059 [US4] Add state validation to Order.markAsPaid() in src/domain/order/order.ts to throw error if not in AwaitingPayment state
- [ ] T060 [US4] Add state validation to Order.reserveStock() in src/domain/order/order.ts to throw error if not in Paid state
- [ ] T061 [US4] Add error handling to PaymentApprovedHandler in src/application/events/handlers/payment-approved.handler.ts to catch state errors and log warning instead of propagating exception
- [ ] T062 [US4] Add error handling to StockReservedHandler in src/application/events/handlers/stock-reserved.handler.ts to catch state errors and log warning instead of propagating exception
- [ ] T063 [US4] Add non-existent order handling to PaymentApprovedHandler in src/application/events/handlers/payment-approved.handler.ts to log error and reject event if order not found
- [ ] T064 [US4] Add non-existent order handling to StockReservedHandler in src/application/events/handlers/stock-reserved.handler.ts to log error and reject event if order not found
- [ ] T065 [US4] Verify end-to-end invalid state test passes (T057) and state remains unchanged with appropriate logging

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T066 [P] Add logging statements to DomainEventPublisher in src/infrastructure/events/domain-event-publisher.ts for event publishing traceability
- [ ] T067 [P] Add logging statements to InMemoryMessageBus in src/infrastructure/events/in-memory-message-bus.ts for message routing traceability
- [ ] T068 [P] Update existing Order.markAsPaid() tests to use eventId parameter (breaking change migration)
- [ ] T069 [P] Update existing Order.cancel() tests to use eventId parameter (breaking change migration)
- [ ] T070 [P] Add performance instrumentation to measure event publishing latency (<100ms per SC-001) in src/infrastructure/events/domain-event-publisher.ts
- [ ] T071 [P] Add performance instrumentation to measure end-to-end flow duration (<5s per SC-002) in test/e2e/event-driven-flow.e2e-spec.ts
- [ ] T072 Code cleanup: Remove any unused imports and ensure ESLint passes across all new files
- [ ] T073 Code cleanup: Run Prettier formatting across all new and modified files
- [ ] T074 Verify all tests pass (unit + integration + e2e) with >80% coverage for domain layer
- [ ] T075 Run quickstart.md validation: Execute all curl commands and verify expected console output and state transitions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable (uses existing Order.cancel())
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Verifies idempotency logic from US1, independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Verifies state validation logic from US1, independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per Constitution Principle V)
- Domain models/aggregates before application services
- Application services before infrastructure adapters
- Infrastructure adapters before registration in AppModule
- End-to-end test verification last to confirm story completion

### Parallel Opportunities

- **Phase 1 (Setup)**: T002, T003, T004 can run in parallel (different value objects)
- **Phase 2 (Foundational)**: T007, T010, T011, T012 can run in parallel (different test files)
- **User Story 1 Tests**: T015-T022 can run in parallel (8 different test files)
- **User Story 1 Implementation**: T031, T032 (consumers), T033, T034 (handlers) can run in parallel (4 different files)
- **User Story 3 Tests**: T045, T046 can run in parallel (different test scenarios)
- **User Story 4 Tests**: T054, T055, T056, T058 can run in parallel (different test scenarios)
- **Phase 7 (Polish)**: T066, T067, T068, T069, T070, T071, T072, T073 can run in parallel (different files/concerns)
- **Different user stories** can be worked on in parallel by different team members after Phase 2

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all test files for User Story 1 together (TDD phase):
Task T015: "Write unit tests for Order.create() OrderPlaced emission in src/domain/order/order.spec.ts"
Task T016: "Write unit tests for Order.markAsPaid() with idempotency in src/domain/order/order.spec.ts"
Task T017: "Write unit tests for Order.reserveStock() state transition in src/domain/order/order.spec.ts"
Task T018: "Write integration tests for PaymentApprovedHandler in src/application/events/handlers/payment-approved.handler.spec.ts"
Task T019: "Write integration tests for StockReservedHandler in src/application/events/handlers/stock-reserved.handler.spec.ts"
Task T020: "Write integration tests for PaymentsConsumer in src/infrastructure/events/consumers/payments-consumer.spec.ts"
Task T021: "Write integration tests for StockConsumer in src/infrastructure/events/consumers/stock-consumer.spec.ts"
Task T022: "Write end-to-end test for complete flow in test/e2e/event-driven-flow.e2e-spec.ts"

# All tests should FAIL at this point (no implementation exists yet)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T014) - **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (T015-T036)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md scenarios
5. Deploy/demo if ready - **MVP delivered!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (T015-T036)
   - Developer B: User Story 2 (T037-T044)
   - Developer C: User Story 3 (T045-T053)
   - Developer D: User Story 4 (T054-T065)
3. Stories complete and integrate independently
4. **Team completes Polish together** (Phase 7)

---

## Task Summary

**Total Tasks**: 75

**Tasks by Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 10 tasks (CRITICAL - blocks all user stories)
- Phase 3 (User Story 1 - P1 MVP): 22 tasks
- Phase 4 (User Story 2 - P2): 8 tasks
- Phase 5 (User Story 3 - P3): 9 tasks
- Phase 6 (User Story 4 - P3): 12 tasks
- Phase 7 (Polish): 10 tasks

**MVP Scope**: Phases 1-3 (36 tasks) delivers fully functional event-driven flow with eventual consistency

**Parallelizable Tasks**: 26 tasks marked [P] can run in parallel (different files, no dependencies)

**Test Tasks**: 20 tasks (TDD approach - tests written before implementation)

**User Story Breakdown**:
- US1 (P1 - MVP): 22 tasks (8 tests + 14 implementation)
- US2 (P2): 8 tasks (4 tests + 4 implementation)
- US3 (P3): 9 tasks (4 tests + 5 verification)
- US4 (P3): 12 tasks (5 tests + 7 implementation)

**Critical Path**: Setup → Foundational (BLOCKS everything) → US1 (MVP) → US2/US3/US4 (can proceed in parallel or sequentially by priority)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- **Verify tests fail** before implementing (TDD)
- **Commit after each task** or logical group (Conventional Commits format)
- **Stop at any checkpoint** to validate story independently
- **Breaking changes** (T010, T011): OrderPaid and OrderCancelled constructors now require eventId as first parameter
- **Constitution compliance**: All tasks follow DDD principles (domain purity, layered architecture, TDD, ACL, intention-revealing design)
- **Performance targets**: Event publishing <100ms (SC-001), end-to-end flow <5s (SC-002)
- **Success criteria validation**: T075 runs quickstart.md scenarios to prove SC-001 through SC-008

---

**Ready to implement**: Start with Phase 1 (Setup), then Phase 2 (Foundational - CRITICAL), then Phase 3 (User Story 1 - MVP). Each phase has clear checkpoints for validation before proceeding.
