# Domain Services

## When to Use Domain Services
Use a domain service when:
- Complex business logic spans multiple aggregates
- The logic doesn't naturally fit within a single aggregate
- You need to coordinate between multiple domain concepts

## OrderPricingService

**Purpose**: Complex pricing logic spanning multiple aggregates and external contexts.

**Responsibilities**:
- Fetch product information from Catalog context via `CatalogGateway`
- Fetch pricing information from Pricing context via `PricingGateway`
- Calculate final order pricing
- Create `ProductSnapshot` value objects
- Return domain-specific types (`Money`, `ProductSnapshot`)

**Used by**: `PlaceOrderFromCartApplicationService` during checkout

**Code reference**: (to be implemented in domain layer)

## Domain Service vs Application Service

**Domain Service**:
- Contains domain logic that doesn't fit in a single aggregate
- Works with domain concepts (aggregates, value objects)
- Part of the domain layer
- Example: `OrderPricingService`

**Application Service**:
- Orchestrates use cases
- Coordinates aggregates, repositories, domain services
- Part of the application layer
- Example: `PlaceOrderFromCartApplicationService`

## Related Documentation
- Application services: `/docs/ddd-patterns/application-services.md`
- Gateways used by domain services: `/docs/ddd-patterns/gateways.md`
- Lesson 2 (OrderPricingService): `/docs/lessons/lesson-2-checkout-flow.md`
