# Implementation Plan: Order Domain and Checkout Flow

**Branch**: `002-order-domain` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-order-domain/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an Order domain aggregate that transforms Shopping Carts into Orders with complete lifecycle management through a state machine (AwaitingPayment → Paid → Cancelled). The Order aggregate captures product snapshots and pricing at checkout time to ensure stability despite catalog changes. Implementation uses rich value objects (Money, ShippingAddress, ProductSnapshot) to enforce domain invariants, a pricing domain service (OrderPricingService) to orchestrate pricing calculations with external contexts, and functional contracts for synchronous dependencies on Product Catalog and Pricing contexts. The checkout flow is exposed via POST /orders/checkout endpoint with validation, idempotency (prevents duplicate orders from same cart), and clear functional error handling for invalid states and external service failures.

## Technical Context

**Language/Version**: TypeScript 5.7.3 with strict mode enabled
**Primary Dependencies**: NestJS 11.0 (core framework), Jest 30.0 (testing), RxJS 7.8 (reactive patterns)
**Storage**: In-memory repositories (educational focus, no persistent database)
**Testing**: Jest for unit tests (*.spec.ts), Jest for e2e tests (*.e2e-spec.ts), SuperTest for HTTP assertions
**Target Platform**: Node.js server (Darwin/Linux compatible)
**Project Type**: Single NestJS application with layered architecture (Domain/Application/Infrastructure)
**Performance Goals**: Checkout requests complete within 2 seconds, external service calls timeout after 2 seconds
**Constraints**: Domain layer purity (no infrastructure dependencies), TDD required (tests written before implementation), Conventional Commits for all commits
**Scale/Scope**: Educational project demonstrating Tactical DDD patterns (4 implementation stages), Order bounded context with state machine and external integrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [constitution principles](../../.specify/memory/constitution.md):

- [x] **Domain Layer Purity**: Order aggregate, OrderItem entity, value objects (Money, ShippingAddress, ProductSnapshot), and OrderPricingService will reside in domain layer with no infrastructure dependencies (Principle I)
- [x] **Layered Architecture**: Clear separation maintained - Domain (aggregates/entities/value objects/services), Application (DTOs/use cases/gateway interfaces), Infrastructure (controllers/repositories/gateways/NestJS modules) (Principle II)
- [x] **Aggregate Design**: Order is aggregate root owning OrderItems collection, enforcing state machine invariants and transaction boundaries (Principle III)
- [x] **Value Objects**: Money (amount + ISO 4217 currency), ShippingAddress (5 required fields), ProductSnapshot (name/description/SKU) replace primitives (Principle IV)
- [x] **TDD**: Tests written before implementation following Red-Green-Refactor cycle (Principle V)
- [x] **Anti-Corruption Layer**: Product Catalog and Pricing contexts accessed via gateway interfaces (CatalogGateway, PricingGateway) defined in application layer, implemented in infrastructure (Principle VI)
- [x] **Intention-Revealing Design**: Methods like `markAsPaid()`, `cancel()`, domain events named `OrderPlaced`, `OrderPaid`, `OrderCancelled` use ubiquitous language (Principle VII)
- [x] **Atomic Commits**: All commits follow Conventional Commits format (`feat:`, `test:`, `refactor:`, etc.) (Principle VIII)

**Quality Gates**:
- [x] Linting configured and passing (ESLint 9.18 with Prettier plugin)
- [x] Formatting configured (Prettier 3.4)
- [x] Test framework configured (Jest 30.0 for unit and e2e tests)
- [x] TypeScript strict mode enabled (TypeScript 5.7.3)
- [x] Build pipeline functional (NestJS CLI build process)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                              # Pure business logic (no dependencies)
│   ├── aggregates/
│   │   ├── order.ts                     # NEW: Order aggregate root
│   │   ├── shopping-cart.ts             # EXISTING: Cart aggregate
│   │   └── __tests__/
│   │       ├── order.spec.ts            # NEW: Order unit tests
│   │       └── shopping-cart.spec.ts    # EXISTING
│   ├── entities/
│   │   ├── order-item.ts                # NEW: OrderItem entity
│   │   ├── cart-item.ts                 # EXISTING
│   │   └── __tests__/
│   │       ├── order-item.spec.ts       # NEW: OrderItem unit tests
│   │       └── cart-item.spec.ts        # EXISTING
│   ├── value-objects/
│   │   ├── money.ts                     # NEW: Money value object
│   │   ├── shipping-address.ts          # NEW: ShippingAddress value object
│   │   ├── product-snapshot.ts          # NEW: ProductSnapshot value object
│   │   ├── order-id.ts                  # NEW: Order identifier
│   │   ├── order-status.ts              # NEW: Order state enum/value object
│   │   ├── product-id.ts                # EXISTING
│   │   ├── quantity.ts                  # EXISTING
│   │   ├── cart-id.ts                   # EXISTING
│   │   ├── customer-id.ts               # EXISTING
│   │   └── __tests__/
│   │       ├── money.spec.ts            # NEW
│   │       ├── shipping-address.spec.ts # NEW
│   │       ├── product-snapshot.spec.ts # NEW
│   │       └── [existing test files]
│   ├── services/
│   │   ├── order-pricing.service.ts     # NEW: Domain service for pricing orchestration
│   │   └── __tests__/
│   │       └── order-pricing.service.spec.ts  # NEW
│   ├── repositories/
│   │   ├── order.repository.interface.ts       # NEW: Order repository contract
│   │   └── shopping-cart.repository.interface.ts  # EXISTING
│   └── exceptions/
│       ├── invalid-order-state-transition.error.ts  # NEW: State machine violations
│       ├── product-pricing-failed.error.ts          # NEW: Pricing failures
│       ├── product-data-unavailable.error.ts        # NEW: Catalog failures
│       └── [existing cart exceptions]
│
├── application/                         # Use case orchestration
│   ├── services/
│   │   ├── checkout.service.ts          # NEW: Checkout use case
│   │   ├── order.service.ts             # NEW: Order operations use case
│   │   ├── cart.service.ts              # EXISTING
│   │   └── __tests__/
│   │       ├── checkout.service.spec.ts # NEW
│   │       ├── order.service.spec.ts    # NEW
│   │       └── cart.service.spec.ts     # EXISTING
│   ├── dtos/
│   │   ├── checkout.dto.ts              # NEW: Checkout request
│   │   ├── order-response.dto.ts        # NEW: Order response
│   │   ├── mark-paid.dto.ts             # NEW: Payment marking
│   │   ├── cancel-order.dto.ts          # NEW: Cancellation request
│   │   └── [existing cart DTOs]
│   ├── gateways/                        # NEW: Gateway interfaces (ACL)
│   │   ├── catalog.gateway.interface.ts # NEW: Product data contract
│   │   └── pricing.gateway.interface.ts # NEW: Pricing calculation contract
│   └── exceptions/
│       ├── order-not-found.exception.ts # NEW
│       └── cart-not-found.exception.ts  # EXISTING
│
├── infrastructure/                      # NestJS, HTTP, external integrations
│   ├── controllers/
│   │   ├── order.controller.ts          # NEW: Order HTTP endpoints
│   │   ├── cart.controller.ts           # EXISTING
│   │   └── __tests__/
│   ├── repositories/
│   │   ├── in-memory-order.repository.ts         # NEW
│   │   └── in-memory-shopping-cart.repository.ts # EXISTING
│   ├── gateways/                        # NEW: Gateway implementations
│   │   ├── stub-catalog.gateway.ts      # NEW: Stubbed catalog integration
│   │   └── stub-pricing.gateway.ts      # NEW: Stubbed pricing integration
│   ├── modules/
│   │   ├── order.module.ts              # NEW: Order NestJS module
│   │   └── cart.module.ts               # EXISTING
│   └── filters/
│       └── domain-exception.filter.ts   # EXISTING: Global exception filter
│
├── app.module.ts                        # MODIFIED: Import OrderModule
└── main.ts                              # EXISTING

test/                                    # E2E tests
├── order.e2e-spec.ts                    # NEW: Order checkout and lifecycle e2e tests
└── cart.e2e-spec.ts                     # EXISTING
```

**Structure Decision**: Single NestJS application with strict layered architecture (Domain/Application/Infrastructure). This follows the existing project structure established in Stage 1 (Shopping Cart implementation). The domain layer remains pure TypeScript with no framework dependencies, application layer defines use cases and contracts, and infrastructure layer handles NestJS integration and external systems.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations identified.** All Constitution principles are satisfied:
- Domain layer purity maintained (no infrastructure dependencies)
- Layered architecture properly enforced
- Aggregate design follows transaction boundaries
- Value Objects replace primitives
- TDD workflow enforced
- Anti-Corruption Layer via gateways for external contexts
- Intention-revealing design with ubiquitous language
- Atomic commits with Conventional Commits format
