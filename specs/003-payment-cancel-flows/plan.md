# Implementation Plan: Synchronous Payment and Order Cancellation Flows

**Branch**: `003-payment-cancel-flows` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-payment-cancel-flows/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements synchronous payment processing and order cancellation flows for the Orders bounded context. It adds state transition methods (`markAsPaid` and `cancel`) to the existing Order aggregate, creates application services for payment confirmation and cancellation orchestration, implements a stubbed PaymentGateway for external payment processing, and exposes REST API endpoints for payment and cancellation operations. This stage focuses on synchronous, request-response integration patterns before transitioning to event-driven architecture in Stage 4.

**Technical Approach**: Extend existing Order aggregate with domain event raising capabilities, implement application services following use case orchestration pattern, create gateway interface with stubbed implementation, and build NestJS controllers with proper error handling for state transition violations.

## Technical Context

**Language/Version**: TypeScript 5.7.3 with Node.js (target ES2023)
**Primary Dependencies**: NestJS 11.0.1, class-validator 0.14.3, class-transformer 0.5.1
**Storage**: In-memory repositories (educational, no persistent database)
**Testing**: Jest 30.0.0 (unit: `*.spec.ts`, e2e: `*.e2e-spec.ts`)
**Target Platform**: Node.js server (development: `npm run start:dev`)
**Project Type**: Single NestJS backend application
**Performance Goals**: Payment processing < 3 seconds (including gateway), Cancellation < 1 second
**Constraints**: Synchronous gateway pattern (educational), stubbed external services, strict DDD layering
**Scale/Scope**: Educational DDD demonstration, 2 new endpoints, domain event infrastructure extension

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [constitution principles](../../.specify/memory/constitution.md):

- [x] **Domain Layer Purity**: Order.markAsPaid() and Order.cancel() methods are pure domain logic with no infrastructure dependencies (Principle I)
- [x] **Layered Architecture**: Payment/cancellation logic follows Domain (aggregate methods) → Application (use case services) → Infrastructure (controllers, gateways) (Principle II)
- [x] **Aggregate Design**: Order aggregate enforces state machine invariants through intention-revealing methods (Principle III)
- [x] **Value Objects**: Existing Money, OrderId, OrderStatus value objects used; no new primitives introduced (Principle IV)
- [x] **TDD**: Tests will be written first for domain state transitions, then application orchestration, then e2e flows (Principle V)
- [x] **Anti-Corruption Layer**: PaymentGateway interface in Application layer, implementation in Infrastructure layer (Principle VI)
- [x] **Intention-Revealing Design**: Methods named `markAsPaid()` and `cancel()` reflecting business operations, domain events named OrderPaid/OrderCancelled (Principle VII)
- [x] **Atomic Commits**: Implementation will follow Conventional Commits (test → feat → refactor cycle) (Principle VIII)

**Quality Gates**:
- [x] Linting configured and passing (ESLint 9.18.0 with TypeScript plugin)
- [x] Formatting configured (Prettier 3.4.2)
- [x] Test framework configured (Jest 30.0.0 with ts-jest)
- [x] TypeScript strict mode: Partial (strictNullChecks enabled, noImplicitAny disabled per tsconfig.json)
- [x] Build pipeline functional (NestJS CLI build)

**Constitution Compliance Assessment**: ✅ PASS

All principles align with this feature:
- Order aggregate already has markAsPaid/cancel methods in place (from prior stage)
- Application services will orchestrate without business logic
- Gateway pattern isolates external payment system
- Domain events will be added following existing pattern
- No principle violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/003-payment-cancel-flows/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── payment-api.yaml # OpenAPI spec for POST /orders/:id/pay
│   └── cancellation-api.yaml # OpenAPI spec for POST /orders/:id/cancel
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── order/
│   │   ├── order.ts                          # [EXTEND] Add domain event raising to markAsPaid/cancel
│   │   ├── order.repository.ts               # [EXISTS] Repository interface
│   │   ├── events/                           # [NEW] Domain events directory
│   │   │   ├── order-paid.event.ts          # [NEW] OrderPaid domain event
│   │   │   └── order-cancelled.event.ts     # [NEW] OrderCancelled domain event
│   │   └── exceptions/
│   │       └── invalid-order-state-transition.error.ts  # [EXISTS]
│   └── shared/
│       └── domain-event.ts                   # [NEW] Base domain event interface
│
├── application/
│   ├── order/
│   │   ├── services/
│   │   │   ├── confirm-payment.service.ts   # [NEW] Payment confirmation use case
│   │   │   └── cancel-order.service.ts      # [NEW] Order cancellation use case
│   │   ├── dtos/
│   │   │   ├── pay-order.dto.ts             # [NEW] Payment request DTO
│   │   │   ├── cancel-order.dto.ts          # [NEW] Cancellation request DTO
│   │   │   └── order-response.dto.ts        # [EXTEND] Add paymentId/cancellationReason
│   │   └── gateways/
│   │       ├── payment-gateway.interface.ts  # [NEW] Payment gateway contract
│   │       └── payment-result.ts             # [NEW] Payment gateway result type
│
└── infrastructure/
    ├── order/
    │   ├── gateways/
    │   │   └── stubbed-payment.gateway.ts    # [NEW] Stubbed payment gateway implementation
    │   └── controllers/
    │       └── order.controller.ts           # [EXTEND] Add payment/cancel endpoints
    └── persistence/
        └── in-memory-order.repository.ts     # [EXISTS]

test/
└── order/
    ├── order-payment.e2e-spec.ts             # [NEW] E2E tests for payment flow
    └── order-cancellation.e2e-spec.ts        # [NEW] E2E tests for cancellation flow
```

**Structure Decision**: Single NestJS application with DDD layered architecture (Domain → Application → Infrastructure). Existing structure from Stages 1-2 will be extended with payment/cancellation capabilities. No new layers or modules required; feature integrates into existing order module.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations**: All constitution principles are satisfied by this design. No complexity justification required.
