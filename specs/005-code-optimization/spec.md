# Feature Specification: Code Optimization & Test Infrastructure

**Feature Branch**: `005-code-optimization`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "Now that we have our project complete, let's optimize the code and the tests to get cleaner and more reusable. Let's improve both the IDs creating a base class, create test data builders for the aggregates to simplify the tests, and improve the type safety. Help me scan the code base and search for optimizations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Creates Test Cases (Priority: P1)

As a developer writing test cases, I need simplified test data creation so that I can write clean, maintainable tests without repetitive setup code.

**Why this priority**: Test maintenance is critical for project sustainability. Current test files have 400+ lines of duplicated setup code, making tests harder to read and maintain. This directly impacts development velocity.

**Independent Test**: Can be fully tested by creating a single aggregate using test builders and verifying the resulting object matches expected values. Delivers immediate value by simplifying test authoring.

**Acceptance Scenarios**:

1. **Given** a need to create an Order for testing, **When** developer uses OrderBuilder with default values, **Then** a valid Order aggregate is created without manual setup
2. **Given** a need to customize test data, **When** developer chains builder methods with specific values, **Then** the Order reflects all custom values while maintaining valid defaults
3. **Given** multiple tests needing similar orders, **When** developer reuses the same builder configuration, **Then** each test receives consistent test data without code duplication

---

### User Story 2 - Developer Extends ID Value Objects (Priority: P1)

As a developer adding a new ID value object, I need a base class with common validation logic so that I can avoid duplicating UUID/string validation code across multiple ID types.

**Why this priority**: Seven ID value objects currently duplicate 200+ lines of validation logic. Each new ID adds more duplication. This is a foundational improvement that prevents future technical debt.

**Independent Test**: Can be fully tested by creating a new ID value object that extends the base class and verifying validation works correctly. Delivers value by making ID creation consistent and maintainable.

**Acceptance Scenarios**:

1. **Given** a need for a UUID-based ID, **When** developer extends UuidId base class, **Then** UUID validation, generation, and equality are automatically available
2. **Given** a need for a string-based ID, **When** developer extends StringId base class, **Then** non-empty validation and equality are automatically available
3. **Given** a need for a prefixed ID, **When** developer extends PrefixedId base class with a prefix pattern, **Then** prefix validation is automatically enforced
4. **Given** existing ID value objects, **When** refactored to use base classes, **Then** all existing tests continue to pass without modification

---

### User Story 3 - Developer Maps Domain to DTO (Priority: P2)

As a developer working in the application layer, I need centralized mappers so that domain-to-DTO conversion is consistent across all services without code duplication.

**Why this priority**: Order-to-DTO mapping logic is duplicated across CheckoutService and OrderService (90+ lines). Changes require updates in multiple places. This is a common source of bugs.

**Independent Test**: Can be fully tested by invoking the centralized mapper with an Order and verifying the resulting DTO matches expected structure. Delivers value by eliminating mapper duplication.

**Acceptance Scenarios**:

1. **Given** an Order aggregate, **When** mapper converts it to OrderResponseDTO, **Then** all Order properties are correctly mapped to DTO structure
2. **Given** CheckoutService and OrderService both need Order-to-DTO conversion, **When** both use the centralized mapper, **Then** conversion logic is consistent and maintained in one location
3. **Given** a change to Order structure, **When** mapper is updated, **Then** all services automatically use the updated mapping logic

---

### User Story 4 - Developer Enforces Type Safety (Priority: P2)

As a developer working with domain objects, I need strong typing for IDs and messages so that type errors are caught at compile time rather than runtime.

**Why this priority**: Current use of plain strings for PaymentId/ReservationId and `any` types in message handlers allows invalid data to compile. This creates runtime errors that could be prevented.

**Independent Test**: Can be fully tested by attempting to pass wrong ID type to a method and verifying compilation fails. Delivers value by catching errors earlier in development.

**Acceptance Scenarios**:

1. **Given** a method expecting PaymentId, **When** developer attempts to pass a string or different ID type, **Then** TypeScript compilation fails with clear error
2. **Given** a message handler registration, **When** handler is defined with specific payload type, **Then** TypeScript enforces payload type matches message type
3. **Given** Order aggregate storing payment/reservation IDs, **When** IDs are accessed, **Then** type system provides ID value object instead of plain string

---

### User Story 5 - Developer Creates Domain Exceptions (Priority: P3)

As a developer adding domain validation rules, I need a base exception class so that custom exceptions don't repeat boilerplate setup code.

**Why this priority**: Seven exception classes duplicate 70 lines of boilerplate. While functional, this is a nice-to-have improvement that reduces ceremony.

**Independent Test**: Can be fully tested by creating a new domain exception extending the base class and verifying it behaves like standard exceptions. Delivers value by simplifying exception creation.

**Acceptance Scenarios**:

1. **Given** a need for a new domain exception, **When** developer extends DomainException base class, **Then** error name and prototype setup are handled automatically
2. **Given** existing domain exceptions, **When** refactored to extend base class, **Then** exception behavior remains unchanged but code is reduced
3. **Given** exception thrown from domain layer, **When** caught in application layer, **Then** exception preserves stack trace and custom properties

---

### Edge Cases

- What happens when test builders receive invalid parameters (null, undefined)? Should fail fast with clear errors
- How do ID base classes handle edge cases like empty strings, invalid UUIDs, or malformed prefixes? Should throw descriptive validation errors
- What happens when mappers encounter null optional fields in Order? Should map to undefined in DTO
- How do strongly-typed IDs interact with serialization (JSON)? Should serialize to string representation
- What happens when mixing old string-based IDs with new value objects during migration? Should support both temporarily via factory methods

## Requirements *(mandatory)*

### Functional Requirements

**Test Infrastructure:**

- **FR-001**: System MUST provide builder classes for all major aggregates (Order, ShoppingCart, OrderItem)
- **FR-002**: Builders MUST support fluent API with method chaining for customization
- **FR-003**: Builders MUST provide sensible defaults for all required fields
- **FR-004**: Builders MUST produce valid domain objects that pass all invariant checks
- **FR-005**: Builders MUST be located in test utilities directory for easy reuse

**ID Value Objects:**

- **FR-006**: System MUST provide abstract base class for UUID-based IDs with built-in validation
- **FR-007**: System MUST provide abstract base class for string-based IDs with non-empty validation
- **FR-008**: System MUST provide abstract base class for prefixed IDs with pattern validation
- **FR-009**: All existing ID value objects (OrderId, CartId, ProductId, CustomerId, PaymentId, ReservationId, EventId) MUST be refactored to use base classes
- **FR-010**: ID base classes MUST implement value equality comparison
- **FR-011**: ID base classes MUST provide consistent factory methods (generate/create/fromString)

**Type Safety:**

- **FR-012**: Order aggregate MUST store paymentId as PaymentId value object instead of nullable string
- **FR-013**: Order aggregate MUST store reservationId as ReservationId value object instead of nullable string
- **FR-014**: MessageHandler interface MUST enforce specific payload types instead of `any` default
- **FR-015**: Repository and service method signatures MUST use ID value objects instead of plain strings
- **FR-016**: Test mocks MUST use proper type annotations instead of `as any` casting

**Code Organization:**

- **FR-017**: System MUST provide centralized Order-to-DTO mapper in `/src/application/mappers/`
- **FR-018**: CheckoutService and OrderService MUST use centralized mapper instead of local implementation
- **FR-019**: System MUST provide base DomainException class for common exception behavior
- **FR-020**: All domain exception classes MUST extend DomainException base class

**Validation Consolidation:**

- **FR-021**: Currency validation logic MUST be consolidated in single location (Money value object)
- **FR-022**: Non-empty string validation MUST be consolidated in StringId base class
- **FR-023**: UUID validation MUST be consolidated in UuidId base class

### Key Entities

- **Test Builders**: Fluent factories for creating valid test data with minimal setup (OrderBuilder, OrderItemBuilder, ShippingAddressBuilder, ProductSnapshotBuilder)
- **ID Base Classes**: Abstract classes providing common validation and equality for UUID, string, and prefixed identifier types
- **Domain Mappers**: Centralized conversion utilities for transforming aggregates to DTOs
- **Base Exception**: Common exception infrastructure providing consistent error behavior across domain

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Test file line count reduced by 30-40% (from ~1275 total lines to ~850 lines) through builder pattern adoption
- **SC-002**: ID value object code reduced by 200+ lines through base class extraction
- **SC-003**: Zero type errors related to ID confusion at compile time (enforced by TypeScript type system)
- **SC-004**: Duplicate mapper code eliminated (90 lines consolidated to single implementation)
- **SC-005**: Test setup time for new test cases reduced by 50% (developers can create valid aggregates in 1-3 lines instead of 10-20)
- **SC-006**: 100% of existing tests pass after refactoring (no behavioral changes)
- **SC-007**: Exception boilerplate reduced by 60% (70 lines to ~28 lines)
- **SC-008**: Zero usage of `any` type in domain and application layers (enforced by linter rules)

## Assumptions

- TypeScript strict mode is enabled, supporting advanced type checking features
- Existing test suite has good coverage and will validate refactoring safety
- Breaking changes to ID APIs are acceptable if migration path is clear
- Test builders follow common patterns (e.g., Jest, builder pattern conventions)
- Team is familiar with builder pattern and value object patterns
- Refactoring will be done incrementally with tests passing after each stage
- Current in-memory implementations don't require serialization compatibility
- Domain exception base class uses standard Error prototype chaining approach

## Constraints

- Changes must not break existing tests or domain behavior (behavioral preservation)
- Refactoring must maintain layered architecture boundaries (domain/application/infrastructure)
- ID value object APIs should remain backward compatible where possible
- Performance must not degrade (builder pattern has minimal overhead)
- All changes must follow existing DDD tactical patterns
- Code must maintain 100% test coverage after refactoring
- No changes to public API contracts (REST endpoints, DTOs)

## Dependencies

- Existing test suite for regression validation
- TypeScript compiler for type checking
- Jest testing framework for test utilities
- All existing domain, application, and infrastructure code
- ESLint configuration for type safety rules

## Out of Scope

- Performance optimization beyond removing duplication
- Refactoring of infrastructure layer (repositories, gateways) beyond type changes
- Changes to domain business rules or invariants
- Modification of REST API contracts or response structures
- Addition of new domain features or capabilities
- Changes to external integration patterns
- Database schema changes (project uses in-memory storage)
- Migration scripts for production data
- Documentation updates (will be separate follow-up)

## Notes

This specification focuses on code quality improvements through:
1. **Test Infrastructure** - Making tests easier to write and maintain
2. **Type Safety** - Catching errors at compile time
3. **Code Reuse** - Eliminating duplication through proper abstraction
4. **Architecture Cleanup** - Following DDD patterns more consistently

The refactoring prioritizes developer experience and maintainability while preserving all existing functionality. Each requirement supports the goal of making the codebase more maintainable as it grows.
