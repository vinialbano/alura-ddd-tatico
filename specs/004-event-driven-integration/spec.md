# Feature Specification: Event-Driven Integration Flow

**Feature Branch**: `004-event-driven-integration`
**Created**: 2026-01-05
**Status**: Draft
**Input**: User description: "Build an event-driven integration flow for an e-commerce Orders context that captures key business facts as domain events and propagates them across bounded contexts via a publish/subscribe message bus. The Orders domain must emit internal domain events whenever meaningful business outcomes occur: emit OrderPlaced when checkout completes successfully, emit OrderPaid when payment is confirmed successfully, and emit OrderCancelled when an order is cancelled successfully; each event must include a minimal, consistent payload such as orderId, a timestamp, and any essential business data required for downstream handling. Define a message bus contract that supports publishing and subscribing to messages, and explicitly map Orders domain events to integration message topics: OrderPlaced to order.placed, OrderPaid to order.paid, and OrderCancelled to order.cancelled (if cancellation needs to be integrated). Then simulate two external bounded contexts that react asynchronously to these topics: a Payments consumer that listens to order.placed and publishes payment.approved (and optionally payment.rejected if included in scope), with an output payload sufficient for Orders to apply the result (e.g., orderId and paymentId), and a Stock consumer that listens to order.paid and publishes stock.reserved with at least orderId and the minimum needed to update order state. Finally, specify Orders-side handlers for these external events: when Orders receives payment.approved for an order in AwaitingPayment it transitions the order to Paid; if the order is in an incompatible state the message is rejected or ignored according to a clearly defined rule; and duplicate payment events must have a defined, validated behavior (idempotent or explicit error). When Orders receives stock.reserved for an order in Paid it transitions the order to its final state (e.g., StockReserved); if the order is not Paid it applies the defined rule (ignore or error); and duplicate stock events must also have a defined, validated behavior. Include at least one demonstrable end-to-end scenario showing that consumers process published messages and that Orders state is eventually consistent after payment approval and stock reservation."

## Clarifications

### Session 2026-01-05

- Q: Should payment rejections be handled in scope, and if so, what should happen to the order? → A: Out of scope - Orders won't handle payment.rejected, focus only on success path
- Q: How should the system handle events for non-existent orders? → A: Log error and reject event - orderId must exist before processing
- Q: Should stock reservation failures be handled, and if so, how? → A: Out of scope - Stock consumer always succeeds (simulated), focus on success path
- Q: How should the system handle events that arrive out of expected sequence? → A: Log warning and ignore - rely on state machine validation (consistent with FR-018, FR-021)
- Q: Should payment timeout be handled, and if so, what's the timeout duration? → A: Out of scope - no timeout handling, orders wait indefinitely for payment

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Order Placement with Async Payment Processing (Priority: P1)

A customer completes checkout for their order, which initiates an asynchronous payment processing flow. The order transitions through states as external systems (Payments, Stock) process their work, eventually reaching a final fulfilled state without requiring the customer to wait synchronously at any step.

**Why this priority**: This is the core happy path that demonstrates the complete event-driven flow from order placement through payment approval and stock reservation. It delivers immediate value by decoupling order placement from payment/stock operations, improving user experience and system resilience.

**Independent Test**: Can be fully tested by placing an order through checkout and observing that: (1) order is created in AwaitingPayment state, (2) payment consumer processes the order.placed event and approves payment, (3) order transitions to Paid state, (4) stock consumer processes order.paid event and reserves stock, (5) order reaches final StockReserved state. Delivers value by proving eventual consistency across bounded contexts.

**Acceptance Scenarios**:

1. **Given** a customer has items in their shopping cart, **When** they complete checkout successfully, **Then** an order is created in AwaitingPayment state and an order.placed event is published to the message bus
2. **Given** an order.placed event is published, **When** the Payments consumer processes it, **Then** a payment.approved event is published containing the orderId and paymentId
3. **Given** a payment.approved event is received for an order in AwaitingPayment state, **When** the Orders context processes it, **Then** the order transitions to Paid state and an order.paid event is published
4. **Given** an order.paid event is published, **When** the Stock consumer processes it, **Then** a stock.reserved event is published containing the orderId
5. **Given** a stock.reserved event is received for an order in Paid state, **When** the Orders context processes it, **Then** the order transitions to StockReserved state (final state)

---

### User Story 2 - Order Cancellation Propagation (Priority: P2)

A customer or system administrator cancels an order before it's fulfilled. The cancellation is captured as a domain event and propagated to other bounded contexts so they can react appropriately (e.g., release reserved stock, refund payment).

**Why this priority**: Order cancellation is a critical business scenario that requires coordination across contexts. While not the primary flow, it must be supported to handle real-world scenarios. It's P2 because the basic integration flow (P1) must work first.

**Independent Test**: Can be fully tested by cancelling an order in a cancellable state and verifying that an order.cancelled event is published with complete order details. External consumers can subscribe to this event to trigger their own compensating actions. Delivers value by ensuring cancellations are visible across the system.

**Acceptance Scenarios**:

1. **Given** an order exists in a cancellable state (AwaitingPayment or Paid), **When** the order is cancelled, **Then** the order transitions to Cancelled state and an order.cancelled event is published
2. **Given** an order.cancelled event is published, **When** external bounded contexts receive it, **Then** they can process compensating actions (e.g., release stock, initiate refund)

---

### User Story 3 - Idempotent Event Handling (Priority: P3)

The system receives duplicate events (payment.approved or stock.reserved) for the same order due to message bus retry logic or network issues. The system handles duplicates gracefully without corrupting order state or causing errors.

**Why this priority**: Idempotency is essential for production reliability but depends on the basic integration flow working first. It's P3 because it's a quality/reliability concern rather than core functionality.

**Independent Test**: Can be fully tested by publishing the same payment.approved or stock.reserved event multiple times for the same order and verifying that: (1) the first event processes correctly and transitions order state, (2) subsequent duplicate events are handled idempotently (ignored or acknowledged without state change), (3) no errors or exceptions occur. Delivers value by proving system resilience to duplicate messages.

**Acceptance Scenarios**:

1. **Given** an order has already processed a payment.approved event and transitioned to Paid state, **When** a duplicate payment.approved event arrives with the same paymentId, **Then** the event is acknowledged but the order remains in Paid state without error
2. **Given** an order has already processed a stock.reserved event and transitioned to StockReserved state, **When** a duplicate stock.reserved event arrives, **Then** the event is acknowledged but the order remains in StockReserved state without error

---

### User Story 4 - Invalid State Transition Rejection (Priority: P3)

The system receives events that don't match the current order state (e.g., payment.approved for an already-paid order, stock.reserved for an order still awaiting payment). The system rejects or ignores these events according to defined business rules without corrupting state.

**Why this priority**: State validation prevents data corruption but is a quality concern that builds on the base functionality. It's P3 because it handles edge cases rather than primary flows.

**Independent Test**: Can be fully tested by publishing events to orders in incompatible states and verifying that: (1) payment.approved sent to Paid order is rejected/ignored, (2) stock.reserved sent to AwaitingPayment order is rejected/ignored, (3) order state remains unchanged, (4) appropriate logging or notifications occur. Delivers value by proving state machine integrity.

**Acceptance Scenarios**:

1. **Given** an order is already in Paid state, **When** a payment.approved event arrives, **Then** the event is rejected/ignored and the order remains in Paid state
2. **Given** an order is in AwaitingPayment state, **When** a stock.reserved event arrives, **Then** the event is rejected/ignored and the order remains in AwaitingPayment state
3. **Given** an order is in Cancelled state, **When** any payment.approved or stock.reserved event arrives, **Then** the event is rejected/ignored and the order remains in Cancelled state

---

### Edge Cases

- When a payment.approved or stock.reserved event arrives for a non-existent orderId, the system logs an error and rejects the event without processing
- Stock reservation always succeeds in simulation (out of stock scenarios are out of scope for this educational implementation)
- When events arrive out of order (e.g., stock.reserved before payment.approved), the state machine validation handles this by logging a warning and ignoring the event (see FR-018, FR-021)
- Payment timeout is out of scope - orders wait indefinitely in AwaitingPayment state until payment.approved arrives
- What happens when the message bus is temporarily unavailable and events can't be published?
- What happens when a consumer is down and doesn't process events - should there be a timeout or retry mechanism?

## Requirements *(mandatory)*

### Functional Requirements

**Domain Events (Orders Context)**

- **FR-001**: The Orders domain MUST emit an OrderPlaced domain event immediately after successful checkout completion, containing at minimum: orderId, timestamp, customer details, order items with quantities and prices, total amount, and shipping address
- **FR-002**: The Orders domain MUST emit an OrderPaid domain event immediately after payment confirmation, containing at minimum: orderId, timestamp, paymentId, and payment amount
- **FR-003**: The Orders domain MUST emit an OrderCancelled domain event immediately after successful order cancellation, containing at minimum: orderId, timestamp, cancellation reason, and previous order state
- **FR-004**: All domain events MUST include a unique eventId to support idempotency checks

**Message Bus Contract**

- **FR-005**: The system MUST provide a message bus contract with publish(topic, payload) and subscribe(topic, handler) operations
- **FR-006**: The message bus MUST support publish/subscribe pattern allowing multiple consumers to subscribe to the same topic independently
- **FR-007**: The system MUST map domain events to integration message topics: OrderPlaced → order.placed, OrderPaid → order.paid, OrderCancelled → order.cancelled
- **FR-008**: Integration messages MUST contain a consistent envelope structure with: messageId, topic, timestamp, payload, and correlation metadata (e.g., orderId)

**Payments Bounded Context (Simulation)**

- **FR-009**: The Payments consumer MUST subscribe to order.placed topic and process incoming messages asynchronously
- **FR-010**: The Payments consumer MUST publish payment.approved message after processing an order.placed event, containing: messageId, orderId, paymentId, approvedAmount, and timestamp
- **FR-011**: The Payments consumer MUST simulate payment processing with configurable success/failure behavior for testing
- **FR-012**: The Payments consumer will NOT publish payment.rejected messages (out of scope - focus on success path only)

**Stock Bounded Context (Simulation)**

- **FR-013**: The Stock consumer MUST subscribe to order.paid topic and process incoming messages asynchronously
- **FR-014**: The Stock consumer MUST publish stock.reserved message after processing an order.paid event, containing: messageId, orderId, reservationId, reserved items with quantities, and timestamp
- **FR-015**: The Stock consumer MUST simulate stock reservation as always succeeding (out of stock scenarios are out of scope)

**Orders Event Handlers**

- **FR-016**: The Orders context MUST subscribe to payment.approved topic and handle incoming payment confirmation events
- **FR-017**: When Orders receives payment.approved for an order in AwaitingPayment state, the system MUST transition the order to Paid state and emit OrderPaid domain event
- **FR-018**: When Orders receives payment.approved for an order NOT in AwaitingPayment state, the system MUST log a warning and ignore the event without changing order state
- **FR-018a**: When Orders receives payment.approved or stock.reserved for a non-existent orderId, the system MUST log an error and reject the event without processing
- **FR-019**: The Orders context MUST subscribe to stock.reserved topic and handle incoming stock reservation events
- **FR-020**: When Orders receives stock.reserved for an order in Paid state, the system MUST transition the order to StockReserved state (final state)
- **FR-021**: When Orders receives stock.reserved for an order NOT in Paid state, the system MUST log a warning and ignore the event without changing order state

**Idempotency & Duplicate Handling**

- **FR-022**: The Orders context MUST track processed paymentIds to detect duplicate payment.approved events
- **FR-023**: When a duplicate payment.approved event is received (same paymentId for same orderId), the system MUST acknowledge the event without changing order state and return success
- **FR-024**: The Orders context MUST track processed stock reservationIds to detect duplicate stock.reserved events
- **FR-025**: When a duplicate stock.reserved event is received (same reservationId for same orderId), the system MUST acknowledge the event without changing order state and return success

**End-to-End Testing**

- **FR-026**: The system MUST provide at least one demonstrable end-to-end test scenario that: (1) places an order, (2) verifies Payments consumer processes order.placed and publishes payment.approved, (3) verifies Orders transitions to Paid, (4) verifies Stock consumer processes order.paid and publishes stock.reserved, (5) verifies Orders transitions to StockReserved state
- **FR-027**: The end-to-end scenario MUST demonstrate eventual consistency by polling order state changes over time rather than expecting synchronous completion

### Key Entities

- **Order**: Represents a customer's purchase request with state (AwaitingPayment, Paid, StockReserved, Cancelled), order items, pricing, shipping details, and payment tracking
- **Domain Event**: Represents a significant business fact that occurred (OrderPlaced, OrderPaid, OrderCancelled) with immutable payload and metadata
- **Integration Message**: Represents an event propagated across bounded contexts through the message bus, with envelope metadata (messageId, topic, timestamp) and domain-specific payload
- **Payment**: External context entity representing payment processing result, tracked by paymentId and associated with an orderId
- **Stock Reservation**: External context entity representing stock allocation result, tracked by reservationId and associated with an orderId

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When an order is placed, the system publishes an order.placed event within 100 milliseconds, enabling asynchronous processing to begin immediately
- **SC-002**: The end-to-end flow from order placement through payment approval to stock reservation completes within 5 seconds under normal conditions, demonstrating efficient eventual consistency
- **SC-003**: The system correctly handles 100% of duplicate events (payment.approved, stock.reserved) without state corruption or errors, proving idempotency implementation
- **SC-004**: The system correctly rejects or ignores 100% of events sent to orders in incompatible states, proving state machine integrity
- **SC-005**: All order state transitions are traceable through published domain events, enabling complete audit trail reconstruction
- **SC-006**: The system supports at least 3 independent bounded contexts (Orders, Payments, Stock) communicating only through published events, proving loose coupling
- **SC-007**: External consumers can be added or removed without modifying the Orders context code, proving extensibility of the event-driven architecture
- **SC-008**: When a consumer is temporarily unavailable, events are queued and processed once the consumer recovers, proving resilience (message bus behavior)

## Assumptions

- **A-001**: Message bus provides at-least-once delivery guarantee, requiring idempotency handling in consumers
- **A-002**: Message bus preserves message order per topic (FIFO), ensuring events are processed in the sequence they were published; if out-of-order delivery occurs, state machine validation will log warnings and ignore incompatible transitions
- **A-003**: Payments consumer simulates instant approval for testing; real payment processing may take seconds to minutes
- **A-004**: Stock consumer simulates instant reservation for testing; real stock systems may need to check multiple warehouses
- **A-005**: Message bus is a shared infrastructure component managed outside the Orders bounded context
- **A-006**: For educational purposes, the message bus implementation will be in-memory; production systems would use RabbitMQ, Kafka, AWS SNS/SQS, etc.
- **A-007**: Event payloads include sufficient data for consumers to act without querying the Orders context (data ownership principle)
- **A-008**: Duplicate detection uses a time window approach (e.g., 24 hours) to prevent unbounded memory growth from tracking all historical event IDs

## Dependencies

- **D-001**: Requires existing Order aggregate with state machine (AwaitingPayment, Paid, StockReserved, Cancelled states)
- **D-002**: Requires existing checkout flow that creates orders in AwaitingPayment state
- **D-003**: Requires existing order cancellation capability
- **D-004**: Message bus infrastructure (in-memory implementation for educational project)
- **D-005**: Requires ability to run multiple simulated bounded contexts concurrently for end-to-end testing

## Out of Scope

- **OS-001**: Message bus infrastructure implementation (use existing or simple in-memory implementation)
- **OS-002**: Advanced message bus features (dead letter queues, poison message handling, circuit breakers)
- **OS-003**: Real payment gateway integration (simulated only)
- **OS-004**: Real inventory management integration (simulated only)
- **OS-005**: Event sourcing or event store persistence (events are published and consumed but not necessarily stored long-term)
- **OS-006**: Saga pattern for distributed transaction coordination (basic state machine transitions only)
- **OS-007**: Real-time notifications to customers about order status changes
- **OS-008**: Retry policies and exponential backoff for failed event publishing
- **OS-009**: Event schema versioning and backward compatibility strategies
- **OS-010**: Monitoring, metrics, and alerting for event processing
- **OS-011**: Payment rejection handling (payment.rejected events) - focus is on success path only
- **OS-012**: Stock reservation failure handling (stock.reservation_failed events) - stock always succeeds in simulation
- **OS-013**: Payment timeout handling - orders wait indefinitely in AwaitingPayment state (no timeout/auto-cancellation)
