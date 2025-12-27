# Lesson 3: Order State Management

## Implementation Objective
Add payment confirmation and cancellation with explicit state machine in Order aggregate.

## State Machine Implementation

See `/docs/domain/order-state-machine.md` for complete specification.

### Order Aggregate Methods

**markAsPaid(paymentId: string)**:
- Precondition: State is `AwaitingPayment`
- Transition to `Paid` state
- Record payment ID
- Raise `OrderPaid` domain event

**cancel(reason: string)**:
- Precondition: State allows cancellation (`AwaitingPayment` or `Paid`)
- Transition to `Cancelled` state
- Record cancellation reason
- Raise `OrderCancelled` domain event

## Components to Implement

### PaymentGateway (Synchronous)
- `processPayment(orderId: string, amount: Money): Promise<PaymentResult>`
- Returns approval/rejection
- **Note**: Replaced by events in Lesson 4

### Application Services

**ConfirmPaymentApplicationService**:
1. Call `PaymentGateway.processPayment()`
2. On approval, call `order.markAsPaid(paymentId)`
3. Persist order
4. Handle rejection scenarios

**CancelOrderApplicationService**:
1. Load order
2. Validate cancellation allowed
3. Call `order.cancel(reason)`
4. Persist order

## API Endpoints
- `POST /orders/:id/pay` - Confirm payment
- `POST /orders/:id/cancel` - Cancel order

## Code Location
- Domain: Order state methods, state validation logic
- Application: Payment and cancellation application services
- Infrastructure: `PaymentGateway` implementation (stubbed), controller
