# Feature Specification: Synchronous Payment and Order Cancellation Flows

**Feature Branch**: `003-payment-cancel-flows`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "We are now starting the 3rd stage of our project. Learn from these requirements and check the previous specifications with tasks we already implemented.

### 11) feat/sync/01-payment-sync-flow

**Objetivo do pacote:** fluxo síncrono de pagamento (antes da versão assíncrona por eventos).
**AC**

-   Existe endpoint POST /orders/:id/pay.
-   Dado um pedido AwaitingPayment, quando pago com sucesso, então o pedido vai para Paid e guarda paymentId.
-   Dado um pedido em estado inválido, quando tento pagar, então recebo erro funcional (4xx).
-   Existe cobertura (teste/roteiro) para pagamento aprovado e pagamento recusado.

### 12) feat/sync/02-cancel-order-flow

**Objetivo do pacote:** fluxo síncrono de cancelamento com regras de estado.
**AC**

-   Existe endpoint POST /orders/:id/cancel.
-   Dado um pedido cancelável, quando cancelo com motivo, então o pedido transita para Cancelled e registra o motivo.
-   Dado um pedido não cancelável, quando tento cancelar, então recebo erro funcional (4xx).
-   Comportamento para repetição (cancelar duas vezes) está definido e testado (idempotente ou erro)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Process Successful Payment (Priority: P1)

When a customer completes payment for an order awaiting payment, the system processes the payment through the payment gateway and marks the order as paid with the payment confirmation ID. This allows the order to proceed to the next stages of fulfillment.

**Why this priority**: This is the critical path for revenue generation. Without successful payment processing, orders cannot be fulfilled and the business cannot complete transactions.

**Independent Test**: Can be fully tested by creating an order in AwaitingPayment state, submitting a payment request with valid payment details, and verifying the order transitions to Paid state with the payment ID recorded.

**Acceptance Scenarios**:

1. **Given** an order in AwaitingPayment state, **When** payment is submitted and approved by the payment gateway, **Then** order transitions to Paid state and records the payment ID returned by the gateway
2. **Given** an order in AwaitingPayment state with total $100.00 USD, **When** payment of $100.00 USD is successfully processed, **Then** order is marked as Paid with the confirmation ID
3. **Given** multiple orders in AwaitingPayment state, **When** payment is processed for one specific order, **Then** only that order transitions to Paid while others remain unchanged

---

### User Story 2 - Handle Payment Rejection (Priority: P1)

When a customer attempts payment but the payment gateway declines the transaction (insufficient funds, invalid card, etc.), the system provides clear feedback about the rejection while keeping the order in AwaitingPayment state so the customer can retry with different payment details.

**Why this priority**: Payment failures are common and must be handled gracefully to maintain good customer experience and not lose potential sales.

**Independent Test**: Can be tested by creating an order in AwaitingPayment state, submitting a payment that will be rejected by the gateway (using test data), and verifying the order remains in AwaitingPayment with a clear error message returned.

**Acceptance Scenarios**:

1. **Given** an order in AwaitingPayment state, **When** payment is submitted but rejected by the payment gateway, **Then** order remains in AwaitingPayment state and error message indicates payment was declined
2. **Given** an order in AwaitingPayment state, **When** payment fails due to gateway error, **Then** error message clearly indicates the reason (insufficient funds, invalid card, gateway timeout, etc.)
3. **Given** an order that had a rejected payment, **When** customer retries payment with valid details, **Then** payment can be processed successfully

---

### User Story 3 - Prevent Payment of Invalid Order States (Priority: P1)

The system enforces state machine rules by rejecting payment attempts for orders that are not in AwaitingPayment state. This prevents duplicate payments and maintains order state integrity.

**Why this priority**: Critical for financial integrity - prevents charging customers multiple times or attempting to pay orders that are already paid or cancelled.

**Independent Test**: Can be tested independently by creating orders in various states (Paid, Cancelled) and attempting to process payments, verifying all attempts are rejected with clear error messages.

**Acceptance Scenarios**:

1. **Given** an order already in Paid state, **When** payment is attempted, **Then** system rejects with error indicating order is already paid
2. **Given** an order in Cancelled state, **When** payment is attempted, **Then** system rejects with error indicating cancelled orders cannot be paid
3. **Given** any order not in AwaitingPayment state, **When** payment is attempted, **Then** order state remains unchanged and payment is not processed with gateway

---

### User Story 4 - Cancel Order Before Payment (Priority: P1)

Customers or customer service can cancel orders that are awaiting payment. This allows customers to change their minds or correct mistakes before payment is processed.

**Why this priority**: Essential for customer satisfaction and reducing unnecessary transactions. Common scenario where customers need to modify orders or decide not to proceed.

**Independent Test**: Can be tested by creating an order in AwaitingPayment state, submitting a cancellation request with a reason, and verifying the order transitions to Cancelled state with the reason recorded.

**Acceptance Scenarios**:

1. **Given** an order in AwaitingPayment state, **When** cancellation is requested with reason "Customer changed mind", **Then** order transitions to Cancelled state and reason is recorded
2. **Given** an order in AwaitingPayment state, **When** cancellation is requested with reason "Incorrect shipping address", **Then** order is cancelled and the specified reason is stored
3. **Given** an order in AwaitingPayment state, **When** cancellation is requested without a reason, **Then** system rejects with error indicating reason is required

---

### User Story 5 - Cancel Paid Order (Priority: P2)

Customer service can cancel orders that have already been paid when refunds are necessary. This handles scenarios like out-of-stock items discovered after payment, customer service accommodations, or customer-requested refunds.

**Why this priority**: Important for customer service flexibility but lower priority than pre-payment cancellation. Paid order cancellations are less common and typically require special handling.

**Independent Test**: Can be tested by creating an order in Paid state, submitting a cancellation request with appropriate reason, and verifying the order transitions to Cancelled state with payment details preserved for refund processing.

**Acceptance Scenarios**:

1. **Given** an order in Paid state, **When** cancellation is requested with reason "Item out of stock", **Then** order transitions to Cancelled state and retains payment ID for refund processing
2. **Given** an order in Paid state with payment ID "PAY123", **When** order is cancelled with reason "Customer requested refund", **Then** order is Cancelled, payment ID "PAY123" is preserved, and cancellation reason is recorded
3. **Given** an order in Paid state, **When** cancellation is requested, **Then** system records cancellation but does not automatically process refund (refund is separate workflow)

---

### User Story 6 - Prevent Invalid Cancellations (Priority: P1)

The system enforces state machine rules by rejecting cancellation attempts for orders that are already cancelled. This provides clear error feedback and prevents confusion about order status.

**Why this priority**: Critical for maintaining data integrity and providing clear feedback. Prevents duplicate cancellation processing and maintains accurate audit trails.

**Independent Test**: Can be tested by cancelling an order once successfully, then attempting to cancel again, verifying the second attempt is rejected with a clear error message.

**Acceptance Scenarios**:

1. **Given** an order already in Cancelled state, **When** cancellation is attempted again, **Then** system rejects with error indicating order is already cancelled
2. **Given** an order in Cancelled state with reason "Customer changed mind", **When** cancellation is attempted with different reason, **Then** original cancellation reason is preserved and new attempt is rejected
3. **Given** an order that was just cancelled, **When** immediate retry of cancellation occurs (potential double-click scenario), **Then** second attempt is rejected with clear message

---

### Edge Cases

- What happens when payment gateway times out during payment processing? (Should fail with timeout error, order remains in AwaitingPayment, customer can retry)
- What happens when payment gateway returns ambiguous status (neither clear approval nor rejection)? (Should fail safely, order remains in AwaitingPayment, gateway should be queried for final status)
- What happens if payment amount doesn't match order total? (Should reject payment with validation error before calling gateway)
- What happens when order is cancelled while payment is being processed? (Race condition - need to handle based on which completes first: if payment succeeds first, order becomes Paid then can be cancelled; if cancellation completes first, payment should be rejected)
- What happens if payment ID is empty or invalid format? (Should reject if gateway returns invalid payment ID format)
- What happens if cancellation reason exceeds reasonable length? (Should validate and potentially truncate with clear limits defined)
- What happens if cancellation reason contains only whitespace? (Should reject as invalid - substantive reason required)
- Can the same payment ID be used for multiple orders? (Each payment ID should be unique per order; duplicate payment IDs should be investigated but system should record what gateway returns)

## Requirements *(mandatory)*

### Functional Requirements

#### Payment Processing

- **FR-001**: System MUST provide endpoint POST /orders/:id/pay that accepts order ID and payment details
- **FR-002**: System MUST process payment through PaymentGateway when order is in AwaitingPayment state
- **FR-003**: System MUST transition order to Paid state and record payment ID when payment gateway returns approval
- **FR-004**: System MUST keep order in AwaitingPayment state when payment gateway rejects payment
- **FR-005**: System MUST return clear error message to client when payment is rejected, indicating reason from gateway
- **FR-006**: System MUST validate order is in AwaitingPayment state before attempting payment processing
- **FR-007**: System MUST reject payment attempts for orders in Paid state with error indicating order is already paid
- **FR-008**: System MUST reject payment attempts for orders in Cancelled state with error indicating cancelled orders cannot be paid
- **FR-009**: System MUST preserve order state (no changes) when payment attempt is rejected due to invalid order state
- **FR-010**: System MUST raise OrderPaid domain event when order transitions to Paid state
- **FR-011**: System MUST persist order state changes when payment is successfully processed

#### Order Cancellation

- **FR-012**: System MUST provide endpoint POST /orders/:id/cancel that accepts order ID and cancellation reason
- **FR-013**: System MUST require non-empty cancellation reason for all cancellation requests
- **FR-014**: System MUST allow cancellation of orders in AwaitingPayment state with valid reason
- **FR-015**: System MUST allow cancellation of orders in Paid state with valid reason
- **FR-016**: System MUST transition order to Cancelled state and record cancellation reason when cancellation is allowed
- **FR-017**: System MUST reject cancellation attempts for orders already in Cancelled state with error indicating order is already cancelled
- **FR-018**: System MUST preserve original cancellation reason when subsequent cancellation attempts are made on already-cancelled orders
- **FR-019**: System MUST preserve payment ID when paid orders are cancelled (for refund processing)
- **FR-020**: System MUST raise OrderCancelled domain event when order transitions to Cancelled state
- **FR-021**: System MUST persist order state changes when cancellation is successfully processed
- **FR-022**: System MUST validate cancellation reason is not empty or only whitespace before processing cancellation

#### State Machine Enforcement

- **FR-023**: System MUST enforce state transitions through aggregate methods (markAsPaid, cancel) not direct state property assignment
- **FR-024**: System MUST prevent any state transition that violates state machine rules defined in order state machine specification
- **FR-025**: System MUST return 4xx functional errors (not 5xx server errors) when business rules prevent state transitions
- **FR-026**: System MUST provide clear error messages indicating current state, attempted action, and why transition is not allowed

### Key Entities

- **Order**: Existing aggregate root extended with state transition methods. Contains markAsPaid(paymentId: string) method that validates current state is AwaitingPayment, transitions to Paid state, records payment ID, and raises OrderPaid event. Contains cancel(reason: string) method that validates current state allows cancellation (AwaitingPayment or Paid), transitions to Cancelled state, records reason, and raises OrderCancelled event.

- **PaymentGateway**: Infrastructure interface for synchronous payment processing. Accepts order ID and payment amount, communicates with external payment service, returns approval with payment ID or rejection with reason. Stubbed implementation for this educational stage (will be replaced with event-driven approach in later stage).

- **OrderPaid**: Domain event raised when order successfully transitions to Paid state. Contains order ID, payment ID, and timestamp.

- **OrderCancelled**: Domain event raised when order successfully transitions to Cancelled state. Contains order ID, cancellation reason, previous state, and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Payment requests for orders in AwaitingPayment state complete within 3 seconds including gateway communication
- **SC-002**: 100% of payment attempts for orders not in AwaitingPayment state are rejected with clear 4xx errors
- **SC-003**: 100% of successful payments result in order transitioning to Paid state with payment ID recorded
- **SC-004**: 100% of rejected payments result in order remaining in AwaitingPayment state with no state changes
- **SC-005**: Cancellation requests complete within 1 second (no external gateway involved)
- **SC-006**: 100% of cancellation attempts for orders in AwaitingPayment or Paid states succeed when valid reason provided
- **SC-007**: 100% of cancellation attempts for already-cancelled orders are rejected with clear error messages
- **SC-008**: 100% of state transitions are enforced through aggregate methods maintaining domain invariants
- **SC-009**: All state transition errors return 4xx status codes indicating business rule violations, not 5xx server errors
- **SC-010**: Error messages clearly indicate the specific state violation (e.g., "Cannot pay order in Cancelled state", "Order already paid", "Order already cancelled")

## Assumptions *(optional)*

1. **Payment gateway synchronicity**: This is a transitional synchronous implementation. A future stage will replace this with asynchronous event-driven payment processing.
2. **Payment gateway stubbing**: PaymentGateway implementation is stubbed for educational purposes, returning predetermined results based on test data patterns.
3. **Payment idempotency**: If the same payment is attempted twice for an order in AwaitingPayment, the second attempt will be processed as a new payment request. True payment idempotency (detecting duplicate payment attempts) is a gateway concern.
4. **Refund processing**: Cancelling a paid order records the cancellation but does not automatically trigger refund processing. Refunds are handled by separate workflow outside this scope.
5. **Payment amount validation**: Payment amount must match order total exactly. Currency must match order currency.
6. **Cancellation reason length**: Cancellation reason should have reasonable length limit (e.g., 500 characters) to prevent abuse, though specific limit is implementation detail.
7. **Race condition handling**: If payment processing and cancellation are attempted simultaneously, the operation that completes first determines the outcome. Infrastructure layer may implement optimistic locking; domain layer focuses on state transition rules.
8. **Payment ID format**: Payment ID is treated as opaque string returned by gateway. Domain does not validate format beyond non-empty requirement.
9. **Domain events**: OrderPaid and OrderCancelled events are raised but not yet used for integration. Event-driven integration comes in later stage.
10. **Error granularity**: State transition errors include current order state in error message to aid debugging and customer support.
11. **Authentication/Authorization**: Endpoint access control (who can pay/cancel orders) is infrastructure/application layer concern, not enforced in domain model.
12. **Audit trail**: All state transitions are recorded through domain events for future audit trail purposes, though audit log implementation is separate concern.

## Dependencies *(optional)*

### Internal Dependencies
- **Order aggregate**: Must already exist with state management capabilities and AwaitingPayment/Paid/Cancelled states defined
- **Order repository**: Must support loading and persisting order state changes
- **Domain event infrastructure**: Must support raising and publishing OrderPaid and OrderCancelled events

### External Dependencies (Synchronous)
- **Payment Gateway service**: External payment processing service that approves or rejects payments
  - **Contract**: Input: Order ID, Payment amount (Money) → Output: Approval (with payment ID) or Rejection (with reason)
  - **Timeout behavior**: Must respond within 3 seconds or fail with timeout error
  - **Note**: This is synchronous implementation; will be replaced with event-driven approach in Lesson 4

### Future Dependencies
- **Refund service**: Will handle refund processing for cancelled paid orders (future scope)
- **Inventory compensation**: May need to release reserved inventory when orders are cancelled (future scope, Lesson 4)

## Out of Scope *(optional)*

- Refund processing implementation (separate workflow)
- Asynchronous event-driven payment integration (covered in later stage/lesson 4)
- Payment retry logic with exponential backoff
- Partial refunds or payment modifications
- Payment method details (credit card, PayPal, etc.) - treated as gateway concern
- PCI compliance and payment data security - handled by payment gateway
- Multiple payment attempts tracking/limiting
- Fraud detection and prevention
- Payment installments or split payments
- Inventory reservation release on cancellation (deferred to event-driven stage)
- Customer notification (email/SMS) for payment confirmation or cancellation
- Payment reconciliation and accounting integration
- Chargeback handling
