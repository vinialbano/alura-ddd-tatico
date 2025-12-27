<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0
Modified Principles:
  - Updated "Before Implementation" in Development Workflow to create PR at start
  - Updated "During Implementation" in Development Workflow to update PR incrementally
  - Updated "After Implementation" in Development Workflow with Conventional Commits examples and PR update guidance
Added Sections:
  - Principle VIII: Atomic Commits (Conventional Commits)
  - Work Package & Release Management governance subsection with incremental PR workflow
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - Requirements and user stories align with DDD principles
  ✅ tasks-template.md - Task structure supports independent testing and layered architecture
Follow-up TODOs: None
Rationale: MINOR version bump - new principle and governance section added, material expansion of development practices with early PR creation and incremental updates
-->

# Tactical DDD Orders Constitution

## Core Principles

### I. Domain Layer Purity (NON-NEGOTIABLE)

The Domain layer MUST remain free of infrastructure dependencies and framework-specific code. Domain logic MUST be expressed using pure TypeScript/JavaScript without NestJS decorators, external library imports, or infrastructure concerns.

**Rules:**
- Domain layer contains: Aggregates, Entities, Value Objects, Domain Services, Domain Events, Repository interfaces
- Domain layer MUST NOT import: NestJS decorators, database libraries, HTTP clients, logging frameworks
- All domain dependencies MUST be abstracted through interfaces defined in the domain or application layer
- Aggregates MUST NOT have public setters; use intention-revealing methods instead

**Rationale:** Domain purity ensures business logic remains testable, portable, and independent of technology choices. This enables the domain model to evolve based on business needs rather than framework constraints.

### II. Layered Architecture Enforcement

Code MUST be organized into three distinct layers with strict dependency rules: Domain (no dependencies), Application (depends on Domain only), Infrastructure (depends on Domain and Application).

**Rules:**
- **Domain Layer** (`src/domain/`): Pure business logic with zero external dependencies
- **Application Layer** (`src/application/`): Use case orchestration, DTOs, gateway interfaces
- **Infrastructure Layer** (`src/infrastructure/`): NestJS modules, controllers, repository implementations, gateway implementations, event bus
- Dependencies flow inward only: Infrastructure → Application → Domain
- NEVER allow Domain to depend on Application or Infrastructure
- NEVER allow Application to depend on Infrastructure

**Rationale:** Layered architecture with dependency inversion protects business logic from infrastructure changes and enables independent testing of each layer.

### III. Aggregate-Driven Design

Aggregates MUST serve as transaction boundaries and invariant enforcers. Each aggregate MUST be designed around consistency boundaries, not organizational convenience.

**Rules:**
- Keep aggregates small and focused on a single transaction boundary
- Enforce all business invariants within aggregate boundaries
- Use intention-revealing methods (e.g., `markAsPaid()`, `cancel()`) not generic setters
- Reference other aggregates by ID only, never by direct object reference
- One repository per aggregate root
- State changes MUST occur through domain methods that validate invariants

**Rationale:** Proper aggregate design ensures data consistency, makes transaction boundaries explicit, and prevents anemic domain models where business logic leaks into services.

### IV. Value Objects Over Primitives

Domain concepts MUST be modeled as Value Objects rather than primitives. Avoid primitive obsession by wrapping domain concepts in immutable, self-validating types.

**Rules:**
- Replace primitives with domain types: `Money` not `number`, `ProductId` not `string`, `Quantity` not `number`
- Value Objects MUST be immutable
- Value Objects MUST implement equality by value (all fields), not by reference
- Value Objects MUST validate their invariants in the constructor
- Value Objects SHOULD include domain behavior relevant to that concept

**Rationale:** Value Objects make the domain model explicit, encapsulate validation logic, prevent invalid states, and improve code readability by expressing domain concepts clearly.

### V. Test-Driven Development (TDD)

Tests MUST be written BEFORE implementation code. The development cycle MUST follow Red-Green-Refactor: write failing test → implement minimum code to pass → refactor.

**Rules:**
- Tests written and approved → Tests MUST fail → Then implement
- Tests are mandatory for:
  - All aggregate business logic (unit tests)
  - Domain services (unit tests)
  - Application service orchestration (integration tests)
  - API endpoints (e2e tests)
- Test file naming: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for e2e tests
- Tests MUST be independent and runnable in any order
- Tests MUST NOT depend on external services (use mocks/stubs)

**Rationale:** TDD ensures code is testable by design, provides living documentation, reduces bugs, and enables confident refactoring. Writing tests first forces clear thinking about behavior before implementation.

### VI. Anti-Corruption Layer (ACL)

External system integration MUST use gateways that translate between external models and domain types. The domain MUST never depend on or be aware of external system data structures.

**Rules:**
- Define gateway interfaces in the Application layer
- Implement gateways in the Infrastructure layer
- Gateways MUST translate external DTOs/models to domain Value Objects and Entities
- Domain MUST never reference external API types, database schemas, or message formats
- Synchronous integration uses gateways (e.g., `CatalogGateway`, `PricingGateway`)
- Asynchronous integration uses domain events and message bus

**Rationale:** ACL isolates the domain from external system changes, prevents external complexity from corrupting domain purity, and enables independent evolution of external systems.

### VII. Intention-Revealing Design

Code MUST express business intent through ubiquitous language. Method names, class names, and domain concepts MUST reflect business terminology, not technical implementation.

**Rules:**
- Use business-meaningful method names: `markAsPaid()` not `updateStatus()`, `cancel()` not `setStatus('cancelled')`
- Domain Events MUST be named in past tense representing business moments: `OrderPlaced`, `OrderPaid`, `OrderCancelled`
- Avoid technical jargon in domain layer: "Customer" not "UserEntity", "Order" not "OrderDTO"
- Code should read like business requirements documentation
- Variable and parameter names MUST use ubiquitous language from the domain

**Rationale:** Intention-revealing design bridges the gap between technical and business stakeholders, makes code self-documenting, and ensures the codebase reflects actual business processes.

### VIII. Atomic Commits (Conventional Commits)

Every commit MUST represent a single logical change and follow Conventional Commits specification. Commits MUST be small, focused, and frequent to improve maintainability and enable clear project history.

**Rules:**
- Commit message format: `<type>(<scope>): <description>`
- Commit types:
  - `feat`: New feature
  - `fix`: Bug fix
  - `test`: Adding or updating tests
  - `refactor`: Code refactoring without behavior change
  - `docs`: Documentation changes
  - `style`: Code style/formatting changes
  - `chore`: Build process, dependencies, tooling
  - `perf`: Performance improvements
- Commit frequency: After completing each atomic unit of work
  - After writing a new test (e.g., `test: add test for Order.markAsPaid()`)
  - After implementing a feature (e.g., `feat: implement payment processing`)
  - After completing a refactor (e.g., `refactor: extract pricing to domain service`)
  - After fixing a bug (e.g., `fix: correct quantity validation in CartItem`)
- Description: Clear, imperative mood ("add" not "added"), lowercase
- Body (optional): Explain why, not what
- Footer (optional): Breaking changes, issue references

**Rationale:** Atomic commits create a clear audit trail, enable granular code review, support automated tooling (changelog, semantic release), simplify debugging through git bisect, and make reverting changes safe and precise.

## Quality Standards

### Code Quality Gates

All code MUST pass these quality gates before commit:

- **Linting**: `npm run lint` MUST pass with zero errors
- **Formatting**: `npm run format` MUST be applied
- **Tests**: `npm run test` MUST pass with 100% of tests passing
- **Build**: `npm run build` MUST complete without errors
- **TypeScript**: No `any` types except where absolutely necessary with explicit justification

### Testing Standards

- **Unit Tests**: MUST cover all aggregate methods, domain services, and value object behavior
- **Integration Tests**: MUST cover application service orchestration and gateway interactions
- **E2E Tests**: MUST cover complete user flows through API endpoints
- **Test Coverage**: Aim for >80% coverage, but quality over quantity
- **Test Naming**: Use descriptive names that explain what is being tested and expected outcome

### Domain Model Quality

- No anemic domain models (entities with only getters/setters and no behavior)
- No business logic in application services (orchestration only)
- No business logic in infrastructure layer
- No primitive obsession in domain layer
- No public setters on aggregates

## Development Workflow

### Before Implementation

1. Identify which lesson/stage the task relates to (Stages 1-4)
2. Read relevant lesson documentation: `/docs/lessons/lesson-{n}.md`
3. Read relevant DDD pattern documentation: `/docs/ddd-patterns/*.md`
4. Review domain specifications if needed: `/docs/domain/*.md`
5. Create draft pull request for work package with initial description
6. Write tests FIRST following TDD

### During Implementation

1. Write failing tests that express expected behavior
2. Implement minimum code to make tests pass
3. Refactor while keeping tests green
4. Ensure domain layer remains pure (no infrastructure dependencies)
5. Use intention-revealing method names
6. Apply layered architecture strictly
7. Run quality gates frequently
8. Update PR description incrementally after each significant commit

### Code Placement Guidelines

- **Aggregates, Entities, Value Objects**: `src/domain/`
- **Domain Services**: `src/domain/`
- **Domain Events**: `src/domain/`
- **Repository Interfaces**: `src/domain/`
- **Application Services**: `src/application/`
- **DTOs**: `src/application/`
- **Gateway Interfaces**: `src/application/`
- **Repository Implementations**: `src/infrastructure/`
- **Gateway Implementations**: `src/infrastructure/`
- **NestJS Modules, Controllers, Providers**: `src/infrastructure/`

### After Implementation

1. Run full test suite: `npm run test` and `npm run test:e2e`
2. Run linting: `npm run lint`
3. Run formatting: `npm run format`
4. Verify build: `npm run build`
5. Review against Constitution principles
6. Create atomic commit following Conventional Commits (Principle VIII):
   - Examples:
     - `test: add unit tests for Order.markAsPaid()`
     - `feat: implement payment processing in Order aggregate`
     - `refactor: extract pricing calculation to domain service`
     - `fix: correct quantity validation in CartItem`
     - `docs: update architecture documentation for Stage 3`
7. Push commit to feature branch and update PR description incrementally
8. Mark PR as ready for review when work package is complete

## Governance

### Amendment Process

1. Proposed amendments MUST be documented in a pull request
2. Amendments require justification based on project learnings
3. Major changes (principle additions/removals) require team consensus
4. All amendments MUST update version number following semantic versioning

### Versioning Policy

- **MAJOR**: Backward incompatible changes, principle removals, fundamental redefinitions
- **MINOR**: New principles added, material expansions to existing principles
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- All pull requests MUST verify compliance with constitution principles
- Code reviews MUST explicitly check for:
  - Domain layer purity (Principle I)
  - Layered architecture adherence (Principle II)
  - Proper aggregate design (Principle III)
  - Value Object usage (Principle IV)
  - TDD evidence (Principle V)
  - ACL implementation (Principle VI)
  - Intention-revealing naming (Principle VII)
  - Conventional Commits usage (Principle VIII)

### Work Package & Release Management

Work packages MUST be organized into pull requests and releases MUST follow semantic versioning to enable clear version communication and automated tooling.

**Pull Request Workflow:**
- Create PR at the **start** of work package (draft PR recommended)
- One PR per feature/fix/improvement (work package)
- PR title follows Conventional Commits format (e.g., `feat: add shopping cart aggregate`)
- PR description MUST be updated incrementally as work progresses
- PR description includes:
  - Summary of changes (updated as work evolves)
  - Link to related issues/specs
  - Testing performed (updated after each test/implementation)
  - Breaking changes (if any)
  - Checklist of constitution compliance (checked off incrementally)
- All commits in PR MUST follow Conventional Commits specification
- PR MUST pass all quality gates before merge
- Squashing commits is discouraged; preserve atomic commit history
- Mark PR as ready for review only when work package is complete

**Rationale:** Creating PRs early and updating them incrementally ensures documentation stays current, enables early feedback, provides visibility into work in progress, and reduces the burden of writing comprehensive descriptions at the end.

**Semantic Versioning:**
- Format: MAJOR.MINOR.PATCH (e.g., 1.2.3)
- **MAJOR**: Breaking changes, API incompatibilities, removing features
- **MINOR**: New features, backward-compatible additions
- **PATCH**: Bug fixes, backward-compatible fixes, documentation updates
- Version tags MUST be created for all releases (e.g., `v1.2.3`)
- CHANGELOG MUST be maintained (can be auto-generated from commits)

**Release Process:**
1. Aggregate related PRs into a release
2. Determine version bump based on commit types:
   - Any breaking change (BREAKING CHANGE in footer) → MAJOR bump
   - Any `feat` commit → MINOR bump minimum
   - Only `fix`, `refactor`, `test`, `docs`, etc. → PATCH bump
3. Create release tag: `vMAJOR.MINOR.PATCH`
4. Generate release notes from conventional commits
5. Update CHANGELOG.md with release notes
6. Announce release with clear communication of changes

**Rationale:** Structured work packages enable better project tracking, semantic versioning communicates change impact clearly to consumers, and conventional commits enable automated release tooling and changelog generation.

### Constitution Supersedes All

This constitution supersedes conflicting practices in:
- Team conventions not documented here
- External style guides
- Individual preferences
- Framework defaults that violate principles

When in doubt, refer to the DDD pattern documentation in `/docs/ddd-patterns/` and the project guidance in `CLAUDE.md`.

### Complexity Justification

Any violation of these principles MUST be:
1. Explicitly documented in code comments
2. Justified in pull request description
3. Accompanied by explanation of simpler alternatives rejected
4. Approved by at least one other team member

**Version**: 1.1.0 | **Ratified**: 2025-12-27 | **Last Amended**: 2025-12-27
