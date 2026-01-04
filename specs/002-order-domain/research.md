# Research: Order Domain and Checkout Flow

**Feature**: Order Domain and Checkout Flow
**Branch**: `002-order-domain`
**Date**: 2025-12-28
**Status**: Complete

## Overview

This document consolidates research findings and design decisions for implementing the Order domain aggregate with checkout flow, state machine, and external context integration. All technical unknowns were resolved during feature specification phase.

## Research Areas

### 1. Order Identifier Generation Strategy

**Decision**: System-generated UUID

**Rationale**:
- UUIDs provide globally unique identifiers without coordination
- No dependency on database sequences or external ID generation services
- Compatible with distributed systems and in-memory storage
- TypeScript/Node.js has native UUID support via `crypto.randomUUID()`

**Alternatives Considered**:
- Sequential integers: Rejected due to lack of global uniqueness and scalability issues
- Custom format (prefix + timestamp + random): Rejected as unnecessarily complex compared to standard UUID
- External ID service: Rejected as overkill for educational project with in-memory storage

### 2. Temporal Tracking Requirements

**Decision**: Creation timestamp only (single field)

**Rationale**:
- Sufficient for audit trail and order history
- Domain model focuses on state transitions, not full audit history
- Future enhancement: Domain events can track detailed state change timestamps
- Keeps aggregate simple and focused on business invariants

**Alternatives Considered**:
- Full audit trail (created/updated/paid/cancelled timestamps): Rejected as not required by current use cases, can be added via domain events in future phase
- No timestamps: Rejected as creation time is essential business data

### 3. ShippingAddress Required Fields

**Decision**: 5 mandatory fields (street, city, state/province, postal code, country)

**Rationale**:
- Minimum viable set for physical delivery
- Balance between completeness and simplicity
- Covers most international addressing needs
- Optional fields (address line 2, delivery instructions) can be added without breaking core model

**Alternatives Considered**:
- Only 3 fields (street, city, country): Rejected as insufficient for accurate delivery
- 8+ fields with full address standardization: Rejected as over-engineering for current scope

### 4. ProductSnapshot Essential Attributes

**Decision**: 3 mandatory fields (name, description, SKU)

**Rationale**:
- Captures human-readable product identity (name)
- Provides detail for customer reference (description)
- Includes unique technical identifier (SKU)
- Sufficient to display order contents even if product catalog changes or product is deleted
- Extensible for future attributes (images, categories, etc.)

**Alternatives Considered**:
- Only name and SKU: Rejected as description provides important context for customers
- Full product data copy: Rejected as most attributes are not relevant to order history

### 5. Currency Code Standard

**Decision**: ISO 4217 3-letter codes (USD, EUR, BRL, etc.)

**Rationale**:
- International standard for currency representation
- Unambiguous (USD vs US$, EUR vs €)
- Well-supported by financial systems and libraries
- Future-proof for multi-currency support

**Alternatives Considered**:
- Currency symbols ($ € £): Rejected as ambiguous ($ could be USD, CAD, AUD, etc.)
- Full currency names: Rejected as verbose and inconsistent
- Numeric codes: Rejected as not human-readable

### 6. State Machine Design

**Decision**: Three states with clear transition rules
- AwaitingPayment (initial state after checkout)
- Paid (terminal state for successful orders, but can transition to Cancelled)
- Cancelled (terminal state, no further transitions)

**Transition Rules**:
- AwaitingPayment → Paid (via `markAsPaid()` with payment ID)
- AwaitingPayment → Cancelled (via `cancel()` with reason)
- Paid → Cancelled (via `cancel()` with reason - allows refund scenarios)
- Cancelled → * (no transitions allowed)

**Rationale**:
- Simple, understandable state model aligned with business process
- Handles refund scenario (paid orders can be cancelled)
- Clear error conditions for invalid transitions
- Extensible for future states (Shipped, Delivered) in separate bounded context

**Alternatives Considered**:
- Paid orders cannot be cancelled: Rejected as business requires refund support
- More complex state machine with Pending, Processing, etc.: Rejected as over-engineering for initial phase

### 7. Discount Modeling

**Decision**: Explicit discount fields at two levels
- `itemDiscount` (Money): Per OrderItem for product-level promotions
- `orderLevelDiscount` (Money): At Order aggregate for cart-wide promotions/coupons

**Calculation**: `orderTotal = sum(lineTotals) - sum(itemDiscounts) - orderLevelDiscount`

**Rationale**:
- Makes discount impact transparent and auditable
- Supports both item-level (product promotions) and order-level (coupons) discounts
- Discounts stored as Money value objects (amount + currency), defaulting to zero if no discount applied
- Pricing service calculates discounts, Order domain stores results
- Future enhancement: Can add discount reason/code fields for detailed tracking

**Alternatives Considered**:
- Single discount field: Rejected as cannot distinguish between product promotions and cart-wide coupons
- No explicit discount fields (just include in prices): Rejected as loses business information and transparency
- Discount as percentage: Rejected as less flexible than Money amounts and requires storing additional calculation data

### 8. Race Condition Handling (Concurrent Checkout)

**Decision**: Infrastructure concern, not domain model concern
- First successful checkout wins, creates order
- Subsequent checkout attempts return existing order (idempotent behavior)
- Implementation handled via repository layer with appropriate concurrency controls

**Rationale**:
- Domain model focuses on business rules and invariants
- Concurrency control is infrastructure responsibility
- Idempotent checkout behavior provides good user experience (no duplicate orders)
- Keeps domain layer pure and testable without threading concerns

**Alternatives Considered**:
- Pessimistic locking in domain: Rejected as infrastructure concern leaking into domain
- Reject second checkout: Rejected as poor user experience (legitimate retry scenarios)

### 9. External Service Timeout Strategy

**Decision**: 2-second timeout for external service calls (Product Catalog, Pricing)
- Gateway implementations enforce timeout at infrastructure layer
- Timeout results in immediate checkout failure with clear error message
- No retry logic (fail fast for better user experience)

**Rationale**:
- Checkout SLA requires completion within 2 seconds total
- Fast failure better than long waits for user experience
- External service reliability is their responsibility
- Retry logic can be added at infrastructure/application layer if needed

**Alternatives Considered**:
- Longer timeouts (5-10 seconds): Rejected as violates checkout SLA
- Automatic retries: Rejected as adds complexity and latency
- Fallback to cached data: Rejected as could result in incorrect pricing

### 10. Domain Events

**Decision**: Not implemented in this phase
- OrderCreated, OrderPaid, OrderCancelled events will be added in future phase focused on event-driven architecture (Stage 4)
- Current implementation focuses on aggregate design, value objects, and domain services (Stage 2)

**Rationale**:
- Follows lesson plan progression (events are Stage 4 topic)
- Simplifies initial implementation
- Does not affect current requirements (no event consumers yet)
- Easy to add later without breaking existing code

**Alternatives Considered**:
- Implement events now: Rejected as premature for educational progression
- Never implement events: Rejected as events are part of planned curriculum

### 11. Authentication and Authorization

**Decision**: Not enforced in domain layer
- Domain layer focuses purely on business rules and invariants
- Access control handled at infrastructure/application layer
- Domain methods assume caller has been authenticated/authorized

**Rationale**:
- Maintains domain layer purity (no infrastructure dependencies)
- Follows DDD principle of separating technical concerns from business logic
- Authorization policies may vary by deployment context (infrastructure concern)
- Simplifies unit testing of domain logic

**Alternatives Considered**:
- Domain-level authorization: Rejected as violates domain layer purity
- No authorization at all: Rejected as unsafe, but implemented at appropriate layer

### 12. OrderPricingService Responsibility

**Decision**: Domain Service that orchestrates pricing logic
- Accepts cart items (product ID + quantity)
- Retrieves product data via gateway (for snapshots)
- Calculates unit prices, line totals, discounts via gateway
- Returns fully priced OrderItems ready for Order aggregate creation
- Fails with clear functional error if any item cannot be priced or product data unavailable

**Rationale**:
- Pricing orchestration logic represents domain knowledge (how to assemble a complete priced order)
- Domain service coordinates multiple external contexts (Product Catalog, Pricing) without coupling domain to infrastructure
- Encapsulates complex business logic that doesn't naturally fit in aggregate
- Keeps Order aggregate focused on state management and invariant enforcement

**Alternatives Considered**:
- Application service handles pricing: Rejected as pricing orchestration is domain logic, not just technical coordination
- Order aggregate handles pricing: Rejected as violates single responsibility and aggregate boundaries
- Separate pricing aggregate: Rejected as pricing is not its own consistency boundary

## Technology Stack Validation

**Framework**: NestJS 11.0
- Well-suited for DDD with modular architecture
- Strong dependency injection for repository and gateway implementations
- Native TypeScript support with decorators
- Active ecosystem and documentation

**Testing**: Jest 30.0 + SuperTest
- Standard testing framework for Node.js/TypeScript
- Supports unit, integration, and e2e testing
- Good mocking capabilities for gateway testing
- SuperTest for HTTP endpoint testing

**Language**: TypeScript 5.7.3 with strict mode
- Type safety for value objects and domain model
- Strong compile-time guarantees
- Excellent IDE support
- Interface definitions for repository and gateway contracts

## Implementation Approach

### Domain Layer (Pure TypeScript)
- Order aggregate with state machine logic
- Value Objects: Money, ShippingAddress, ProductSnapshot, OrderId, OrderStatus
- OrderPricingService domain service for pricing orchestration
- Domain exceptions for business rule violations
- Repository interface (no implementation)

### Application Layer
- CheckoutService: Orchestrates checkout use case (validate cart, call pricing service, create order, persist)
- OrderService: Orchestrates order operations (mark paid, cancel)
- DTOs for HTTP requests/responses
- Gateway interfaces: CatalogGateway, PricingGateway (contracts for external contexts)
- Application exceptions for not found scenarios

### Infrastructure Layer
- OrderController: HTTP endpoints (POST /orders/checkout, POST /orders/:id/mark-paid, POST /orders/:id/cancel)
- InMemoryOrderRepository: Repository implementation
- StubCatalogGateway: Stubbed product data provider
- StubPricingGateway: Stubbed pricing calculator
- OrderModule: NestJS module wiring

### Test Strategy
- Unit tests: Aggregates, entities, value objects, domain service (pure domain logic)
- Integration tests: Application services with mocked gateways
- E2E tests: Full checkout flow through HTTP endpoints

## Open Questions

**None.** All requirements clarified during specification phase.

## References

- Feature Specification: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- DDD Patterns Reference: `/docs/ddd-patterns/`
- Lesson Documentation: `/docs/lessons/lesson-2.md` (Domain Services & Gateways)
- Project Constitution: `/.specify/memory/constitution.md`
