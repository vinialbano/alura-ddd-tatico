# Implementation Tasks: Shopping Cart Domain Model

**Feature**: 001-shopping-cart-model
**Branch**: `001-shopping-cart-model`
**Stage**: 1 - Aggregates & Value Objects
**Date**: 2025-12-27

## Overview

This document provides a complete task breakdown for implementing the Shopping Cart domain model following **TDD (Test-Driven Development)** and **tactical DDD patterns**. Tasks are organized by user story to enable independent implementation and incremental delivery.

**Implementation Approach**: Tests are written BEFORE implementation code (Red-Green-Refactor cycle). Each user story represents a complete, independently testable increment of functionality.

## Task Organization

- **Phase 1**: Setup & Project Structure
- **Phase 2**: Foundational Components (blocking prerequisites for all user stories)
- **Phase 3**: User Story 1 - Add Products to Shopping Cart (P1) - **MVP**
- **Phase 4**: User Story 4 - Prevent Modification After Conversion (P1)
- **Phase 5**: User Story 2 - Update Item Quantities (P2)
- **Phase 6**: User Story 3 - Remove Items from Cart (P2)
- **Phase 7**: Polish & Cross-Cutting Concerns

**Legend**:
- `- [ ]` = Uncompleted task
- `[T###]` = Task ID (sequential execution order)
- `[P]` = Parallelizable (can run concurrently with other [P] tasks)
- `[US#]` = User Story reference (US1, US2, US3, US4)

---

## Phase 1: Setup & Project Structure

**Goal**: Initialize project directories and verify development environment

**Prerequisites**: None

**Tasks**:

- [X] T001 Create domain layer directory structure in src/domain/
- [X] T002 Create domain/value-objects directory in src/domain/value-objects/
- [X] T003 Create domain/entities directory in src/domain/entities/
- [X] T004 Create domain/aggregates directory in src/domain/aggregates/
- [X] T005 Create domain/repositories directory in src/domain/repositories/
- [X] T006 Create application layer directory structure in src/application/
- [X] T007 Create application/dtos directory in src/application/dtos/
- [X] T008 Create application/services directory in src/application/services/
- [X] T009 Create infrastructure layer directory structure in src/infrastructure/
- [X] T010 Create infrastructure/modules directory in src/infrastructure/modules/
- [X] T011 Create infrastructure/controllers directory in src/infrastructure/controllers/
- [X] T012 Create infrastructure/repositories directory in src/infrastructure/repositories/
- [X] T013 Create test directory structure in test/unit/
- [X] T014 Create test/unit/value-objects directory in test/unit/value-objects/
- [X] T015 Create test/integration directory in test/integration/
- [X] T016 Create test/e2e directory in test/e2e/
- [X] T017 Verify Jest configuration in package.json for test paths
- [X] T018 Verify TypeScript configuration enables strict mode in tsconfig.json
- [X] T019 Run npm install to verify dependencies
- [X] T020 Run npm test to verify test framework works
- [X] T021 Run npm run build to verify TypeScript compilation works
- [X] T022 Run npm run lint to verify ESLint configuration

---

## Phase 2: Foundational Components (Value Objects & Entity)

**Goal**: Implement core building blocks required by ALL user stories

**Why Foundational**: Value Objects (CartId, CustomerId, ProductId, Quantity) and CartItem entity are dependencies for the ShoppingCart aggregate used across all user stories. Must be completed before any user story implementation.

**Prerequisites**: Phase 1 complete

**Independent Test**: Value Objects and CartItem can be tested in isolation with unit tests. Success = all VOs validate correctly, CartItem manages quantity correctly.

### Value Object: CartId

**User Story**: N/A (Foundational)

- [X] T023 [P] Write test for CartId.create() generates unique UUID in test/unit/value-objects/cart-id.spec.ts
- [X] T024 [P] Write test for CartId.fromString() accepts valid UUID in test/unit/value-objects/cart-id.spec.ts
- [X] T025 [P] Write test for CartId.fromString() rejects empty string in test/unit/value-objects/cart-id.spec.ts
- [X] T026 [P] Write test for CartId.fromString() rejects invalid UUID format in test/unit/value-objects/cart-id.spec.ts
- [X] T027 [P] Write test for CartId.equals() returns true for same UUID in test/unit/value-objects/cart-id.spec.ts
- [X] T028 [P] Write test for CartId.equals() returns false for different UUIDs in test/unit/value-objects/cart-id.spec.ts
- [X] T029 Implement CartId value object with UUID validation in src/domain/value-objects/cart-id.ts
- [X] T030 Run tests and verify CartId passes all test cases
- [X] T031 Commit CartId tests with message "test: add CartId value object tests"
- [X] T032 Commit CartId implementation with message "feat: implement CartId value object"

### Value Object: CustomerId

**User Story**: N/A (Foundational)

- [X] T033 [P] Write test for CustomerId.fromString() accepts non-empty string in test/unit/value-objects/customer-id.spec.ts
- [X] T034 [P] Write test for CustomerId.fromString() rejects empty string in test/unit/value-objects/customer-id.spec.ts
- [X] T035 [P] Write test for CustomerId.fromString() rejects whitespace-only string in test/unit/value-objects/customer-id.spec.ts
- [X] T036 [P] Write test for CustomerId.fromString() trims whitespace in test/unit/value-objects/customer-id.spec.ts
- [X] T037 [P] Write test for CustomerId.equals() compares values correctly in test/unit/value-objects/customer-id.spec.ts
- [X] T038 Implement CustomerId value object with validation in src/domain/value-objects/customer-id.ts
- [X] T039 Run tests and verify CustomerId passes all test cases
- [X] T040 Commit CustomerId tests with message "test: add CustomerId value object tests"
- [X] T041 Commit CustomerId implementation with message "feat: implement CustomerId value object"

### Value Object: ProductId

**User Story**: N/A (Foundational)

- [X] T042 [P] Write test for ProductId.fromString() accepts non-empty string in test/unit/value-objects/product-id.spec.ts
- [X] T043 [P] Write test for ProductId.fromString() rejects empty string in test/unit/value-objects/product-id.spec.ts
- [X] T044 [P] Write test for ProductId.fromString() rejects whitespace-only string in test/unit/value-objects/product-id.spec.ts
- [X] T045 [P] Write test for ProductId.fromString() trims whitespace in test/unit/value-objects/product-id.spec.ts
- [X] T046 [P] Write test for ProductId.equals() compares values correctly in test/unit/value-objects/product-id.spec.ts
- [X] T047 Implement ProductId value object with validation in src/domain/value-objects/product-id.ts
- [X] T048 Run tests and verify ProductId passes all test cases
- [X] T049 Commit ProductId tests with message "test: add ProductId value object tests"
- [X] T050 Commit ProductId implementation with message "feat: implement ProductId value object"

### Value Object: Quantity

**User Story**: N/A (Foundational)

- [X] T051 [P] Write test for Quantity.of() accepts values 1-10 in test/unit/value-objects/quantity.spec.ts
- [X] T052 [P] Write test for Quantity.of() rejects value 0 in test/unit/value-objects/quantity.spec.ts
- [X] T053 [P] Write test for Quantity.of() rejects negative values in test/unit/value-objects/quantity.spec.ts
- [X] T054 [P] Write test for Quantity.of() rejects value 11 in test/unit/value-objects/quantity.spec.ts
- [X] T055 [P] Write test for Quantity.of() rejects fractional values in test/unit/value-objects/quantity.spec.ts
- [X] T056 [P] Write test for Quantity.add() returns new Quantity with sum in test/unit/value-objects/quantity.spec.ts
- [X] T057 [P] Write test for Quantity.add() throws when sum exceeds 10 in test/unit/value-objects/quantity.spec.ts
- [X] T058 [P] Write test for Quantity.equals() compares values correctly in test/unit/value-objects/quantity.spec.ts
- [X] T059 Implement Quantity value object with range validation in src/domain/value-objects/quantity.ts
- [X] T060 Run tests and verify Quantity passes all test cases
- [X] T061 Commit Quantity tests with message "test: add Quantity value object tests"
- [X] T062 Commit Quantity implementation with message "feat: implement Quantity value object"

### Entity: CartItem

**User Story**: N/A (Foundational)

- [X] T063 [P] Write test for CartItem.create() creates item with ProductId and Quantity in test/unit/cart-item.spec.ts
- [X] T064 [P] Write test for CartItem.getProductId() returns correct ProductId in test/unit/cart-item.spec.ts
- [X] T065 [P] Write test for CartItem.getQuantity() returns correct Quantity in test/unit/cart-item.spec.ts
- [X] T066 [P] Write test for CartItem.updateQuantity() replaces quantity in test/unit/cart-item.spec.ts
- [X] T067 [P] Write test for CartItem.addQuantity() adds to existing quantity in test/unit/cart-item.spec.ts
- [X] T068 [P] Write test for CartItem.addQuantity() throws when result exceeds 10 in test/unit/cart-item.spec.ts
- [X] T069 Implement CartItem entity in src/domain/entities/cart-item.ts
- [X] T070 Run tests and verify CartItem passes all test cases
- [X] T071 Commit CartItem tests with message "test: add CartItem entity tests"
- [X] T072 Commit CartItem implementation with message "feat: implement CartItem entity"

---

## Phase 3: User Story 1 - Add Products to Shopping Cart (P1) - MVP

**Story Goal**: Allow customers to add products to their cart with quantity consolidation for duplicates

**Priority**: P1 (Highest) - This is the foundational cart behavior and represents the MVP

**Why This Priority**: Without the ability to add items, no other cart functionality can be used. This represents the core value proposition and delivers immediate customer value.

**Prerequisites**: Phase 2 complete (all Value Objects and CartItem)

**Independent Test**: Create a cart, add products with various quantities, verify items appear with correct quantities. Test consolidation by adding duplicate products. Delivers value by allowing customers to collect items before checkout.

**Acceptance Criteria**:
- Empty cart can accept new products with quantity
- Adding duplicate product consolidates quantities (single line item)
- Different products create separate line items
- Reject invalid quantities (0 or negative)
- Reject exceeding 20 unique products
- Reject consolidation that exceeds quantity limit of 10

### Aggregate: ShoppingCart (US1 Behaviors)

**User Story**: US1

- [X] T073 [US1] Write test for ShoppingCart.create() creates empty active cart in test/unit/shopping-cart.spec.ts
- [X] T074 [US1] Write test for ShoppingCart.create() requires CustomerId in test/unit/shopping-cart.spec.ts
- [X] T075 [US1] Write test for ShoppingCart.addItem() adds new product to empty cart in test/unit/shopping-cart.spec.ts
- [X] T076 [US1] Write test for ShoppingCart.addItem() consolidates quantity for duplicate product in test/unit/shopping-cart.spec.ts
- [X] T077 [US1] Write test for ShoppingCart.addItem() creates separate line for different product in test/unit/shopping-cart.spec.ts
- [X] T078 [US1] Write test for ShoppingCart.addItem() rejects invalid quantity in test/unit/shopping-cart.spec.ts
- [X] T079 [US1] Write test for ShoppingCart.addItem() throws MaxProductsExceededError when adding 21st product in test/unit/shopping-cart.spec.ts
- [X] T080 [US1] Write test for ShoppingCart.addItem() throws InvalidQuantityError when consolidation exceeds 10 in test/unit/shopping-cart.spec.ts
- [X] T081 [US1] Write test for ShoppingCart.getItems() returns defensive copy as array in test/unit/shopping-cart.spec.ts
- [X] T082 [US1] Write test for ShoppingCart.getItemCount() returns correct count in test/unit/shopping-cart.spec.ts
- [X] T083 [US1] Implement ShoppingCart aggregate with addItem() method in src/domain/aggregates/shopping-cart.ts
- [X] T084 [US1] Implement ensureWithinProductLimit() private method for max products check in src/domain/aggregates/shopping-cart.ts
- [X] T085 [US1] Implement quantity consolidation logic in addItem() in src/domain/aggregates/shopping-cart.ts
- [X] T086 [US1] Run tests and verify ShoppingCart US1 behaviors pass
- [X] T087 [US1] Commit ShoppingCart US1 tests with message "test(US1): add ShoppingCart addItem tests"
- [X] T088 [US1] Commit ShoppingCart US1 implementation with message "feat(US1): implement ShoppingCart addItem with consolidation"

### Repository Interface

**User Story**: US1

- [ ] T089 [US1] Define ShoppingCartRepository interface in src/domain/repositories/shopping-cart.repository.interface.ts
- [ ] T090 [US1] Commit repository interface with message "feat(US1): define ShoppingCartRepository interface"

### Application Layer (US1)

**User Story**: US1

- [ ] T091 [P] [US1] Create AddItemDto in src/application/dtos/add-item.dto.ts
- [ ] T092 [P] [US1] Create CreateCartDto in src/application/dtos/create-cart.dto.ts
- [ ] T093 [P] [US1] Create CartResponseDto in src/application/dtos/cart-response.dto.ts
- [ ] T094 [P] [US1] Create CartItemResponseDto in src/application/dtos/cart-response.dto.ts
- [ ] T095 [US1] Commit DTOs with message "feat(US1): create DTOs for cart creation and adding items"

- [ ] T096 [US1] Write integration test for CartService.createCart() in test/integration/cart.service.spec.ts
- [ ] T097 [US1] Write integration test for CartService.addItem() in test/integration/cart.service.spec.ts
- [ ] T098 [US1] Write integration test for CartService.addItem() with consolidation in test/integration/cart.service.spec.ts
- [ ] T099 [US1] Write integration test for CartService.getCart() in test/integration/cart.service.spec.ts
- [ ] T100 [US1] Implement CartService with createCart() method in src/application/services/cart.service.ts
- [ ] T101 [US1] Implement CartService.addItem() orchestration in src/application/services/cart.service.ts
- [ ] T102 [US1] Implement CartService.getCart() query in src/application/services/cart.service.ts
- [ ] T103 [US1] Implement DTO mapping helpers in CartService in src/application/services/cart.service.ts
- [ ] T104 [US1] Run integration tests and verify CartService US1 passes
- [ ] T105 [US1] Commit CartService tests with message "test(US1): add CartService integration tests"
- [ ] T106 [US1] Commit CartService implementation with message "feat(US1): implement CartService with cart creation and item addition"

### Infrastructure Layer (US1)

**User Story**: US1

- [ ] T107 [US1] Implement InMemoryShoppingCartRepository.save() in src/infrastructure/repositories/in-memory-shopping-cart.repository.ts
- [ ] T108 [US1] Implement InMemoryShoppingCartRepository.findById() in src/infrastructure/repositories/in-memory-shopping-cart.repository.ts
- [ ] T109 [US1] Implement InMemoryShoppingCartRepository.findByCustomerId() in src/infrastructure/repositories/in-memory-shopping-cart.repository.ts
- [ ] T110 [US1] Commit repository implementation with message "feat(US1): implement InMemoryShoppingCartRepository"

- [ ] T111 [US1] Write e2e test for POST /carts (create cart) in test/e2e/cart.e2e-spec.ts
- [ ] T112 [US1] Write e2e test for POST /carts/:id/items (add item) in test/e2e/cart.e2e-spec.ts
- [ ] T113 [US1] Write e2e test for POST /carts/:id/items with duplicate product in test/e2e/cart.e2e-spec.ts
- [ ] T114 [US1] Write e2e test for GET /carts/:id in test/e2e/cart.e2e-spec.ts
- [ ] T115 [US1] Write e2e test for POST /carts/:id/items rejecting 21st product in test/e2e/cart.e2e-spec.ts
- [ ] T116 [US1] Implement CartController.createCart() endpoint in src/infrastructure/controllers/cart.controller.ts
- [ ] T117 [US1] Implement CartController.addItem() endpoint in src/infrastructure/controllers/cart.controller.ts
- [ ] T118 [US1] Implement CartController.getCart() endpoint in src/infrastructure/controllers/cart.controller.ts
- [ ] T119 [US1] Run e2e tests and verify US1 endpoints pass
- [ ] T120 [US1] Commit e2e tests with message "test(US1): add e2e tests for cart creation and item addition"
- [ ] T121 [US1] Commit controller with message "feat(US1): implement CartController with cart creation and item endpoints"

- [ ] T122 [US1] Create CartModule wiring Controller, Service, Repository in src/infrastructure/modules/cart.module.ts
- [ ] T123 [US1] Register CartModule in app.module.ts
- [ ] T124 [US1] Commit module with message "feat(US1): wire CartModule dependencies"

### US1 Validation

**User Story**: US1

- [ ] T125 [US1] Run full test suite (npm test) and verify all US1 tests pass
- [ ] T126 [US1] Run e2e tests (npm run test:e2e) and verify US1 endpoints work
- [ ] T127 [US1] Manually test: Create cart → Add item → Verify response
- [ ] T128 [US1] Manually test: Add duplicate product → Verify consolidation
- [ ] T129 [US1] Manually test: Add 21 products → Verify rejection
- [ ] T130 [US1] Run quality gates (lint, format, build)
- [ ] T131 [US1] Commit final integration with message "feat(US1): complete add products to cart feature"

---

## Phase 4: User Story 4 - Prevent Modification After Conversion (P1)

**Story Goal**: Ensure cart immutability after conversion to prevent data inconsistencies

**Priority**: P1 (High) - Critical for business integrity and data consistency

**Why This Priority**: If carts can be modified after conversion, it creates data inconsistencies, potential financial discrepancies, and confusion about what was actually ordered. This is a fundamental invariant that must be enforced.

**Prerequisites**: Phase 3 complete (US1 - cart creation and item addition)

**Independent Test**: Convert a cart to an order, then attempt to add, update, or remove items. All operations should be rejected. Delivers value by preventing data corruption and maintaining audit trails.

**Acceptance Criteria**:
- Cannot add items to converted cart
- Cannot update quantities in converted cart
- Cannot remove items from converted cart
- Cannot convert empty cart
- Active cart can be converted when it has items

### Aggregate: ShoppingCart (US4 Behaviors)

**User Story**: US4

- [X] T132 [US4] Write test for ShoppingCart.markAsConverted() marks cart as converted in test/unit/shopping-cart.spec.ts
- [X] T133 [US4] Write test for ShoppingCart.markAsConverted() throws EmptyCartError when cart is empty in test/unit/shopping-cart.spec.ts
- [X] T134 [US4] Write test for ShoppingCart.isConverted() returns true after conversion in test/unit/shopping-cart.spec.ts
- [X] T135 [US4] Write test for ShoppingCart.addItem() throws CartAlreadyConvertedError on converted cart in test/unit/shopping-cart.spec.ts
- [X] T136 [US4] Implement ShoppingCart.markAsConverted() method in src/domain/aggregates/shopping-cart.ts
- [X] T137 [US4] Implement ensureNotConverted() private guard method in src/domain/aggregates/shopping-cart.ts
- [X] T138 [US4] Add ensureNotConverted() check to addItem() method in src/domain/aggregates/shopping-cart.ts
- [X] T139 [US4] Run tests and verify ShoppingCart US4 behaviors pass
- [X] T140 [US4] Commit ShoppingCart US4 tests with message "test(US4): add cart conversion immutability tests"
- [X] T141 [US4] Commit ShoppingCart US4 implementation with message "feat(US4): implement cart conversion with immutability enforcement"

### Application Layer (US4)

**User Story**: US4

- [X] T142 [US4] Write integration test for CartService.markAsConverted() in test/integration/cart.service.spec.ts
- [X] T143 [US4] Write integration test for CartService.addItem() rejection after conversion in test/integration/cart.service.spec.ts
- [X] T144 [US4] Implement CartService.markAsConverted() orchestration in src/application/services/cart.service.ts
- [X] T145 [US4] Run integration tests and verify CartService US4 passes
- [X] T146 [US4] Commit CartService US4 tests with message "test(US4): add CartService conversion tests"
- [X] T147 [US4] Commit CartService US4 implementation with message "feat(US4): implement CartService conversion method"

### Infrastructure Layer (US4)

**User Story**: US4

- [X] T148 [US4] Write e2e test for POST /carts/:id/convert in test/e2e/cart.e2e-spec.ts
- [X] T149 [US4] Write e2e test for POST /carts/:id/convert rejecting empty cart in test/e2e/cart.e2e-spec.ts
- [X] T150 [US4] Write e2e test for POST /carts/:id/items rejecting after conversion in test/e2e/cart.e2e-spec.ts
- [X] T151 [US4] Implement CartController.markAsConverted() endpoint in src/infrastructure/controllers/cart.controller.ts
- [X] T152 [US4] Run e2e tests and verify US4 endpoints pass
- [X] T153 [US4] Commit e2e tests with message "test(US4): add e2e tests for cart conversion"
- [X] T154 [US4] Commit controller with message "feat(US4): implement cart conversion endpoint"

### US4 Validation

**User Story**: US4

- [X] T155 [US4] Run full test suite and verify all US4 tests pass
- [X] T156 [US4] Manually test: Convert cart with items → Verify success
- [X] T157 [US4] Manually test: Convert empty cart → Verify rejection
- [X] T158 [US4] Manually test: Add item to converted cart → Verify rejection
- [X] T159 [US4] Run quality gates (lint, format, build)
- [X] T160 [US4] Commit final integration with message "feat(US4): complete cart conversion immutability feature"

---

## Phase 5: User Story 2 - Update Item Quantities (P2)

**Story Goal**: Allow customers to modify quantities of items already in their cart

**Priority**: P2 (Medium) - Improves UX but not critical for MVP

**Why This Priority**: Common scenario where customers adjust purchase decisions. Not absolutely critical (they could remove and re-add), but significantly improves user experience and reduces friction.

**Prerequisites**: Phase 3 complete (US1), Phase 4 complete (US4) - needs cart creation, item addition, and conversion immutability

**Independent Test**: Create cart with items, update quantities, verify changes persist correctly. Test rejection scenarios (non-existent products, invalid quantities, converted carts). Delivers value by allowing quantity adjustments without starting over.

**Acceptance Criteria**:
- Can update quantity of existing item
- Can increase or decrease quantity (within 1-10 range)
- Reject updating non-existent products
- Reject invalid quantities (0, negative, > 10)
- Reject updates on converted carts

### Aggregate: ShoppingCart (US2 Behaviors)

**User Story**: US2

- [ ] T161 [P] [US2] Write test for ShoppingCart.updateItemQuantity() updates existing item in test/unit/shopping-cart.spec.ts
- [ ] T162 [P] [US2] Write test for ShoppingCart.updateItemQuantity() throws ProductNotInCartError for non-existent product in test/unit/shopping-cart.spec.ts
- [ ] T163 [P] [US2] Write test for ShoppingCart.updateItemQuantity() throws CartAlreadyConvertedError on converted cart in test/unit/shopping-cart.spec.ts
- [ ] T164 [P] [US2] Write test for ShoppingCart.updateItemQuantity() rejects invalid quantity in test/unit/shopping-cart.spec.ts
- [ ] T165 [US2] Implement ShoppingCart.updateItemQuantity() method in src/domain/aggregates/shopping-cart.ts
- [ ] T166 [US2] Run tests and verify ShoppingCart US2 behaviors pass
- [ ] T167 [US2] Commit ShoppingCart US2 tests with message "test(US2): add update item quantity tests"
- [ ] T168 [US2] Commit ShoppingCart US2 implementation with message "feat(US2): implement update item quantity"

### Application Layer (US2)

**User Story**: US2

- [ ] T169 [P] [US2] Create UpdateQuantityDto in src/application/dtos/update-quantity.dto.ts
- [ ] T170 [US2] Commit DTO with message "feat(US2): create UpdateQuantityDto"

- [ ] T171 [US2] Write integration test for CartService.updateItemQuantity() in test/integration/cart.service.spec.ts
- [ ] T172 [US2] Write integration test for CartService.updateItemQuantity() rejection scenarios in test/integration/cart.service.spec.ts
- [ ] T173 [US2] Implement CartService.updateItemQuantity() orchestration in src/application/services/cart.service.ts
- [ ] T174 [US2] Run integration tests and verify CartService US2 passes
- [ ] T175 [US2] Commit CartService US2 tests with message "test(US2): add CartService update quantity tests"
- [ ] T176 [US2] Commit CartService US2 implementation with message "feat(US2): implement CartService update quantity method"

### Infrastructure Layer (US2)

**User Story**: US2

- [ ] T177 [US2] Write e2e test for PUT /carts/:id/items/:productId in test/e2e/cart.e2e-spec.ts
- [ ] T178 [US2] Write e2e test for PUT rejecting non-existent product in test/e2e/cart.e2e-spec.ts
- [ ] T179 [US2] Write e2e test for PUT rejecting invalid quantity in test/e2e/cart.e2e-spec.ts
- [ ] T180 [US2] Write e2e test for PUT rejecting on converted cart in test/e2e/cart.e2e-spec.ts
- [ ] T181 [US2] Implement CartController.updateItemQuantity() endpoint in src/infrastructure/controllers/cart.controller.ts
- [ ] T182 [US2] Run e2e tests and verify US2 endpoints pass
- [ ] T183 [US2] Commit e2e tests with message "test(US2): add e2e tests for update quantity"
- [ ] T184 [US2] Commit controller with message "feat(US2): implement update item quantity endpoint"

### US2 Validation

**User Story**: US2

- [ ] T185 [US2] Run full test suite and verify all US2 tests pass
- [ ] T186 [US2] Manually test: Update item quantity → Verify change persists
- [ ] T187 [US2] Manually test: Update non-existent product → Verify rejection
- [ ] T188 [US2] Manually test: Update to invalid quantity → Verify rejection
- [ ] T189 [US2] Manually test: Update on converted cart → Verify rejection
- [ ] T190 [US2] Run quality gates (lint, format, build)
- [ ] T191 [US2] Commit final integration with message "feat(US2): complete update item quantities feature"

---

## Phase 6: User Story 3 - Remove Items from Cart (P2)

**Story Goal**: Allow customers to completely remove items from their cart

**Priority**: P2 (Medium) - Essential for cart management but workaround exists

**Why This Priority**: Essential for cart management but slightly lower priority than adding items. Customers can work around this by adjusting quantities to zero if necessary, but explicit removal is cleaner.

**Prerequisites**: Phase 3 complete (US1), Phase 4 complete (US4) - needs cart creation, item addition, and conversion immutability

**Independent Test**: Create cart with items, remove specific items, verify they no longer appear. Test rejection scenarios (non-existent products, empty carts, converted carts). Delivers value by allowing customers to manage cart contents.

**Acceptance Criteria**:
- Can remove existing item from cart
- Cart can become empty after removing last item
- Reject removing non-existent products
- Reject removing from empty cart
- Reject removal on converted carts

### Aggregate: ShoppingCart (US3 Behaviors)

**User Story**: US3

- [ ] T192 [P] [US3] Write test for ShoppingCart.removeItem() removes existing item in test/unit/shopping-cart.spec.ts
- [ ] T193 [P] [US3] Write test for ShoppingCart.removeItem() makes cart empty when removing last item in test/unit/shopping-cart.spec.ts
- [ ] T194 [P] [US3] Write test for ShoppingCart.removeItem() throws ProductNotInCartError for non-existent product in test/unit/shopping-cart.spec.ts
- [ ] T195 [P] [US3] Write test for ShoppingCart.removeItem() throws CartAlreadyConvertedError on converted cart in test/unit/shopping-cart.spec.ts
- [ ] T196 [US3] Implement ShoppingCart.removeItem() method in src/domain/aggregates/shopping-cart.ts
- [ ] T197 [US3] Run tests and verify ShoppingCart US3 behaviors pass
- [ ] T198 [US3] Commit ShoppingCart US3 tests with message "test(US3): add remove item tests"
- [ ] T199 [US3] Commit ShoppingCart US3 implementation with message "feat(US3): implement remove item"

### Application Layer (US3)

**User Story**: US3

- [ ] T200 [US3] Write integration test for CartService.removeItem() in test/integration/cart.service.spec.ts
- [ ] T201 [US3] Write integration test for CartService.removeItem() rejection scenarios in test/integration/cart.service.spec.ts
- [ ] T202 [US3] Implement CartService.removeItem() orchestration in src/application/services/cart.service.ts
- [ ] T203 [US3] Run integration tests and verify CartService US3 passes
- [ ] T204 [US3] Commit CartService US3 tests with message "test(US3): add CartService remove item tests"
- [ ] T205 [US3] Commit CartService US3 implementation with message "feat(US3): implement CartService remove item method"

### Infrastructure Layer (US3)

**User Story**: US3

- [ ] T206 [US3] Write e2e test for DELETE /carts/:id/items/:productId in test/e2e/cart.e2e-spec.ts
- [ ] T207 [US3] Write e2e test for DELETE rejecting non-existent product in test/e2e/cart.e2e-spec.ts
- [ ] T208 [US3] Write e2e test for DELETE rejecting on converted cart in test/e2e/cart.e2e-spec.ts
- [ ] T209 [US3] Implement CartController.removeItem() endpoint in src/infrastructure/controllers/cart.controller.ts
- [ ] T210 [US3] Run e2e tests and verify US3 endpoints pass
- [ ] T211 [US3] Commit e2e tests with message "test(US3): add e2e tests for remove item"
- [ ] T212 [US3] Commit controller with message "feat(US3): implement remove item endpoint"

### US3 Validation

**User Story**: US3

- [ ] T213 [US3] Run full test suite and verify all US3 tests pass
- [ ] T214 [US3] Manually test: Remove item from cart → Verify removal
- [ ] T215 [US3] Manually test: Remove last item → Verify cart becomes empty
- [ ] T216 [US3] Manually test: Remove non-existent product → Verify rejection
- [ ] T217 [US3] Manually test: Remove from converted cart → Verify rejection
- [ ] T218 [US3] Run quality gates (lint, format, build)
- [ ] T219 [US3] Commit final integration with message "feat(US3): complete remove items feature"

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Finalize implementation with error handling, documentation, and quality improvements

**Prerequisites**: All user stories (Phase 3-6) complete

**Tasks**:

- [ ] T220 Create domain exception classes in src/domain/exceptions/ or inline
- [ ] T221 Implement CartAlreadyConvertedError exception
- [ ] T222 Implement MaxProductsExceededError exception
- [ ] T223 Implement InvalidQuantityError exception
- [ ] T224 Implement ProductNotInCartError exception
- [ ] T225 Implement EmptyCartError exception
- [ ] T226 Commit exceptions with message "feat: implement domain exception classes"

- [ ] T227 Add error handling middleware to CartController for domain exceptions
- [ ] T228 Map domain exceptions to appropriate HTTP status codes (400, 409, etc.)
- [ ] T229 Test error responses in e2e tests
- [ ] T230 Commit error handling with message "feat: add domain exception error handling"

- [ ] T231 Add JSDoc comments to all public methods in domain layer
- [ ] T232 Add JSDoc comments to CartService public methods
- [ ] T233 Add JSDoc comments to CartController endpoints
- [ ] T234 Commit documentation with message "docs: add JSDoc comments to public APIs"

- [ ] T235 Run full test suite (npm test) and verify 100% pass
- [ ] T236 Run e2e tests (npm run test:e2e) and verify all scenarios pass
- [ ] T237 Run lint (npm run lint) and fix any warnings
- [ ] T238 Run format (npm run format) on all source files
- [ ] T239 Run build (npm run build) and verify clean compilation
- [ ] T240 Verify test coverage meets project standards
- [ ] T241 Commit final polish with message "chore: final quality gates and documentation"

---

## Dependencies & Execution Strategy

### Dependency Graph (User Story Completion Order)

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational Components) [BLOCKING]
    ↓
    ├──→ Phase 3 (US1 - Add Items) [MVP] ← Start here
    │        ↓
    │    Phase 4 (US4 - Conversion) [Must have US1]
    │        ↓
    │    ┌───┴───────┐
    │    ↓           ↓
    │ Phase 5     Phase 6
    │ (US2 -      (US3 -
    │  Update)    Remove)
    │    │           │
    │    └───┬───────┘
    │        ↓
    └──→ Phase 7 (Polish)
```

**Explanation**:
- **Phase 2 (Foundational)**: MUST complete before any user story - provides Value Objects and CartItem
- **Phase 3 (US1)**: MVP - First user story, enables cart creation and adding items
- **Phase 4 (US4)**: Depends on US1 (needs cart + items to test conversion)
- **Phase 5 (US2) & Phase 6 (US3)**: Can run in parallel after US4 complete
- **Phase 7**: Runs after all user stories complete

### Parallel Execution Opportunities

#### Within Foundational Phase (Phase 2):
```bash
# Value Objects can be implemented in parallel (tasks T023-T062)
Developer 1: CartId (T023-T032) || Developer 2: CustomerId (T033-T041)
Developer 1: ProductId (T042-T050) || Developer 2: Quantity (T051-T062)
Then: CartItem (T063-T072) - requires VOs complete
```

#### Within Each User Story Phase:
```bash
# Test writing tasks are parallelizable before implementation
Phase 3 (US1):
  - Parallel: Write all unit tests (T073-T082)
  - Sequential: Implement aggregate (T083-T088)
  - Parallel: Create DTOs (T091-T094)
  - Sequential: CartService implementation (T096-T106)
  - Sequential: Infrastructure (T107-T124)

Phase 4 (US4):
  - Parallel: Write tests (T132-T135)
  - Sequential: Implement (T136-T141)
  - Sequential: Application/Infrastructure (T142-T154)

Phase 5 (US2) & Phase 6 (US3):
  - These entire phases can run in parallel after Phase 4
```

### Suggested MVP Scope

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (US1)

**MVP Delivers**:
- Cart creation with customer identification
- Adding products to cart with quantity
- Automatic quantity consolidation for duplicates
- Validation of 20 product limit and quantity ranges
- REST API endpoints for cart operations
- Complete test coverage (unit + integration + e2e)

**MVP Value**: Customers can create carts and add products - the foundational cart behavior. This is independently testable and deployable.

**Post-MVP Increments**:
1. **Increment 2**: Add Phase 4 (US4 - Conversion immutability)
2. **Increment 3**: Add Phase 5 (US2 - Update quantities)
3. **Increment 4**: Add Phase 6 (US3 - Remove items)
4. **Increment 5**: Add Phase 7 (Polish & error handling)

---

## Implementation Strategy

### TDD Workflow (Red-Green-Refactor)

Each task group follows this cycle:

1. **RED**: Write failing test (T### tasks labeled "Write test")
2. **GREEN**: Implement minimum code to pass (T### tasks labeled "Implement")
3. **REFACTOR**: Clean up code while keeping tests green
4. **COMMIT**: Atomic commits after each component (test commit, then implementation commit)

### Conventional Commits

Follow this format for all commits:

```
<type>(<scope>): <description>

Types:
- test: Adding or updating tests
- feat: New feature implementation
- refactor: Code refactoring
- docs: Documentation changes
- chore: Build/tooling changes

Scopes (for user story tasks):
- US1, US2, US3, US4
- Or: domain, application, infrastructure
```

**Examples**:
- `test(US1): add ShoppingCart addItem tests`
- `feat(US1): implement ShoppingCart addItem with consolidation`
- `test: add CartId value object tests`
- `feat: implement CartId value object`

### Quality Gates (Run Before Each Commit)

```bash
npm run lint       # ESLint check
npm run format     # Prettier formatting
npm test           # Unit + integration tests
npm run build      # TypeScript compilation
```

---

## Task Summary

**Total Tasks**: 241

**By Phase**:
- Phase 1 (Setup): 22 tasks
- Phase 2 (Foundational): 50 tasks (4 Value Objects + 1 Entity)
- Phase 3 (US1 - MVP): 59 tasks
- Phase 4 (US4): 29 tasks
- Phase 5 (US2): 31 tasks
- Phase 6 (US3): 28 tasks
- Phase 7 (Polish): 22 tasks

**By User Story**:
- US1 (Add Products): 59 tasks - MVP
- US4 (Conversion): 29 tasks
- US2 (Update Quantities): 31 tasks
- US3 (Remove Items): 28 tasks

**Parallel Opportunities**: 41 tasks marked [P] can run concurrently

**Independent Test Criteria**:
- **Foundational**: All VOs validate correctly, CartItem manages quantity ✓
- **US1**: Create cart → Add items → Verify quantities & consolidation ✓
- **US4**: Convert cart → Attempt modifications → All rejected ✓
- **US2**: Update quantities → Verify changes → Test rejections ✓
- **US3**: Remove items → Verify removal → Test rejections ✓

**Format Validation**: ✅ All tasks follow required checklist format with ID, labels, and file paths

---

## Next Steps

1. **Start with MVP**: Complete Phase 1 → Phase 2 → Phase 3 (US1)
2. **Validate MVP**: Run full test suite and manual testing
3. **Incremental Delivery**: Add US4 → US2 & US3 → Polish
4. **Quality Gates**: Ensure lint, format, tests, build pass before each commit
5. **Review Constitution**: Verify DDD principles maintained throughout

Ready to implement! 🚀
