# Implementation Plan: Shopping Cart Domain Model

**Branch**: `001-shopping-cart-model` | **Date**: 2025-12-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-shopping-cart-model/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a Shopping Cart domain model as an aggregate root that encapsulates all cart management business rules. The ShoppingCart aggregate will support adding items (with quantity consolidation), updating quantities, removing items, and preventing modifications after conversion to an order. The implementation will use explicit Value Objects (CartId, CustomerId, ProductId, Quantity) to avoid primitive obsession and enforce invariants (quantities 1-10, max 20 products, no empty cart conversion). This represents Stage 1 of the tactical DDD learning path, focusing on Aggregates and Value Objects without external integration or domain events.

## Technical Context

**Language/Version**: TypeScript 5.7.3
**Primary Dependencies**: NestJS 11.0.1, Jest 30.0.0
**Storage**: In-memory (educational - no database)
**Testing**: Jest (unit tests: `*.spec.ts`, e2e tests: `*.e2e-spec.ts`)
**Target Platform**: Node.js server application
**Project Type**: Single NestJS application with layered DDD architecture
**Performance Goals**: Educational focus - no specific performance targets
**Constraints**:
- Domain layer MUST remain pure TypeScript (no NestJS decorators or infrastructure dependencies)
- Max 20 unique products per cart, max 10 quantity per item
- Cart requires CustomerId at creation
- No external system integration (stubbed contexts)

**Scale/Scope**:
- Stage 1 implementation: Aggregates + Value Objects only
- 1 Aggregate (ShoppingCart), 1 Entity (CartItem), 5 Value Objects
- Foundation for 3 future stages (Gateways, State Management, Events)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [constitution principles](../../.specify/memory/constitution.md):

- [x] **Domain Layer Purity**: No infrastructure dependencies in domain layer (Principle I) - ShoppingCart aggregate and Value Objects will be pure TypeScript
- [x] **Layered Architecture**: Proper separation of Domain/Application/Infrastructure (Principle II) - Following `src/domain/`, `src/application/`, `src/infrastructure/` structure
- [x] **Aggregate Design**: Aggregates designed around transaction boundaries (Principle III) - ShoppingCart is transaction boundary for cart operations
- [x] **Value Objects**: Domain concepts modeled as Value Objects, not primitives (Principle IV) - CartId, CustomerId, ProductId, Quantity are explicit Value Objects
- [x] **TDD**: Tests written before implementation (Principle V) - Will follow Red-Green-Refactor cycle
- [x] **Anti-Corruption Layer**: External integration uses gateways (Principle VI) - N/A for Stage 1 (no external integration yet)
- [x] **Intention-Revealing Design**: Ubiquitous language used throughout (Principle VII) - Methods like `addItem()`, `updateQuantity()`, `markAsConverted()`
- [x] **Atomic Commits**: Conventional Commits specification followed (Principle VIII) - Will use `feat`, `test`, `refactor` commit types

**Quality Gates**:
- [x] Linting configured and passing - ESLint 9.18.0 configured
- [x] Formatting configured - Prettier 3.4.2 configured
- [x] Test framework configured (Jest) - Jest 30.0.0 configured
- [x] TypeScript strict mode enabled - TypeScript 5.7.3 configured
- [x] Build pipeline functional - NestJS CLI 11.0.0 build configured

**Constitution Compliance**: ✅ All principles applicable to Stage 1 are satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-shopping-cart-model/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0: DDD patterns research (to be generated)
├── data-model.md        # Phase 1: Entity/VO definitions (to be generated)
├── quickstart.md        # Phase 1: Developer guide (to be generated)
├── contracts/           # Phase 1: Domain interfaces (to be generated)
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2: Implementation tasks (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                         # Pure TypeScript - no framework dependencies
│   ├── value-objects/
│   │   ├── cart-id.ts             # Unique cart identifier
│   │   ├── customer-id.ts         # Customer identifier
│   │   ├── product-id.ts          # Product identifier
│   │   └── quantity.ts            # Item quantity (1-10)
│   ├── entities/
│   │   └── cart-item.ts           # Line item within cart aggregate
│   ├── aggregates/
│   │   └── shopping-cart.ts       # Aggregate root - owns cart items
│   └── repositories/
│       └── shopping-cart.repository.interface.ts  # Repository contract
│
├── application/                    # Use case orchestration
│   ├── dtos/
│   │   ├── add-item.dto.ts        # Input for adding item
│   │   ├── update-quantity.dto.ts # Input for updating quantity
│   │   └── cart-response.dto.ts   # Output representation
│   └── services/
│       └── cart.service.ts        # Application service (orchestration only)
│
└── infrastructure/                 # NestJS integration
    ├── modules/
    │   └── cart.module.ts         # NestJS module
    ├── controllers/
    │   └── cart.controller.ts     # REST API endpoints
    └── repositories/
        └── in-memory-shopping-cart.repository.ts  # In-memory implementation

test/
├── unit/                          # Domain logic tests
│   ├── shopping-cart.spec.ts
│   ├── cart-item.spec.ts
│   └── value-objects/
│       ├── cart-id.spec.ts
│       ├── customer-id.spec.ts
│       ├── product-id.spec.ts
│       └── quantity.spec.ts
├── integration/                   # Application service tests
│   └── cart.service.spec.ts
└── e2e/                          # API endpoint tests
    └── cart.e2e-spec.ts
```

**Structure Decision**: Single NestJS application with strict layered DDD architecture. Domain layer (`src/domain/`) contains pure TypeScript with zero dependencies on NestJS or infrastructure concerns. Application layer (`src/application/`) orchestrates use cases and defines DTOs. Infrastructure layer (`src/infrastructure/`) contains NestJS-specific code (modules, controllers) and repository implementations. This structure supports the 4-stage learning path where later stages will add domain services, gateways, and event handling to appropriate layers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. All principles are satisfied by the planned design.

