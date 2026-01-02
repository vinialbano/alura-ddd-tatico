# Feature Specification: Order Domain and Checkout Flow

**Feature Branch**: `002-order-domain`
**Created**: 2025-12-28
**Status**: Draft
**Input**: User description: "Build an Order domain for an e-commerce Orders context that turns a Shopping Cart into an Order and manages the Order lifecycle through clear states and rules. Model Order as an aggregate root that owns its OrderItems and supports state transitions: it starts in AwaitingPayment after checkout, can be marked as Paid by recording a paymentId only when in a payable state, and can be Cancelled by recording a cancellation reason only when in a cancelable state; attempts to pay or cancel in invalid states must fail with a clear functional error. Use rich value objects to avoid primitive types and ensure consistency: Money must include a currency and must never be negative, ShippingAddress must require and document its minimum required fields, and ProductSnapshot must capture the essential product data at the time of purchase so the Order is stable even if the catalog changes later. Define functional contracts for synchronous checkout-time dependencies on external contexts: a product data contract used to build ProductSnapshot, and a pricing contract used to compute unit prices, line totals, discounts (if applicable), and overall order totals, making the minimum required inputs/outputs explicit. Implement a pricing domain service that, given cart items (product + quantity), produces fully priced order items including unit price, line total, order total, and required product snapshots, and fails with a clear functional error when any item cannot be priced (e.g., missing product or price). Finally, specify the checkout behavior as a single use case exposed via POST /orders/checkout: given a cart with valid items and a shipping address, it creates a new Order in AwaitingPayment with snapshots and totals; it rejects empty carts; and it prevents re-checkout of an already converted cart (either by failing or by returning the previously created order—choose one consistent behavior and document it)."

## Clarifications

### Session 2025-12-28

- Q: Order identifier generation strategy - how should orders be uniquely identified? → A: System-generated UUID
- Q: Order creation timestamp requirements - what temporal tracking is needed in the domain model? → A: Creation timestamp only
- Q: ShippingAddress required fields - what are the minimum required fields for a valid shipping address? → A: Street, city, state/province, postal code, country (5 fields)
- Q: ProductSnapshot essential attributes - what are the minimum required fields for product snapshot? → A: Name, description, SKU (3 fields minimum)
- Q: Currency code standard - what format should be used for currency codes in Money value object? → A: ISO 4217 3-letter codes (USD, EUR, BRL, etc.)
- Q: When two customers or systems attempt to checkout the same cart simultaneously (race condition), what should happen? → A: First request wins, second request returns existing order (idempotent). Race condition handling is an infrastructure concern, not domain model concern.
- Q: When external services (Product Catalog or Pricing) fail to respond within the 2-second checkout SLA, what should happen? → A: Fail immediately with timeout error
- Q: Should the system log domain events (OrderCreated, OrderPaid, OrderCancelled) for observability and debugging? → A: No. Domain events will be added later in a future phase.
- Q: What authentication/authorization model should be enforced for order operations (checkout, markAsPaid, cancel)? → A: No authentication in domain layer, handled by infrastructure/application layer
- Q: Should discount information be explicitly modeled in OrderItem or Order aggregate, or just included in the calculated totals? → A: Explicit discount fields: itemDiscount (per OrderItem for product-level promotions), orderLevelDiscount (at Order aggregate for cart-wide promotions/coupons)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Order from Cart (Priority: P1)

A customer completes shopping, adds items to their cart, and proceeds to checkout. The system transforms the shopping cart into a formal order with captured product information and pricing, creating a record of their purchase intent that persists even if product catalog changes later.

**Why this priority**: This is the core transaction flow that enables the business to accept orders. Without this, no orders can be created.

**Independent Test**: Can be fully tested by submitting a valid cart with items and shipping address to the checkout endpoint, verifying that an order is created in AwaitingPayment state with correct totals and product snapshots.

**Acceptance Scenarios**:

1. **Given** a shopping cart with 2 valid items and a complete shipping address, **When** customer proceeds to checkout, **Then** system creates an order in AwaitingPayment state with all item details, prices, and totals captured
2. **Given** a shopping cart with valid items, **When** checkout is requested, **Then** system captures product snapshots (name, description, SKU) so order remains stable if catalog changes
3. **Given** a shopping cart with 3 items at different price points, **When** checkout completes, **Then** system calculates and stores unit price, line total for each item, and overall order total
4. **Given** a valid shipping address with all required fields, **When** order is created, **Then** shipping address is stored with the order

---

### User Story 2 - Reject Invalid Checkout Attempts (Priority: P1)

Customers cannot create orders from invalid cart states. The system prevents order creation from empty carts or carts with items that cannot be priced, providing clear feedback about what went wrong.

**Why this priority**: Data integrity is critical - we cannot create orders with missing or invalid information. This prevents downstream fulfillment issues.

**Independent Test**: Can be tested independently by attempting checkout with various invalid cart states (empty cart, missing product data, missing price data) and verifying appropriate errors are returned.

**Acceptance Scenarios**:

1. **Given** an empty shopping cart, **When** customer attempts checkout, **Then** system rejects with clear error indicating cart is empty
2. **Given** a cart with an item that has no product data available, **When** checkout is attempted, **Then** system rejects with error indicating which item cannot be priced
3. **Given** a cart with an item that has no price available, **When** checkout is attempted, **Then** system rejects with error indicating pricing failure for that item
4. **Given** incomplete shipping address (missing required fields), **When** checkout is attempted, **Then** system rejects with error indicating which address fields are missing

---

### User Story 3 - Prevent Duplicate Orders from Same Cart (Priority: P1)

Once a shopping cart has been converted to an order, subsequent checkout attempts with the same cart are prevented. This protects customers from accidentally creating duplicate orders.

**Why this priority**: Prevents duplicate order creation which could lead to double-charging customers and fulfillment confusion.

**Independent Test**: Can be tested by successfully checking out a cart once, then attempting to check out the same cart again and verifying the system prevents duplication (either by returning the existing order or by rejecting the request).

**Acceptance Scenarios**:

1. **Given** a cart that has already been converted to an order, **When** checkout is attempted again with the same cart, **Then** system returns the existing order instead of creating a new one
2. **Given** an order created from cart X, **When** another checkout attempt is made for cart X, **Then** system prevents duplicate order creation and provides the existing order ID

---

### User Story 4 - Mark Order as Paid (Priority: P2)

When payment is successfully processed by the payment system, the order must be marked as paid. This transition is only allowed when the order is in a state that can accept payment (AwaitingPayment state).

**Why this priority**: Critical for order fulfillment flow - paid orders can proceed to fulfillment while unpaid orders cannot.

**Independent Test**: Can be tested by creating an order in AwaitingPayment state, marking it as paid with a payment ID, and verifying the state transition. Also test that paid orders cannot be paid again.

**Acceptance Scenarios**:

1. **Given** an order in AwaitingPayment state, **When** payment confirmation is received with valid payment ID, **Then** order is marked as Paid and payment ID is recorded
2. **Given** an order already in Paid state, **When** another payment attempt is made, **Then** system rejects with error indicating order is already paid
3. **Given** an order in Cancelled state, **When** payment attempt is made, **Then** system rejects with error indicating cancelled orders cannot be paid

---

### User Story 5 - Cancel Order with Reason (Priority: P2)

Customers or customer service can cancel orders that have not yet been paid or fulfilled. Each cancellation must record a reason explaining why the order was cancelled.

**Why this priority**: Provides order lifecycle management and customer flexibility. Important for customer satisfaction but not required for basic order creation flow.

**Independent Test**: Can be tested by creating an order and cancelling it with a reason, verifying state changes to Cancelled. Also test that paid orders can be cancelled with appropriate reason recorded.

**Acceptance Scenarios**:

1. **Given** an order in AwaitingPayment state, **When** cancellation is requested with reason "Customer changed mind", **Then** order is marked as Cancelled and reason is recorded
2. **Given** an order already in Paid state, **When** cancellation is requested with reason "Customer requested refund", **Then** order is marked as Cancelled and reason is recorded (refund processing handled separately)
3. **Given** an order already in Cancelled state, **When** another cancellation attempt is made, **Then** system rejects with error indicating order is already cancelled

---

### User Story 6 - Handle State Transition Errors (Priority: P2)

System enforces state machine rules strictly. Any attempt to transition an order to an invalid state provides clear, actionable error messages explaining why the transition is not allowed.

**Why this priority**: Ensures data integrity and provides good developer/user experience when integrating with the order system.

**Independent Test**: Can be tested by attempting invalid state transitions (e.g., paying a cancelled order, cancelling a paid order) and verifying appropriate errors are returned.

**Acceptance Scenarios**:

1. **Given** an order in Cancelled state, **When** payment is attempted, **Then** system returns clear error "Cannot pay cancelled order"
2. **Given** an order state and an invalid transition, **When** transition is attempted, **Then** error message clearly indicates current state, attempted action, and why it's not allowed
3. **Given** any order state, **When** an invalid operation is attempted, **Then** order state remains unchanged and error is returned

---

### Edge Cases

- What happens when external product service is unavailable during checkout? (Should fail immediately with timeout error indicating product data unavailable)
- What happens when external pricing service is unavailable during checkout? (Should fail immediately with timeout error indicating pricing unavailable)
- What happens when a product is deleted from the catalog after order is created? (Order retains product snapshot so remains valid)
- What happens when a product price changes after order is created? (Order retains original price from checkout time)
- What happens when shipping address validation fails? (Checkout rejected with validation errors)
- What happens if currency is not specified for a price? (Should fail validation)
- What happens if quantity is zero or negative? (Should fail validation during cart creation, before checkout)
- What happens if money amount is negative? (Should fail validation)

## Requirements *(mandatory)*

### Functional Requirements

#### Order Aggregate & Lifecycle

- **FR-001**: System MUST create orders with system-generated UUID identifier and creation timestamp in AwaitingPayment state when checkout is completed successfully
- **FR-002**: System MUST enforce that orders can only transition to Paid state when currently in AwaitingPayment state
- **FR-003**: System MUST allow orders in AwaitingPayment or Paid states to transition to Cancelled state; Cancelled orders cannot be cancelled again
- **FR-004**: System MUST record payment ID when marking order as Paid
- **FR-005**: System MUST record cancellation reason when marking order as Cancelled
- **FR-006**: System MUST reject state transition attempts that violate state machine rules with clear functional errors
- **FR-007**: System MUST preserve order state when invalid transitions are attempted

#### Value Objects & Data Consistency

- **FR-008**: System MUST represent all monetary values with explicit ISO 4217 3-letter currency code
- **FR-009**: System MUST reject negative monetary amounts
- **FR-010**: System MUST validate shipping address contains all 5 required fields (street address, city, state/province, postal code, country) before order creation
- **FR-011**: System MUST capture product snapshot with 3 required fields (name, description, SKU) at checkout time
- **FR-012**: System MUST ensure order items remain stable even if product catalog is modified or deleted after order creation

#### Checkout Process

- **FR-013**: System MUST provide a checkout endpoint (POST /orders/checkout) that accepts cart ID and shipping address
- **FR-014**: System MUST reject checkout attempts for empty carts with clear error message
- **FR-015**: System MUST prevent duplicate orders from the same cart by returning existing order on subsequent checkout attempts
- **FR-016**: System MUST validate shipping address completeness before creating order
- **FR-017**: System MUST reject checkout if any cart item cannot be priced, indicating which item failed

#### Pricing & Calculation

- **FR-018**: System MUST calculate unit price for each order item at checkout time
- **FR-019**: System MUST calculate line total (unit price × quantity) for each order item
- **FR-020**: System MUST calculate order total (sum of all line totals, minus item-level discounts, minus order-level discount)
- **FR-021**: System MUST capture item-level discount for each order item (zero if no discount applied)
- **FR-022**: System MUST capture order-level discount at Order aggregate (zero if no discount applied)
- **FR-023**: System MUST fail checkout with clear error when pricing service cannot provide price for any item
- **FR-024**: System MUST capture all pricing calculations (unit price, line totals, item discounts, order-level discount, order total) at checkout time and store with order
- **FR-029**: System MUST provide a pricing domain service (OrderPricingService) that orchestrates pricing logic: accepts cart items, retrieves product data for snapshots, calculates unit prices, line totals, discounts, and order total, and returns fully priced order items ready for Order aggregate creation

#### External Context Integration

- **FR-030**: System MUST timeout external service calls (Product Catalog, Pricing context) after 2 seconds and fail checkout with clear timeout error message

- **FR-025**: System MUST define explicit contract for retrieving product data (input: product ID; output: name, description, SKU for snapshot)
- **FR-026**: System MUST define explicit contract for pricing calculation (input: cart items with product ID and quantity; output: unit prices, line totals, item-level discounts, order-level discount, order total)
- **FR-027**: System MUST fail checkout with clear functional error when product data cannot be retrieved
- **FR-028**: System MUST fail checkout with clear functional error when pricing calculation fails

### Key Entities

- **Order**: Aggregate root representing a customer's purchase. Uniquely identified by system-generated UUID. Contains creation timestamp, order state (AwaitingPayment, Paid, Cancelled), order items, shipping address, order-level discount (Money, zero if none applied), total amount, payment ID (when paid), and cancellation reason (when cancelled). Owns OrderItem collection.

- **OrderItem**: Entity within Order aggregate representing a single line item. Contains product snapshot, quantity, unit price, item-level discount (Money, zero if none applied), and line total. Lifecycle managed by parent Order.

- **ProductSnapshot**: Value object capturing essential product information at checkout time. Required fields: name, description, SKU (all 3 fields mandatory). Immutable once created. Ensures order stability when catalog changes.

- **Money**: Value object representing monetary amount with currency. Must include ISO 4217 3-letter currency code (e.g., USD, EUR, BRL) and non-negative amount. Immutable.

- **ShippingAddress**: Value object representing delivery location. Required fields: street address, city, state/province, postal code, country (all 5 fields mandatory). Optional fields: address line 2, delivery instructions. Immutable once captured.

- **ShoppingCart**: Pre-existing aggregate (from earlier phase) containing cart items. Referenced during checkout to create Order.

- **CartItem**: Pre-existing entity within ShoppingCart containing product ID and quantity. Source data for OrderItem creation.

- **OrderPricingService**: Domain Service responsible for orchestrating pricing logic during checkout. Accepts cart items, retrieves product data for creating product snapshots, calculates unit prices, line totals, item-level discounts, order-level discount, and order total. Returns fully priced OrderItems ready for Order aggregate creation. Fails with clear functional error when any item cannot be priced or when product data is unavailable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Valid checkout requests with available products and pricing complete successfully within 2 seconds
- **SC-002**: Invalid checkout requests (empty cart, missing data, invalid state) return clear error messages indicating the specific issue
- **SC-003**: Orders maintain data integrity - product snapshots remain valid even if catalog products are deleted or modified
- **SC-004**: 100% of state transition attempts respect state machine rules - no order ever enters an invalid state
- **SC-005**: Duplicate checkout attempts for the same cart return existing order, preventing accidental duplicate orders
- **SC-006**: All monetary values include explicit ISO 4217 currency code (USD, EUR, BRL, etc.), eliminating currency ambiguity
- **SC-007**: Payment marking succeeds only when order is in AwaitingPayment state; attempts from other states fail with clear errors
- **SC-008**: Order cancellation succeeds only when order is in cancellable state; invalid cancellation attempts fail with clear errors
- **SC-009**: Pricing calculations (unit price, line total, order total) are accurately captured at checkout and stored with order
- **SC-010**: System gracefully handles external service failures (pricing, product data) during checkout with clear error messages

## Assumptions

1. **Currency handling**: All prices within a single order use the same currency. Multi-currency orders are not supported in this phase.
2. **Shipping address validation**: Basic structure validation only (required fields present). Full address verification (geocoding, postal service validation) is handled elsewhere or not in scope.
3. **Cart-to-Order relationship**: One cart produces at most one order. Cart is considered "consumed" after successful checkout.
4. **State machine for cancellation**: Orders in Paid state can be cancelled (with cancellation reason), allowing for customer service scenarios. Orders in Cancelled state cannot transition to any other state.
5. **Discount handling**: Discounts are calculated by pricing service and provided in pricing contract output. Item-level discounts apply to individual OrderItems (product promotions). Order-level discount applies to entire order (cart-wide promotions/coupons). Both stored as Money value objects (zero if no discount). Order total = sum(line totals) - sum(item discounts) - order-level discount.
6. **Product snapshot completeness**: Required fields are name, description, SKU (exactly 3 mandatory fields). No additional product attributes in this phase.
7. **Pricing service contract**: Pricing service is responsible for applying business rules (volume discounts, promotions, tax calculations if applicable). Order domain stores the results.
8. **Error granularity**: When checkout fails due to pricing issues, error indicates which specific product/item failed, not just generic "pricing failed".
9. **Idempotency strategy**: Re-checkout of same cart returns existing order. This is a GET-like behavior for duplicate requests rather than error rejection. Concurrent checkout race conditions are handled at the infrastructure layer, not in the domain model.
10. **Payment ID format**: Payment ID is an opaque string provided by payment system. Order domain does not validate format, only that it's provided and non-empty.
11. **Authentication/Authorization**: Domain layer does not enforce authentication or authorization. Access control and user identity verification are infrastructure/application layer concerns. Domain focuses purely on business rules and state transitions.
12. **Pricing orchestration responsibility**: OrderPricingService is a Domain Service that encodes domain pricing orchestration logic. It coordinates with external contexts (Product Catalog, Pricing) via gateways to gather data, but the orchestration logic itself represents domain knowledge about how to assemble a complete priced order. Application layer invokes this domain service during checkout use case execution.

## Dependencies

### Internal Dependencies
- **ShoppingCart aggregate**: Must exist and be accessible to retrieve cart items during checkout
- **CartItem entities**: Must provide product ID and quantity for pricing and order creation

### External Context Dependencies (Synchronous)
- **Product Catalog context**: Provides product data for creating product snapshots during checkout
  - **Contract**: Input: Product ID → Output: Product details (name, description, SKU, attributes) or error if not found
  - **Timeout behavior**: Must fail immediately with timeout error if service does not respond within SLA
- **Pricing context**: Calculates prices, discounts, and totals for cart items during checkout
  - **Contract**: Input: List of (Product ID, Quantity) → Output: Unit prices, line totals, item-level discounts (per item), order-level discount, order total, or error if pricing fails
  - **Timeout behavior**: Must fail immediately with timeout error if service does not respond within SLA

### Future Dependencies (Noted for Later Phases)
- **Payment context**: Will integrate asynchronously for payment processing (not in this phase)
- **Inventory context**: Will integrate asynchronously for stock reservation (not in this phase)

## Out of Scope

- Authentication and authorization (handled at infrastructure/application layer, not domain responsibility)
- Domain events (OrderCreated, OrderPaid, OrderCancelled) will be added in a future phase focused on event-driven architecture
- Asynchronous event-driven integration with Payment and Inventory contexts (future phase)
- Order fulfillment and shipping workflows (separate bounded context)
- Order modification after creation (changing items, quantities, address)
- Partial payments or installment plans
- Multi-currency orders or currency conversion
- Full address validation/verification with postal services
- Tax calculation details (assumed to be handled by pricing service if needed)
- Return/refund processing
- Order history and tracking UI (separate concern)
