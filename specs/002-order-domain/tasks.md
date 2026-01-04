# Tasks: Order Domain and Checkout Flow

**Input**: Design documents from `/specs/002-order-domain/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY per TDD Constitution requirement (Principle V). All tests MUST be written BEFORE implementation following Red-Green-Refactor cycle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single NestJS project with layered architecture (Domain/Application/Infrastructure)
- Domain layer: `src/domain/`
- Application layer: `src/application/`
- Infrastructure layer: `src/infrastructure/`
- E2E tests: `test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [X] T001 Verify project structure matches plan.md specifications
- [X] T002 [P] Verify existing quality gates (ESLint, Prettier, Jest, TypeScript strict mode)
- [X] T003 [P] Create domain layer directory structure per plan.md (aggregates, entities, value-objects, services, repositories, exceptions)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain value objects and exceptions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Value Objects (Foundation)

- [X] T004 [P] Write tests for Money value object in src/domain/value-objects/__tests__/money.spec.ts
- [X] T005 [P] Implement Money value object in src/domain/value-objects/money.ts (amount, currency, validation, operations)
- [X] T006 [P] Write tests for OrderId value object in src/domain/value-objects/__tests__/order-id.spec.ts
- [X] T007 [P] Implement OrderId value object in src/domain/value-objects/order-id.ts (UUID wrapper, generation)
- [X] T008 [P] Write tests for OrderStatus value object in src/domain/value-objects/__tests__/order-status.spec.ts
- [X] T009 [P] Implement OrderStatus value object in src/domain/value-objects/order-status.ts (AwaitingPayment, Paid, Cancelled)
- [X] T010 [P] Write tests for ProductSnapshot value object in src/domain/value-objects/__tests__/product-snapshot.spec.ts
- [X] T011 [P] Implement ProductSnapshot value object in src/domain/value-objects/product-snapshot.ts (name, description, SKU)
- [X] T012 [P] Write tests for ShippingAddress value object in src/domain/value-objects/__tests__/shipping-address.spec.ts
- [X] T013 [P] Implement ShippingAddress value object in src/domain/value-objects/shipping-address.ts (5 required fields validation)

### Domain Exceptions (Foundation)

- [X] T014 [P] Create InvalidOrderStateTransitionError in src/domain/exceptions/invalid-order-state-transition.error.ts
- [X] T015 [P] Create ProductDataUnavailableError in src/domain/exceptions/product-data-unavailable.error.ts
- [X] T016 [P] Create ProductPricingFailedError in src/domain/exceptions/product-pricing-failed.error.ts

**Checkpoint**: Foundation ready - value objects and exceptions complete. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Create Order from Cart (Priority: P1) 🎯 MVP

**Goal**: Transform a valid shopping cart into an order with captured product information and pricing in AwaitingPayment state

**Independent Test**: Submit valid cart with items and shipping address to checkout endpoint → order created in AwaitingPayment state with correct totals and product snapshots

### Tests for User Story 1 (TDD - Write FIRST)

> **CRITICAL: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US1] Write tests for OrderItem entity in src/domain/entities/__tests__/order-item.spec.ts
- [X] T018 [P] [US1] Write tests for Order aggregate (creation scenarios) in src/domain/aggregates/__tests__/order.spec.ts
- [X] T019 [P] [US1] Write tests for CatalogGateway contract validation in src/application/gateways/__tests__/catalog.gateway.spec.ts
- [X] T020 [P] [US1] Write tests for PricingGateway contract validation in src/application/gateways/__tests__/pricing.gateway.spec.ts
- [X] T021 [P] [US1] Write tests for OrderPricingService in src/domain/services/__tests__/order-pricing.service.spec.ts
- [X] T022 [P] [US1] Write tests for CheckoutService in src/application/services/__tests__/checkout.service.spec.ts
- [X] T023 [P] [US1] Write E2E test for successful checkout in test/order.e2e-spec.ts

### Domain Layer Implementation for User Story 1

- [X] T024 [US1] Implement OrderItem entity in src/domain/entities/order-item.ts (productSnapshot, quantity, pricing, lineTotal calculation)
- [X] T025 [US1] Implement Order aggregate creation logic in src/domain/aggregates/order.ts (factory method, initial state AwaitingPayment)
- [X] T026 [US1] Create OrderRepository interface in src/domain/repositories/order.repository.interface.ts (save, findById, findByCartId)

### Application Layer Implementation for User Story 1

- [X] T027 [P] [US1] Define CatalogGateway interface in src/application/gateways/catalog.gateway.interface.ts (getProductData, ProductData types)
- [X] T028 [P] [US1] Define PricingGateway interface in src/application/gateways/pricing.gateway.interface.ts (calculatePricing, PricingInput/Result types)
- [X] T029 [US1] Implement OrderPricingService in src/domain/services/order-pricing.service.ts (orchestrate catalog + pricing, return PricedOrderData)
- [X] T030 [P] [US1] Create CheckoutDTO in src/application/dtos/checkout.dto.ts (cartId, shippingAddress validation)
- [X] T031 [P] [US1] Create OrderResponseDTO in src/application/dtos/order-response.dto.ts (complete order representation)
- [X] T032 [P] [US1] Create OrderNotFoundException in src/application/exceptions/order-not-found.exception.ts
- [X] T033 [US1] Implement CheckoutService in src/application/services/checkout.service.ts (validate cart, call pricing service, create order, mark cart converted)

### Infrastructure Layer Implementation for User Story 1

- [X] T034 [P] [US1] Implement StubCatalogGateway in src/infrastructure/gateways/stub-catalog.gateway.ts (hardcoded products with timeout simulation)
- [X] T035 [P] [US1] Implement StubPricingGateway in src/infrastructure/gateways/stub-pricing.gateway.ts (hardcoded pricing with discount logic)
- [X] T036 [US1] Implement InMemoryOrderRepository in src/infrastructure/repositories/in-memory-order.repository.ts (in-memory Map storage)
- [X] T037 [US1] Implement OrderController checkout endpoint in src/infrastructure/controllers/order.controller.ts (POST /orders/checkout)
- [X] T038 [US1] Create OrderModule in src/infrastructure/modules/order.module.ts (DI wiring for all order components)
- [X] T039 [US1] Update AppModule in src/app.module.ts to import OrderModule

**Checkpoint**: User Story 1 complete - checkout creates orders in AwaitingPayment state with product snapshots and pricing

---

## Phase 4: User Story 2 - Reject Invalid Checkout Attempts (Priority: P1)

**Goal**: Prevent order creation from invalid cart states (empty carts, missing product data, missing prices, invalid addresses)

**Independent Test**: Attempt checkout with empty cart / missing product data / missing prices / incomplete address → system rejects with clear error messages

**Dependencies**: US1 must be complete (builds on checkout flow)

### Tests for User Story 2 (TDD - Write FIRST)

- [X] T040 [P] [US2] Write test for empty cart rejection in src/application/services/__tests__/checkout.service.spec.ts
- [X] T041 [P] [US2] Write test for missing product data error in src/domain/services/__tests__/order-pricing.service.spec.ts
- [X] T042 [P] [US2] Write test for missing price error in src/domain/services/__tests__/order-pricing.service.spec.ts
- [X] T043 [P] [US2] Write test for invalid shipping address in src/domain/value-objects/__tests__/shipping-address.spec.ts
- [X] T044 [P] [US2] Write E2E tests for invalid checkout scenarios in test/order.e2e-spec.ts (empty cart, pricing failures, invalid address)

### Implementation for User Story 2

- [X] T045 [P] [US2] Add empty cart validation in src/application/services/checkout.service.ts (check cart.items.length > 0)
- [X] T046 [P] [US2] Add product data unavailable error handling in src/domain/services/order-pricing.service.ts (catch ProductDataUnavailableError)
- [X] T047 [P] [US2] Add pricing failure error handling in src/domain/services/order-pricing.service.ts (catch ProductPricingFailedError)
- [X] T048 [P] [US2] Enhance ShippingAddress validation in src/domain/value-objects/shipping-address.ts (explicit field validation messages)
- [X] T049 [US2] Add error handling in OrderController in src/infrastructure/controllers/order.controller.ts (map domain exceptions to HTTP status codes)

**Checkpoint**: User Story 2 complete - invalid checkout attempts are rejected with clear error messages

---

## Phase 5: User Story 3 - Prevent Duplicate Orders from Same Cart (Priority: P1)

**Goal**: Subsequent checkout attempts on already-converted cart return existing order (idempotent behavior)

**Independent Test**: Successfully checkout a cart → attempt checkout same cart again → system returns existing order instead of creating duplicate

**Dependencies**: US1 must be complete (builds on checkout flow)

### Tests for User Story 3 (TDD - Write FIRST)

- [ ] T050 [P] [US3] Write test for cart already converted scenario in src/application/services/__tests__/checkout.service.spec.ts
- [ ] T051 [P] [US3] Write test for findByCartId repository method in src/infrastructure/repositories/__tests__/in-memory-order.repository.spec.ts
- [X] T052 [P] [US3] Write E2E test for duplicate checkout prevention in test/order.e2e-spec.ts

### Implementation for User Story 3

- [X] T053 [US3] Add isConverted check in CheckoutService in src/application/services/checkout.service.ts (if cart converted, return existing order)
- [X] T054 [US3] Implement findByCartId in InMemoryOrderRepository in src/infrastructure/repositories/in-memory-order.repository.ts
- [X] T055 [US3] Update ShoppingCart aggregate to track conversion in src/domain/aggregates/shopping-cart.ts (markAsConverted method, convertedOrderId field)

**Checkpoint**: User Story 3 complete - duplicate checkouts prevented via idempotent behavior

---

## Phase 6: User Story 4 - Mark Order as Paid (Priority: P2)

**Goal**: Transition order from AwaitingPayment to Paid state with payment ID recording

**Independent Test**: Create order in AwaitingPayment → mark as paid with payment ID → order transitions to Paid state with payment ID recorded

**Dependencies**: US1 must be complete (needs order creation)

### Tests for User Story 4 (TDD - Write FIRST)

- [X] T056 [P] [US4] Write tests for Order.markAsPaid() in src/domain/aggregates/__tests__/order.spec.ts (valid transition, already paid rejection, cancelled rejection)
- [ ] T057 [P] [US4] Write tests for OrderService.markAsPaid() in src/application/services/__tests__/order.service.spec.ts
- [X] T058 [P] [US4] Write E2E test for mark paid endpoint in test/order.e2e-spec.ts

### Domain Layer Implementation for User Story 4

- [X] T059 [US4] Implement Order.markAsPaid() in src/domain/aggregates/order.ts (state validation, transition to Paid, record paymentId)
- [X] T060 [US4] Implement Order.canBePaid() in src/domain/aggregates/order.ts (return true only if AwaitingPayment)

### Application Layer Implementation for User Story 4

- [X] T061 [P] [US4] Create MarkPaidDTO in src/application/dtos/mark-paid.dto.ts (paymentId validation)
- [X] T062 [US4] Implement OrderService.markAsPaid() in src/application/services/order.service.ts (load order, call markAsPaid, persist)

### Infrastructure Layer Implementation for User Story 4

- [X] T063 [US4] Implement mark paid endpoint in OrderController in src/infrastructure/controllers/order.controller.ts (POST /orders/:id/mark-paid)

**Checkpoint**: User Story 4 complete - orders can be marked as paid with state machine validation

---

## Phase 7: User Story 5 - Cancel Order with Reason (Priority: P2)

**Goal**: Cancel orders in AwaitingPayment or Paid states with cancellation reason recording

**Independent Test**: Create order → cancel with reason → order transitions to Cancelled state with reason recorded

**Dependencies**: US1 must be complete (needs order creation)

### Tests for User Story 5 (TDD - Write FIRST)

- [X] T064 [P] [US5] Write tests for Order.cancel() in src/domain/aggregates/__tests__/order.spec.ts (valid transitions from AwaitingPayment and Paid, already cancelled rejection)
- [ ] T065 [P] [US5] Write tests for OrderService.cancel() in src/application/services/__tests__/order.service.spec.ts
- [X] T066 [P] [US5] Write E2E test for cancel endpoint in test/order.e2e-spec.ts

### Domain Layer Implementation for User Story 5

- [X] T067 [US5] Implement Order.cancel() in src/domain/aggregates/order.ts (state validation, transition to Cancelled, record reason)
- [X] T068 [US5] Implement Order.canBeCancelled() in src/domain/aggregates/order.ts (return true if AwaitingPayment or Paid)

### Application Layer Implementation for User Story 5

- [X] T069 [P] [US5] Create CancelOrderDTO in src/application/dtos/cancel-order.dto.ts (reason validation, min 1 char)
- [X] T070 [US5] Implement OrderService.cancel() in src/application/services/order.service.ts (load order, call cancel, persist)

### Infrastructure Layer Implementation for User Story 5

- [X] T071 [US5] Implement cancel endpoint in OrderController in src/infrastructure/controllers/order.controller.ts (POST /orders/:id/cancel)

**Checkpoint**: User Story 5 complete - orders can be cancelled with reason recording

---

## Phase 8: User Story 6 - Handle State Transition Errors (Priority: P2)

**Goal**: Strict state machine enforcement with clear error messages for invalid transitions

**Independent Test**: Attempt invalid state transitions (pay cancelled order, cancel cancelled order, etc.) → system rejects with clear error messages

**Dependencies**: US4 and US5 must be complete (needs payment and cancellation methods)

### Tests for User Story 6 (TDD - Write FIRST)

- [X] T072 [P] [US6] Write comprehensive state machine tests in src/domain/aggregates/__tests__/order.spec.ts (all invalid transitions)
- [X] T073 [P] [US6] Write E2E tests for invalid state transitions in test/order.e2e-spec.ts

### Implementation for User Story 6

- [X] T074 [P] [US6] Enhance error messages in Order.markAsPaid() in src/domain/aggregates/order.ts (include current state in error)
- [X] T075 [P] [US6] Enhance error messages in Order.cancel() in src/domain/aggregates/order.ts (include current state in error)
- [X] T076 [US6] Add state preservation validation tests in src/domain/aggregates/__tests__/order.spec.ts (ensure state unchanged after failed transition)

**Checkpoint**: User Story 6 complete - state machine strictly enforced with clear error messages

---

## Phase 9: Additional Endpoints (Supporting Infrastructure)

**Purpose**: Supporting endpoints not tied to specific user stories

### Tests (TDD - Write FIRST)

- [ ] T077 [P] Write tests for GET /orders/:id endpoint in src/infrastructure/controllers/__tests__/order.controller.spec.ts
- [X] T078 [P] Write E2E test for get order by ID in test/order.e2e-spec.ts

### Implementation

- [X] T079 [P] Implement OrderService.findById() in src/application/services/order.service.ts
- [X] T080 [P] Implement GET /orders/:id endpoint in OrderController in src/infrastructure/controllers/order.controller.ts

**Checkpoint**: Supporting endpoints complete

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [ ] T081 [P] Run full test suite (npm run test && npm run test:e2e) and verify 100% pass rate
- [ ] T082 [P] Run linting (npm run lint) and fix any issues
- [ ] T083 [P] Run formatting (npm run format) on all files
- [ ] T084 [P] Run build (npm run build) and verify no TypeScript errors
- [ ] T085 [P] Validate all acceptance scenarios from spec.md manually
- [ ] T086 [P] Review code against constitution principles (domain layer purity, layered architecture, TDD evidence)
- [ ] T087 Create comprehensive commit following Conventional Commits format
- [ ] T088 [P] Update quickstart.md with any implementation learnings (if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on US1 completion (builds on checkout flow)
- **User Story 3 (Phase 5)**: Depends on US1 completion (builds on checkout flow)
- **User Story 4 (Phase 6)**: Depends on US1 completion (needs order creation)
- **User Story 5 (Phase 7)**: Depends on US1 completion (needs order creation)
- **User Story 6 (Phase 8)**: Depends on US4 and US5 completion (needs both payment and cancellation methods)
- **Additional Endpoints (Phase 9)**: Depends on US1 completion
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Independence

- **User Story 2 (P1)**: Can run in parallel with US3 after US1 complete
- **User Story 3 (P1)**: Can run in parallel with US2 after US1 complete
- **User Story 4 (P2)**: Can run in parallel with US5 after US1 complete
- **User Story 5 (P2)**: Can run in parallel with US4 after US1 complete

### Within Each User Story

1. Tests MUST be written FIRST and FAIL before implementation (TDD)
2. Domain layer before application layer before infrastructure layer
3. Value objects and entities before aggregates
4. Domain services before application services
5. Application services before controllers
6. Core implementation before edge cases

### Parallel Opportunities

- **Phase 1**: All tasks marked [P] can run in parallel
- **Phase 2**: All value object test+implementation pairs can run in parallel (T004-T013)
- **Phase 2**: All domain exception creation can run in parallel (T014-T016)
- **Within each user story**: All tasks marked [P] can run in parallel
- **After US1**: US2 and US3 can be worked on in parallel by different developers
- **After US1**: US4 and US5 can be worked on in parallel by different developers

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all test files for User Story 1 in parallel (all marked [P]):
Task T017: Write tests for OrderItem entity
Task T018: Write tests for Order aggregate creation
Task T019: Write tests for CatalogGateway contract
Task T020: Write tests for PricingGateway contract
Task T021: Write tests for OrderPricingService
Task T022: Write tests for CheckoutService
Task T023: Write E2E test for checkout
```

## Parallel Example: User Story 1 Application Layer

```bash
# Launch DTOs and gateway interfaces in parallel (all marked [P]):
Task T027: Define CatalogGateway interface
Task T028: Define PricingGateway interface
Task T030: Create CheckoutDTO
Task T031: Create OrderResponseDTO
Task T032: Create OrderNotFoundException
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 - All P1)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T016) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T017-T039) - Core checkout flow
4. **VALIDATE MVP**: Test checkout creates orders successfully
5. Complete Phase 4: User Story 2 (T040-T049) - Error handling
6. **VALIDATE**: Test invalid checkouts rejected
7. Complete Phase 5: User Story 3 (T050-T055) - Idempotency
8. **VALIDATE**: Test duplicate prevention
9. **MVP READY**: Deploy/demo checkout with validation

### Full Feature Delivery

1. Complete MVP (Phases 1-5)
2. Complete Phase 6: User Story 4 (T056-T063) - Payment marking
3. **VALIDATE**: Test payment state transitions
4. Complete Phase 7: User Story 5 (T064-T071) - Cancellation
5. **VALIDATE**: Test cancellation with reasons
6. Complete Phase 8: User Story 6 (T072-T076) - State machine errors
7. **VALIDATE**: Test all invalid transitions
8. Complete Phase 9: Additional Endpoints (T077-T080)
9. Complete Phase 10: Polish (T081-T088)
10. **FEATURE COMPLETE**: Full order lifecycle management

### Parallel Team Strategy

With 2-3 developers after Foundational phase (Phase 2) complete:

**Sprint 1 - MVP (P1 Stories)**:
- Developer A: User Story 1 (checkout) - T017-T039
- Developer B: User Story 2 (validation) - T040-T049 (wait for US1 core)
- Developer C: User Story 3 (idempotency) - T050-T055 (wait for US1 core)

**Sprint 2 - P2 Stories**:
- Developer A: User Story 4 (payment) - T056-T063
- Developer B: User Story 5 (cancellation) - T064-T071
- Developer C: User Story 6 (errors) - T072-T076 (wait for US4/US5)

**Sprint 3 - Polish**:
- All developers: Additional endpoints + Polish - T077-T088

---

## Task Count Summary

- **Total Tasks**: 88
- **Phase 1 - Setup**: 3 tasks
- **Phase 2 - Foundational**: 13 tasks (10 value objects, 3 exceptions)
- **Phase 3 - US1 (Create Order)**: 23 tasks (7 tests + 16 implementation)
- **Phase 4 - US2 (Validation)**: 10 tasks (5 tests + 5 implementation)
- **Phase 5 - US3 (Idempotency)**: 6 tasks (3 tests + 3 implementation)
- **Phase 6 - US4 (Payment)**: 8 tasks (3 tests + 5 implementation)
- **Phase 7 - US5 (Cancellation)**: 8 tasks (3 tests + 5 implementation)
- **Phase 8 - US6 (State Machine)**: 5 tasks (2 tests + 3 implementation)
- **Phase 9 - Endpoints**: 4 tasks (2 tests + 2 implementation)
- **Phase 10 - Polish**: 8 tasks

**Test Tasks**: 38 tasks (43% of total - reflects TDD requirement)
**Parallel Opportunities**: 45 tasks marked [P] (51% parallelizable)

---

## Notes

- [P] tasks = different files, no shared state dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability and independent testing
- Each user story phase is independently completable and testable
- **TDD MANDATORY**: Write tests FIRST, watch them FAIL, then implement
- Commit frequently following Conventional Commits format (feat:, test:, refactor:)
- Stop at any checkpoint to validate story independently
- Follow quickstart.md for implementation patterns and anti-patterns
- Maintain domain layer purity (no NestJS decorators in domain)
- All monetary values use Money value object (no primitive numbers)
- All identifiers use value objects (OrderId, CartId, etc.)
