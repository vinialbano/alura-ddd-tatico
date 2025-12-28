# Feature Specification: Shopping Cart Domain Model

**Feature Branch**: `001-shopping-cart-model`
**Created**: 2025-12-27
**Status**: Draft
**Input**: User description: "Build a Shopping Cart domain model for an e-commerce Orders context. The cart represents a draft version of a future Order, so it must encapsulate business rules inside the domain model (not scattered across controllers or persistence). Implement the ShoppingCart as an aggregate root that owns its cart items, supporting the behaviors of adding an item, updating an item quantity, and removing an item. Enforce invariants such as quantity always being greater than zero and preventing the same product from appearing more than once in the cart (either reject duplicates or consolidate them into a single line item, but define one clear behavior). Also ensure the cart can be marked as converted so that no further modifications are allowed once it has been turned into an order. Use explicit value objects for identifiers and quantities (e.g., CartId, CustomerId, ProductId, Quantity) to avoid primitive obsession and make the ubiquitous language explicit."

## Clarifications

### Session 2025-12-27

- Q: What happens if the system attempts to convert an empty cart? → A: Reject empty cart conversion - System prevents converting carts with zero items, raising a domain error
- Q: Is there a maximum number of unique products or total quantity allowed in a cart? → A: Aggressive limits - 20 unique products maximum, 10 quantity maximum per item
- Q: How does the system handle concurrent modifications to the same cart? → A: No explicit concurrency control in domain model - Last-write-wins approach; infrastructure layer can add optimistic locking if needed later
- Q: What happens when a customer tries to add a product that no longer exists in the catalog? → A: Defer validation to conversion - Cart accepts any ProductId; product existence validated only during cart-to-order conversion
- Q: Can a cart exist without a customer identifier? → A: Customer required - Every cart must be associated with a CustomerId at creation time; no anonymous carts allowed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Products to Shopping Cart (Priority: P1)

A customer browsing the e-commerce catalog wants to add products to their shopping cart. When they select a product and specify a quantity, it should be added to their cart. If the product is already in the cart, the system should consolidate quantities into a single line item rather than creating duplicate entries.

**Why this priority**: This is the foundational behavior of any shopping cart. Without the ability to add items, no other cart functionality can be used. This represents the core value proposition.

**Independent Test**: Can be fully tested by creating a cart, adding products with various quantities, and verifying items appear in the cart with correct quantities. Delivers immediate value by allowing customers to collect items before checkout.

**Acceptance Scenarios**:

1. **Given** an empty shopping cart, **When** a customer adds a product with quantity 3, **Then** the cart contains one line item with that product and quantity 3
2. **Given** a cart with Product A (quantity 2), **When** the customer adds Product A with quantity 3, **Then** the cart contains one line item with Product A and quantity 5
3. **Given** a cart with Product A, **When** the customer adds Product B, **Then** the cart contains two separate line items
4. **Given** an empty cart, **When** a customer attempts to add a product with quantity 0 or negative, **Then** the system rejects the operation with a meaningful error

---

### User Story 2 - Update Item Quantities (Priority: P2)

A customer who has already added items to their cart wants to change the quantity of a specific item without removing it completely. They should be able to increase or decrease quantities while maintaining cart integrity.

**Why this priority**: This is a common scenario where customers adjust their purchase decisions. While not absolutely critical for MVP (they could remove and re-add), it significantly improves user experience and reduces friction.

**Independent Test**: Can be tested by creating a cart with items, updating quantities, and verifying the changes persist correctly. Delivers value by allowing quantity adjustments without starting over.

**Acceptance Scenarios**:

1. **Given** a cart with Product A (quantity 3), **When** the customer updates Product A to quantity 5, **Then** the cart shows Product A with quantity 5
2. **Given** a cart with Product A (quantity 5), **When** the customer updates Product A to quantity 1, **Then** the cart shows Product A with quantity 1
3. **Given** a cart with Product A, **When** the customer attempts to update quantity to 0 or negative, **Then** the system rejects the operation with a meaningful error
4. **Given** a cart with Product A, **When** the customer attempts to update a non-existent Product B, **Then** the system rejects the operation

---

### User Story 3 - Remove Items from Cart (Priority: P2)

A customer wants to remove an item completely from their shopping cart, such as when they change their mind about a purchase or added something by mistake.

**Why this priority**: Essential for cart management but slightly lower priority than adding items. Customers can work around this by adjusting quantities to zero if necessary, but explicit removal is cleaner.

**Independent Test**: Can be tested by creating a cart with items, removing specific items, and verifying they no longer appear. Delivers value by allowing customers to manage their cart contents.

**Acceptance Scenarios**:

1. **Given** a cart with Product A and Product B, **When** the customer removes Product A, **Then** the cart contains only Product B
2. **Given** a cart with only Product A, **When** the customer removes Product A, **Then** the cart is empty
3. **Given** an empty cart, **When** the customer attempts to remove any product, **Then** the system rejects the operation
4. **Given** a cart with Product A, **When** the customer attempts to remove Product B (not in cart), **Then** the system rejects the operation

---

### User Story 4 - Prevent Modification After Conversion (Priority: P1)

Once a shopping cart has been converted into an order, no further modifications should be allowed. This ensures data integrity and prevents inconsistencies between what was ordered and what remains in the cart.

**Why this priority**: Critical for business integrity. If carts can be modified after conversion, it creates data inconsistencies, potential financial discrepancies, and confusion about what was actually ordered. This is a fundamental invariant.

**Independent Test**: Can be tested by converting a cart to an order, then attempting to add, update, or remove items. All operations should be rejected. Delivers value by preventing data corruption and maintaining audit trails.

**Acceptance Scenarios**:

1. **Given** a cart that has been converted to an order, **When** a customer attempts to add a new item, **Then** the system rejects the operation indicating the cart is no longer modifiable
2. **Given** a converted cart, **When** a customer attempts to update an item quantity, **Then** the system rejects the operation
3. **Given** a converted cart, **When** a customer attempts to remove an item, **Then** the system rejects the operation
4. **Given** an active (non-converted) cart, **When** it is marked as converted, **Then** all subsequent modification attempts are rejected

---

### Edge Cases

- Product existence not validated during cart operations; validation deferred to cart-to-order conversion
- Concurrent modifications use last-write-wins with no domain-level locking (infrastructure can add optimistic locking)
- What happens if a product's details (name, price) change while it's sitting in a cart?
- Every cart requires a CustomerId at creation; no anonymous or guest carts supported
- Empty cart conversion is rejected with a domain error (no orders can be created from empty carts)
- Cart enforces maximum of 20 unique products and maximum quantity of 10 per item
- How long does a cart remain valid before expiration?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow adding a product with a specified quantity to a shopping cart
- **FR-002**: System MUST consolidate duplicate products into a single line item by summing quantities
- **FR-003**: System MUST enforce that all item quantities are strictly greater than zero and not exceeding 10
- **FR-004**: System MUST allow updating the quantity of an existing cart item
- **FR-005**: System MUST allow removing a specific item from the cart completely
- **FR-006**: System MUST prevent any modifications (add, update, remove) to a cart once it has been marked as converted
- **FR-007**: System MUST use explicit value objects for CartId, CustomerId, ProductId, and Quantity
- **FR-008**: System MUST encapsulate all business rules within the ShoppingCart aggregate root
- **FR-009**: System MUST reject operations that attempt to add, update, or remove items with invalid quantities (zero or negative)
- **FR-010**: System MUST reject operations that attempt to modify non-existent cart items
- **FR-011**: System MUST maintain a clear cart status indicating whether it is active or converted
- **FR-012**: Each shopping cart MUST be associated with a unique customer identifier at creation time (no anonymous carts)
- **FR-013**: System MUST track which products are in the cart and their respective quantities
- **FR-014**: System MUST prevent conversion of empty carts (carts with zero items) and raise a domain error
- **FR-015**: System MUST enforce a maximum of 20 unique products in a cart
- **FR-016**: System MUST reject adding or updating items if the resulting quantity exceeds 10 for that item

### Key Entities

- **ShoppingCart (Aggregate Root)**: Represents a customer's draft order containing selected products and quantities. Owns all cart items and enforces invariants around item management and conversion status. Contains a unique cart identifier, customer identifier, collection of cart items, and conversion status.

- **CartItem (Entity within Aggregate)**: Represents a single line item in the cart, associating a specific product with its selected quantity. Contains product identifier and quantity value object. Managed exclusively by the ShoppingCart aggregate.

- **CartId (Value Object)**: Unique identifier for a shopping cart instance, preventing primitive obsession and making the domain model explicit.

- **CustomerId (Value Object)**: Identifies the customer who owns the cart, encapsulating customer identity as a domain concept. Required at cart creation time.

- **ProductId (Value Object)**: Identifies a specific product in the catalog, ensuring product references are type-safe and explicit.

- **Quantity (Value Object)**: Represents a positive integer quantity of items, enforcing the invariant that quantities must always be greater than zero and not exceed 10.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can add products to their cart and see them reflected immediately
- **SC-002**: Attempting to add duplicate products consolidates quantities correctly 100% of the time
- **SC-003**: All operations that violate quantity invariants (zero or negative) are rejected with clear error messages
- **SC-004**: Once converted, zero cart modification attempts succeed (100% rejection rate for converted carts)
- **SC-005**: Cart state remains consistent across all operations with no orphaned or invalid data
- **SC-006**: Business rules are enforced at the domain model level, not in controllers or persistence layers

## Assumptions *(optional)*

- Products referenced by ProductId are assumed to exist in a separate Catalog bounded context; validation of product existence happens during cart-to-order conversion, not during cart item addition
- Carts are assumed to be single-customer owned; there is no concept of shared carts
- Quantity consolidation strategy is additive (sum quantities when adding duplicate products)
- Price information is not stored in the cart model; prices are fetched from the Catalog/Pricing context when needed
- Cart persistence mechanism (in-memory, database) is infrastructure concern and not specified in this domain model
- Conversion to order is triggered by external application service; the cart only tracks conversion status
- No explicit cart expiration logic is required at this stage
- Product snapshots (capturing product details at time of cart creation) are not required for this initial model
- Concurrent cart access uses last-write-wins; no versioning or locking enforced at domain level (defer to infrastructure if needed)

## Out of Scope *(optional)*

- Shopping cart checkout/payment processing
- Product catalog management
- Pricing calculations and discounts
- Tax calculations
- Shipping cost estimation
- Cart sharing between customers
- Persistent storage implementation
- REST API endpoints or controllers
- User interface components
- Cart abandonment tracking
- Email notifications for cart reminders
- Product availability/inventory checks during cart operations
- Multi-currency support
- Guest cart to registered user cart migration
