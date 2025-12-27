# Order State Machine

## Overview
The `Order` aggregate manages its lifecycle through explicit states with controlled transitions. This ensures that orders can only move through valid state paths, preventing invalid operations.

## States

### AwaitingPayment
**Initial state** after checkout.

**Meaning**: Order has been created but payment has not been confirmed yet.

**Entry**: Created from `ShoppingCart` during checkout (Lesson 2)

**Lesson**: Introduced in Lesson 2

### Paid
**Meaning**: Payment has been confirmed for this order.

**Entry**:
- **Lesson 3**: Via synchronous `PaymentGateway` approval
- **Lesson 4**: Via `PaymentApproved` event from Payment context

**Method**: `markAsPaid(paymentId: string)`

**Lesson**: Introduced in Lesson 3

### StockReserved
**Meaning**: Inventory has been reserved for this order.

**Entry**: Via `StockReserved` event from Inventory context (Lesson 4 only)

**Method**: `applyStockReserved()`

**Lesson**: Introduced in Lesson 4

**Note**: This state only exists in the asynchronous event-driven version (Lesson 4).

### Cancelled
**Meaning**: Order has been cancelled by user or system.

**Entry**: User cancellation or system compensation

**Method**: `cancel(reason: string)`

**Lesson**: Introduced in Lesson 3

## Valid State Transitions

### From AwaitingPayment
- → **Paid**: Via `markAsPaid(paymentId)`
  - Lesson 3: Synchronous payment gateway approval
  - Lesson 4: `PaymentApproved` event received
- → **Cancelled**: Via `cancel(reason)`
  - User cancellation
  - Payment declined (compensation)

### From Paid
- → **StockReserved**: Via `applyStockReserved()` (Lesson 4 only)
  - `StockReserved` event received from Inventory context
- → **Cancelled**: Via `cancel(reason)` (conditional)
  - Business rule example: May be prevented by policy
  - Requires special authorization

### From StockReserved
- → **Cancelled**: Via `cancel(reason)` (conditional)
  - May be prevented by business rules
  - May require inventory compensation

### From Cancelled
- **Terminal state** - No transitions out

## Invalid Transitions (Enforced by Aggregate)

### Cannot Pay
- Order already in `Paid` state
- Order already `Cancelled`

### Cannot Cancel
- Order already `Cancelled`
- Order in `StockReserved` state (business rule example - configurable)

### Cannot Reserve Stock
- Order not in `Paid` state
- Order already `Cancelled`

## State Management Methods

### `markAsPaid(paymentId: string): void`
Transitions order to `Paid` state with payment reference.

**Preconditions**:
- Order must be in `AwaitingPayment` state
- paymentId must be provided

**Postconditions**:
- Order state is `Paid`
- Payment ID is recorded
- `OrderPaid` domain event is raised

**Throws**: If order is not in `AwaitingPayment` state

**Code reference**: (to be implemented in Order aggregate)

### `cancel(reason: string): void`
Transitions order to `Cancelled` state with reason.

**Preconditions**:
- Order must be in a cancellable state (`AwaitingPayment` or `Paid`)
- Reason must be provided

**Postconditions**:
- Order state is `Cancelled`
- Cancellation reason is recorded
- `OrderCancelled` domain event is raised

**Throws**: If order is not in a cancellable state

**Code reference**: (to be implemented in Order aggregate)

### `applyStockReserved(): void` (Lesson 4)
Transitions order to `StockReserved` state.

**Preconditions**:
- Order must be in `Paid` state

**Postconditions**:
- Order state is `StockReserved`

**Throws**: If order is not in `Paid` state

**Code reference**: (to be implemented in Order aggregate)

## State Machine Diagram

```
[AwaitingPayment]
    |
    ├──(markAsPaid)──→ [Paid]
    |                    |
    |                    ├──(applyStockReserved)──→ [StockReserved]
    |                    |                              |
    |                    └──(cancel)──→ [Cancelled]     |
    |                                                    |
    └──(cancel)──────────────────────→ [Cancelled] ←────┘
                                                    (conditional)
```

## Business Rules Examples

### Cancellation Rules
These are example business rules that could be configured:

1. **Always allow cancellation** from `AwaitingPayment`
2. **Conditionally allow cancellation** from `Paid` (may require approval)
3. **Prevent cancellation** from `StockReserved` (or require compensation)

### Payment Rules
1. **One payment per order** (idempotent - multiple `PaymentApproved` events for same paymentId should be handled)
2. **Payment amount must match** order total

### Stock Reservation Rules
1. **Only reserve stock** after payment confirmed
2. **Idempotent reservation** (multiple `StockReserved` events should be handled gracefully)

## Implementation Notes

### State Enforcement
State transitions are enforced **inside the aggregate**, not in application services or controllers. This ensures invariants are always protected.

❌ **Wrong** (in service):
```typescript
order.state = 'paid'; // Direct property access
```

✅ **Right** (through aggregate method):
```typescript
order.markAsPaid(paymentId); // Controlled method enforces rules
```

### Domain Events
Each state transition should raise a domain event to notify other parts of the system.

- `markAsPaid()` → raises `OrderPaid` event
- `cancel()` → raises `OrderCancelled` event
- `applyStockReserved()` → raises appropriate event (if needed)

## Related Documentation
- Order aggregate: `/docs/ddd-patterns/aggregates.md`
- Domain events: `/docs/ddd-patterns/domain-events.md`
- Lesson 3 (state management): `/docs/lessons/lesson-3-state-management.md`
- Lesson 4 (StockReserved state): `/docs/lessons/lesson-4-event-driven.md`
