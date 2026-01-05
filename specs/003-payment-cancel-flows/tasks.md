# Tasks: Synchronous Payment and Order Cancellation Flows

**Input**: Design documents from `/specs/003-payment-cancel-flows/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This project follows TDD (Constitution Principle V). Tests MUST be written BEFORE implementation and verified to FAIL before writing code.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single NestJS backend application at repository root
- Domain layer: `src/domain/`
- Application layer: `src/application/`
- Infrastructure layer: `src/infrastructure/`
- Tests: Unit tests colocated with source (`__tests__/`), E2E tests in `test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Domain event infrastructure that all user stories depend on

- [X] T001 [P] Create base DomainEvent interface in src/domain/shared/domain-event.ts
- [X] T002 [P] Extend Order aggregate to collect domain events: add private _domainEvents array, getDomainEvents() and clearDomainEvents() methods in src/domain/order/order.ts
- [X] T003 [P] Create OrderPaid domain event in src/domain/order/events/order-paid.event.ts
- [X] T004 [P] Create OrderCancelled domain event in src/domain/order/events/order-cancelled.event.ts

**Checkpoint**: Domain event infrastructure ready - all user stories can now raise and collect events

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create PaymentGateway interface in src/application/order/gateways/payment-gateway.interface.ts
- [ ] T006 Create PaymentResult type in src/application/order/gateways/payment-result.ts
- [ ] T007 Implement StubbedPaymentGateway in src/infrastructure/order/gateways/stubbed-payment.gateway.ts with deterministic test patterns
- [ ] T008 Register PaymentGateway provider in OrderModule (src/infrastructure/order/order.module.ts)
- [ ] T009 [P] Create PayOrderDto (empty body) in src/application/order/dtos/pay-order.dto.ts
- [ ] T010 [P] Create CancelOrderDto with reason validation in src/application/order/dtos/cancel-order.dto.ts
- [ ] T011 [P] Extend OrderResponseDto to include paymentId and cancellationReason fields in src/application/order/dtos/order-response.dto.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Process Successful Payment (Priority: P1) 🎯 MVP

**Goal**: Enable payment processing for orders in AwaitingPayment state, transitioning them to Paid with payment ID recorded

**Independent Test**: Create order in AwaitingPayment, POST /orders/:id/pay, verify order transitions to Paid with paymentId populated

### Tests for User Story 1 ⚠️ WRITE FIRST

> **TDD**: Write these tests FIRST, ensure they FAIL, then implement

- [ ] T012 [P] [US1] Write unit test: Order.markAsPaid() transitions from AwaitingPayment to Paid in src/domain/order/__tests__/order.spec.ts
- [ ] T013 [P] [US1] Write unit test: Order.markAsPaid() raises OrderPaid event in src/domain/order/__tests__/order.spec.ts
- [ ] T014 [P] [US1] Write unit test: Order.markAsPaid() records paymentId in src/domain/order/__tests__/order.spec.ts
- [ ] T015 [P] [US1] Write integration test: ConfirmPaymentService with approved gateway response in src/application/order/services/__tests__/confirm-payment.service.spec.ts
- [ ] T016 [P] [US1] Write E2E test: POST /orders/:id/pay success (200) in test/order/order-payment.e2e-spec.ts

### Implementation for User Story 1

- [ ] T017 [US1] Update Order.markAsPaid() to raise OrderPaid event and add to _domainEvents array in src/domain/order/order.ts
- [ ] T018 [US1] Create ConfirmPaymentService with payment gateway orchestration in src/application/order/services/confirm-payment.service.ts
- [ ] T019 [US1] Add POST /orders/:id/pay endpoint to OrderController in src/infrastructure/order/controllers/order.controller.ts
- [ ] T020 [US1] Add error handling for successful payment (200 response with updated OrderResponseDto) in OrderController
- [ ] T021 [US1] Run tests and verify all User Story 1 tests pass

**Checkpoint**: User Story 1 complete and independently testable - orders can be paid successfully

---

## Phase 4: User Story 2 - Handle Payment Rejection (Priority: P1)

**Goal**: Gracefully handle payment gateway rejections, keeping order in AwaitingPayment and returning clear error messages

**Independent Test**: Create order, POST /orders/:id/pay with rejection pattern (orderId ending in "5"), verify order remains AwaitingPayment and 422 error returned

### Tests for User Story 2 ⚠️ WRITE FIRST

- [ ] T022 [P] [US2] Write unit test: Order remains in AwaitingPayment when markAsPaid not called in src/domain/order/__tests__/order.spec.ts
- [ ] T023 [P] [US2] Write integration test: ConfirmPaymentService with declined gateway response throws PaymentDeclinedError in src/application/order/services/__tests__/confirm-payment.service.spec.ts
- [ ] T024 [P] [US2] Write E2E test: POST /orders/:id/pay with rejection returns 422 with reason in test/order/order-payment.e2e-spec.ts

### Implementation for User Story 2

- [ ] T025 [US2] Create PaymentDeclinedError exception in src/application/order/exceptions/payment-declined.error.ts
- [ ] T026 [US2] Update ConfirmPaymentService to throw PaymentDeclinedError when gateway returns success: false in src/application/order/services/confirm-payment.service.ts
- [ ] T027 [US2] Add error handling for PaymentDeclinedError (422 UnprocessableEntityException) in OrderController POST /orders/:id/pay
- [ ] T028 [US2] Run tests and verify all User Story 2 tests pass

**Checkpoint**: Payment rejection handled gracefully - users get clear feedback on declined payments

---

## Phase 5: User Story 3 - Prevent Payment of Invalid Order States (Priority: P1)

**Goal**: Enforce state machine rules by rejecting payment attempts for orders not in AwaitingPayment (already Paid or Cancelled)

**Independent Test**: Create order in Paid state, POST /orders/:id/pay, verify 409 error; repeat with Cancelled state

### Tests for User Story 3 ⚠️ WRITE FIRST

- [ ] T029 [P] [US3] Write unit test: Order.markAsPaid() throws InvalidOrderStateTransitionError when already Paid in src/domain/order/__tests__/order.spec.ts
- [ ] T030 [P] [US3] Write unit test: Order.markAsPaid() throws InvalidOrderStateTransitionError when Cancelled in src/domain/order/__tests__/order.spec.ts
- [ ] T031 [P] [US3] Write E2E test: POST /orders/:id/pay on Paid order returns 409 in test/order/order-payment.e2e-spec.ts
- [ ] T032 [P] [US3] Write E2E test: POST /orders/:id/pay on Cancelled order returns 409 in test/order/order-payment.e2e-spec.ts

### Implementation for User Story 3

- [ ] T033 [US3] Verify Order.markAsPaid() already throws InvalidOrderStateTransitionError for invalid states (implemented in Stage 2) in src/domain/order/order.ts
- [ ] T034 [US3] Add error handling for InvalidOrderStateTransitionError (409 ConflictException) in OrderController POST /orders/:id/pay
- [ ] T035 [US3] Run tests and verify all User Story 3 tests pass

**Checkpoint**: State machine enforced - prevents duplicate payments and invalid state transitions

---

## Phase 6: User Story 4 - Cancel Order Before Payment (Priority: P1)

**Goal**: Allow cancellation of orders in AwaitingPayment state with required reason, transitioning to Cancelled

**Independent Test**: Create order in AwaitingPayment, POST /orders/:id/cancel with reason, verify order transitions to Cancelled with reason recorded

### Tests for User Story 4 ⚠️ WRITE FIRST

- [ ] T036 [P] [US4] Write unit test: Order.cancel() transitions from AwaitingPayment to Cancelled in src/domain/order/__tests__/order.spec.ts
- [ ] T037 [P] [US4] Write unit test: Order.cancel() raises OrderCancelled event with previousState="AwaitingPayment" in src/domain/order/__tests__/order.spec.ts
- [ ] T038 [P] [US4] Write unit test: Order.cancel() records cancellation reason in src/domain/order/__tests__/order.spec.ts
- [ ] T039 [P] [US4] Write unit test: Order.cancel() requires non-empty reason in src/domain/order/__tests__/order.spec.ts
- [ ] T040 [P] [US4] Write integration test: CancelOrderService with valid reason in src/application/order/services/__tests__/cancel-order.service.spec.ts
- [ ] T041 [P] [US4] Write E2E test: POST /orders/:id/cancel success (200) from AwaitingPayment in test/order/order-cancellation.e2e-spec.ts
- [ ] T042 [P] [US4] Write E2E test: POST /orders/:id/cancel with empty reason returns 400 in test/order/order-cancellation.e2e-spec.ts

### Implementation for User Story 4

- [ ] T043 [US4] Update Order.cancel() to raise OrderCancelled event with previousState and add to _domainEvents array in src/domain/order/order.ts
- [ ] T044 [US4] Update Order.cancel() to validate reason is non-empty and non-whitespace in src/domain/order/order.ts
- [ ] T045 [US4] Create CancelOrderService with cancellation orchestration in src/application/order/services/cancel-order.service.ts
- [ ] T046 [US4] Add POST /orders/:id/cancel endpoint to OrderController in src/infrastructure/order/controllers/order.controller.ts
- [ ] T047 [US4] Add error handling for successful cancellation (200 response) and validation errors (400/422) in OrderController
- [ ] T048 [US4] Run tests and verify all User Story 4 tests pass

**Checkpoint**: Pre-payment cancellation works - customers can cancel orders before paying

---

## Phase 7: User Story 5 - Cancel Paid Order (Priority: P2)

**Goal**: Allow cancellation of orders in Paid state (refund scenario), preserving payment ID for refund processing

**Independent Test**: Create order in Paid state (pay first), POST /orders/:id/cancel with reason, verify order transitions to Cancelled with paymentId preserved

### Tests for User Story 5 ⚠️ WRITE FIRST

- [ ] T049 [P] [US5] Write unit test: Order.cancel() transitions from Paid to Cancelled in src/domain/order/__tests__/order.spec.ts
- [ ] T050 [P] [US5] Write unit test: Order.cancel() raises OrderCancelled event with previousState="Paid" in src/domain/order/__tests__/order.spec.ts
- [ ] T051 [P] [US5] Write unit test: Order.cancel() preserves paymentId when cancelling Paid order in src/domain/order/__tests__/order.spec.ts
- [ ] T052 [P] [US5] Write E2E test: POST /orders/:id/cancel success (200) from Paid state preserves paymentId in test/order/order-cancellation.e2e-spec.ts

### Implementation for User Story 5

- [ ] T053 [US5] Verify Order.cancel() already allows cancellation from Paid state (implemented in Stage 2) in src/domain/order/order.ts
- [ ] T054 [US5] Verify OrderCancelled event includes previousState to distinguish refund scenario in src/domain/order/events/order-cancelled.event.ts
- [ ] T055 [US5] Run tests and verify all User Story 5 tests pass

**Checkpoint**: Post-payment cancellation works - customer service can cancel paid orders for refunds

---

## Phase 8: User Story 6 - Prevent Invalid Cancellations (Priority: P1)

**Goal**: Enforce state machine rules by rejecting cancellation attempts on already-cancelled orders, preserving original reason

**Independent Test**: Cancel order successfully, attempt to cancel again, verify 409 error with message indicating already cancelled

### Tests for User Story 6 ⚠️ WRITE FIRST

- [ ] T056 [P] [US6] Write unit test: Order.cancel() throws InvalidOrderStateTransitionError when already Cancelled in src/domain/order/__tests__/order.spec.ts
- [ ] T057 [P] [US6] Write unit test: Cancellation reason preserved when subsequent cancel attempt rejected in src/domain/order/__tests__/order.spec.ts
- [ ] T058 [P] [US6] Write E2E test: POST /orders/:id/cancel on already-Cancelled order returns 409 in test/order/order-cancellation.e2e-spec.ts

### Implementation for User Story 6

- [ ] T059 [US6] Verify Order.cancel() already throws InvalidOrderStateTransitionError when Cancelled (implemented in Stage 2) in src/domain/order/order.ts
- [ ] T060 [US6] Add error handling for InvalidOrderStateTransitionError (409 ConflictException) in OrderController POST /orders/:id/cancel
- [ ] T061 [US6] Run tests and verify all User Story 6 tests pass

**Checkpoint**: Cancellation state machine enforced - prevents duplicate cancellations

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Add error message formatting to include current order state in InvalidOrderStateTransitionError messages
- [ ] T063 [P] Add validation for whitespace-only cancellation reasons in CancelOrderService
- [ ] T064 [P] Add timeout handling (3 seconds) for payment gateway calls in ConfirmPaymentService
- [ ] T065 [P] Verify domain event publishing infrastructure (stub for now, will be implemented in Stage 4)
- [ ] T066 [P] Run full test suite and verify 100% pass rate: npm run test && npm run test:e2e
- [ ] T067 [P] Run linting and formatting: npm run lint && npm run format
- [ ] T068 [P] Verify build succeeds: npm run build
- [ ] T069 [P] Update quickstart.md examples with actual order IDs and test patterns
- [ ] T070 Document stubbed gateway test patterns (orderId ending patterns) in comments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if staffed)
  - OR sequentially in priority order: US1 → US2 → US3 → US4 → US6 → US5 (P2)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Payment Success)**: Can start after Foundational - No dependencies on other stories
- **US2 (Payment Rejection)**: Extends US1 - Can start after Foundational, shares ConfirmPaymentService
- **US3 (Invalid Payment States)**: Extends US1 - Can start after Foundational, shares payment endpoint
- **US4 (Cancel Unpaid)**: Can start after Foundational - Independent from payment stories
- **US5 (Cancel Paid)**: Depends on US1 (needs paid orders) - Can start after US1 complete
- **US6 (Invalid Cancellations)**: Extends US4/US5 - Can start after Foundational, shares cancel endpoint

### Within Each User Story

1. Tests MUST be written FIRST and verified to FAIL
2. Domain layer changes (Order aggregate, events)
3. Application layer changes (services)
4. Infrastructure layer changes (controllers, gateways)
5. Verify all tests PASS before moving to next story

### Parallel Opportunities

**Setup (Phase 1)**: All 4 tasks [P] - can run simultaneously
**Foundational (Phase 2)**: Tasks T005-T007 sequential (gateway depends on interface), T009-T011 all [P]
**User Story Tests**: All test tasks within a story marked [P] can run in parallel
**User Stories**: After Foundational complete:
  - US1, US2, US3 can run in parallel (all payment-related, different test scenarios)
  - US4, US6 can run in parallel (cancellation-related, different test scenarios)
  - US5 must wait for US1 (needs paid orders to test)
**Polish (Phase 9)**: All tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write all tests for US1 together (TDD Red phase):
Task T012: "Write unit test: Order.markAsPaid() transitions"
Task T013: "Write unit test: Order.markAsPaid() raises event"
Task T014: "Write unit test: Order.markAsPaid() records paymentId"
Task T015: "Write integration test: ConfirmPaymentService approved"
Task T016: "Write E2E test: POST /orders/:id/pay success"

# Verify all tests FAIL

# Then implement sequentially:
Task T017: Update Order.markAsPaid()
Task T018: Create ConfirmPaymentService
Task T019: Add controller endpoint
Task T020: Add error handling
Task T021: Verify all tests PASS
```

---

## Parallel Example: User Story 4

```bash
# Write all tests for US4 together (TDD Red phase):
Task T036: "Write unit test: Order.cancel() transitions"
Task T037: "Write unit test: Order.cancel() raises event"
Task T038: "Write unit test: Order.cancel() records reason"
Task T039: "Write unit test: Order.cancel() requires reason"
Task T040: "Write integration test: CancelOrderService"
Task T041: "Write E2E test: POST /orders/:id/cancel success"
Task T042: "Write E2E test: POST /orders/:id/cancel empty reason"

# Verify all tests FAIL

# Then implement sequentially:
Task T043: Update Order.cancel() with event
Task T044: Add reason validation
Task T045: Create CancelOrderService
Task T046: Add controller endpoint
Task T047: Add error handling
Task T048: Verify all tests PASS
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (domain events) → ~1 hour
2. Complete Phase 2: Foundational (gateway infrastructure) → ~2 hours
3. Complete Phase 3: User Story 1 (payment success) → ~3 hours
4. Complete Phase 4: User Story 2 (payment rejection) → ~2 hours
5. Complete Phase 5: User Story 3 (invalid payment states) → ~1 hour
6. **STOP and VALIDATE**: Test payment flow independently
7. **MVP COMPLETE**: Payment processing fully functional

**Estimated MVP Time**: 9 hours (1 working day)

### Full Feature (All User Stories)

1. Complete MVP (US1-US3) → 9 hours
2. Complete Phase 6: User Story 4 (cancel unpaid) → ~3 hours
3. Complete Phase 7: User Story 5 (cancel paid) → ~1 hour
4. Complete Phase 8: User Story 6 (invalid cancellations) → ~1 hour
5. Complete Phase 9: Polish → ~2 hours
6. **STOP and VALIDATE**: Test full payment + cancellation flows
7. **FEATURE COMPLETE**: All scenarios covered

**Estimated Full Time**: 16 hours (2 working days)

### Incremental Delivery

- **Increment 1** (MVP): Payment processing → Deploy/Demo
  - Users can pay for orders
  - Payment rejections handled
  - Invalid state transitions prevented
- **Increment 2**: Add pre-payment cancellation → Deploy/Demo
  - Users can cancel unpaid orders
- **Increment 3**: Add post-payment cancellation → Deploy/Demo
  - Customer service can cancel paid orders (refund scenario)
- **Increment 4**: Polish → Final deployment

### Parallel Team Strategy

With 2 developers after Foundational phase:

- **Developer A**: US1 → US2 → US3 (payment track) → 6 hours
- **Developer B**: US4 → US6 (cancellation track) → 4 hours
- **Both**: US5 (requires US1) → 1 hour
- **Both**: Polish → 2 hours

**Total with 2 devs**: ~9 hours (instead of 16 hours sequential)

---

## Notes

- **TDD Required**: Constitution Principle V mandates tests before implementation
- **[P] tasks**: Different files, no dependencies on incomplete work
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story independently testable**: Can deploy any story without others
- **Verify tests fail before implementing**: Red → Green → Refactor cycle
- **Commit after each task**: Atomic commits following Conventional Commits (Principle VIII)
- **Stop at any checkpoint**: Validate story independently before proceeding
- **Stubbed gateway patterns**: orderId ending "0" = approved, "5" = insufficient funds, "9" = card declined
- **Domain events stubbed**: Events raised but not published (publishing infrastructure comes in Stage 4)

---

## Task Count Summary

- **Total Tasks**: 70
- **Setup (Phase 1)**: 4 tasks
- **Foundational (Phase 2)**: 7 tasks
- **User Story 1**: 10 tasks (5 tests + 5 implementation)
- **User Story 2**: 7 tasks (3 tests + 4 implementation)
- **User Story 3**: 7 tasks (4 tests + 3 implementation)
- **User Story 4**: 13 tasks (7 tests + 6 implementation)
- **User Story 5**: 7 tasks (4 tests + 3 implementation)
- **User Story 6**: 6 tasks (3 tests + 3 implementation)
- **Polish (Phase 9)**: 9 tasks

**Parallel Opportunities**: 35 tasks marked [P] (50% parallelizable)

**MVP Scope** (Payment only): Phases 1-5 = 35 tasks (50% of total)

**Format Validation**: ✅ All tasks follow checklist format with ID, optional [P], required [Story] for US phases, and file paths

