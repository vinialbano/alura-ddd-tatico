# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Educational NestJS application demonstrating **Tactical DDD patterns** in an e-commerce **Order Bounded Context**. The application models a complete order management flow: shopping cart → checkout → payment → fulfillment.

**Technical Stack**: NestJS, TypeScript, in-memory storage (educational)

**Domain Focus**: Sales subdomain, specifically the Orders bounded context

**Four Implementation Stages**:
1. Aggregates & Value Objects (Shopping Cart)
2. Domain Services & Gateways (Checkout with external integration)
3. State Management (Payment/cancellation with state machine)
4. Event-Driven Architecture (Async integration via message bus)

See `/docs/reference/architecture-evolution.md` for technical evolution details.

## AI Assistant Tool Usage

### Context7 MCP for Library Documentation

**CRITICAL**: Always use Context7 MCP tools proactively when working with external libraries and frameworks. Do NOT wait for the user to explicitly request documentation lookup.

**When to use Context7**:
- Generating code that uses NestJS, TypeScript, or any external library
- Configuring tools (Jest, ESLint, Prettier, etc.)
- Answering questions about library APIs or best practices
- Implementing features that require external package documentation

**Workflow**:
1. Use `resolve-library-id` to get the Context7-compatible library ID
2. Use `get-library-docs` to fetch up-to-date documentation

**Relevant libraries for this project**:
- NestJS (core framework)
- TypeScript (language)
- Jest (testing)
- ESLint, Prettier (code quality)
- Any npm packages used in `package.json`

**Note**: Project-specific DDD patterns and domain documentation remain in `/docs/` directory.

### Filesystem MCP for Project File Access

**CONFIGURED**: Filesystem MCP provides direct file read/write access to this project.

**When to use**:
- Multi-file refactoring or code generation tasks
- Creating new domain/application/infrastructure components
- Batch operations across multiple files or directories
- Syncing documentation with code changes

**Auto-excluded**: `node_modules/`, `dist/`, `.git/`, `.env*` (handled automatically)

## Documentation Structure

Use progressive disclosure - consult docs based on current task:

**Implementation Guides**:
- Lesson 1-4: `/docs/lessons/lesson-{1-4}.md`

**DDD Pattern Reference**:
- `/docs/ddd-patterns/aggregates.md`
- `/docs/ddd-patterns/value-objects.md`
- `/docs/ddd-patterns/domain-services.md`
- `/docs/ddd-patterns/application-services.md`
- `/docs/ddd-patterns/repositories.md`
- `/docs/ddd-patterns/domain-events.md`
- `/docs/ddd-patterns/gateways.md`
- `/docs/ddd-patterns/event-driven-integration.md`

**Domain Specifications**:
- Order state machine: `/docs/domain/order-state-machine.md`
- API endpoints: `/docs/reference/api-reference.md`
- Strategic context: `/docs/reference/strategic-ddd-context.md`

## DDD Implementation Rules

### 1. Aggregate Design
- Keep aggregates small, focused on transaction boundaries
- Enforce invariants within aggregate boundaries
- Use repository pattern for persistence
- **No public setters** - use intention-revealing methods

### 2. Value Objects
- Make immutable
- Implement equality by value
- Replace primitives with domain types (avoid primitive obsession)

### 3. Domain Events
- Name in past tense (OrderPlaced, not PlaceOrder)
- Include all data subscribers need
- Represent significant business moments, not CRUD operations

### 4. Layered Architecture
- **Domain**: Aggregates, value objects, domain services, domain events, repository interfaces
- **Application**: Use cases, application services, DTOs, gateway interfaces
- **Infrastructure**: NestJS modules, repositories, gateways, event bus, controllers
- **Rule**: Domain has no infrastructure dependencies

### 5. NestJS Integration
- Domain logic independent of NestJS decorators
- Application services can be NestJS providers
- Repositories inject via DI

### 6. Intention-Revealing Methods
Use business-meaningful names: `markAsPaid()`, `cancel()`, not `updateStatus()`

### 7. Anti-Corruption Layer
Gateways translate external models to domain types, isolating domain from external changes

## Project Structure

**Domain Layer** (`src/domain/`):
- Aggregates: `ShoppingCart`, `Order`
- Value Objects: `Money`, `ProductId`, `Quantity`, `ShippingAddress`, `ProductSnapshot`
- Domain Services: `OrderPricingService`
- Domain Events: `OrderPlaced`, `OrderPaid`, `OrderCancelled`

**Application Layer** (`src/application/`):
- Application Services for use case orchestration
- DTOs for data transfer

**Infrastructure Layer** (`src/infrastructure/`):
- NestJS controllers
- In-memory repositories
- Gateway implementations (stubbed)
- Event bus (Lesson 4)

## External Context Integration

**Synchronous (Gateways)**:
- **Catalog**: Product information (immediate validation needed)
- **Pricing**: Price calculations (current price needed)

**Asynchronous (Events - Lesson 4)**:
- **Payments**: Payment processing (eventual consistency acceptable)
- **Inventory**: Stock reservation (decoupling needed)

See `/docs/reference/strategic-ddd-context.md` for integration details.

## Implementation Constraints

- **In-memory storage**: Focus on domain patterns, not infrastructure
- **Stubbed external contexts**: Catalog, Pricing, Payment, Inventory are mocked
- **Clear examples**: Prioritize pattern demonstration over optimization

## Common Commands

See `package.json` for all scripts. Key commands:
- `npm run start:dev` - Development with hot reload
- `npm run test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run lint` - ESLint
- `npm run format` - Prettier

## Development Workflow

### Before Implementing
1. Identify which lesson/stage the task relates to
2. Read relevant lesson doc: `/docs/lessons/lesson-{n}.md`
3. Read relevant pattern docs: `/docs/ddd-patterns/*.md`
4. Check domain specs if needed: `/docs/domain/*.md`

### During Implementation
- Enforce business rules within aggregates
- Use value objects instead of primitives
- Keep domain layer pure (no infrastructure dependencies)
- Follow layered architecture strictly
- Use intention-revealing method names

### Code Location Guidelines
- **Aggregates, entities, value objects**: Domain layer
- **Domain services**: Domain layer
- **Domain events**: Domain layer
- **Application services**: Application layer
- **DTOs**: Application layer
- **Gateway interfaces**: Application layer
- **Repository interfaces**: Domain layer
- **Repository implementations**: Infrastructure layer
- **Gateway implementations**: Infrastructure layer
- **NestJS modules, controllers**: Infrastructure layer
