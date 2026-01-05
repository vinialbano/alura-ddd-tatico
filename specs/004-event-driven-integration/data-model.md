# Data Model: Event-Driven Integration Flow

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Define entities, value objects, and state transitions for event-driven architecture

---

## Value Objects

### EventId

**Purpose**: Unique identifier for domain events to support idempotency checks.

**Attributes**:
- `value`: string (UUID format)

**Invariants**:
- Must be non-empty
- Must be valid UUID format

**Equality**: By value (two EventIds with same value are equal)

**Immutability**: Yes

**Example**:
```typescript
const eventId = EventId.create(); // Generates new UUID
// Or from existing
const eventId = new EventId('123e4567-e89b-12d3-a456-426614174000');
```

---

### PaymentId

**Purpose**: External payment transaction identifier from Payments bounded context.

**Attributes**:
- `value`: string

**Invariants**:
- Must be non-empty
- Format: "PAY-{timestamp}-{random}" (e.g., "PAY-20260105-ABC123")

**Equality**: By value

**Immutability**: Yes

**Usage**: Tracked in Order aggregate to detect duplicate payment.approved events

---

### ReservationId

**Purpose**: External stock reservation identifier from Stock bounded context.

**Attributes**:
- `value`: string

**Invariants**:
- Must be non-empty
- Format: "RSV-{timestamp}-{random}" (e.g., "RSV-20260105-XYZ789")

**Equality**: By value

**Immutability**: Yes

**Usage**: Tracked in Order aggregate to detect duplicate stock.reserved events

---

## Domain Events

### OrderPlaced (NEW)

**Purpose**: Signifies that checkout completed successfully and order was created.

**Attributes**:
- `eventId`: EventId - Unique event identifier
- `orderId`: OrderId - Order that was placed
- `customerId`: CustomerId - Customer who placed the order
- `cartId`: CartId - Source shopping cart
- `items`: OrderItem[] - Order items with product snapshots
- `totalAmount`: Money - Total order amount after discounts
- `shippingAddress`: ShippingAddress - Delivery address
- `timestamp`: Date - When order was placed

**Emitted When**: Order.create() called (checkout completion)

**Mapping to Integration Message**: order.placed topic

**Example Payload**:
```typescript
{
  eventId: EventId('uuid-1'),
  orderId: OrderId('ORD-001'),
  customerId: CustomerId('CUST-123'),
  items: [
    { productId: 'PROD-A', quantity: 2, unitPrice: Money(10, 'BRL') }
  ],
  totalAmount: Money(20, 'BRL'),
  shippingAddress: ShippingAddress(...),
  timestamp: new Date('2026-01-05T10:00:00Z')
}
```

---

### OrderPaid (ENHANCED)

**Purpose**: Signifies that payment was confirmed and order transitioned to Paid state.

**Attributes** (NEW field in bold):
- **`eventId`: EventId - Unique event identifier** ⬅️ NEW
- `orderId`: OrderId - Order that was paid
- `paymentId`: string - External payment transaction ID
- `amount`: Money - Payment amount
- `timestamp`: Date - When payment was confirmed

**Emitted When**: Order.markAsPaid(paymentId) called

**Mapping to Integration Message**: order.paid topic

**Breaking Change**: Existing OrderPaid event must be enhanced to include eventId

---

### OrderCancelled (ENHANCED)

**Purpose**: Signifies that order was cancelled.

**Attributes** (NEW field in bold):
- **`eventId`: EventId - Unique event identifier** ⬅️ NEW
- `orderId`: OrderId - Order that was cancelled
- `reason`: string - Cancellation reason
- `previousStatus`: OrderStatus - Order status before cancellation
- `timestamp`: Date - When order was cancelled

**Emitted When**: Order.cancel(reason) called

**Mapping to Integration Message**: order.cancelled topic

**Breaking Change**: Existing OrderCancelled event must be enhanced to include eventId

---

## Integration Messages

### IntegrationMessage<T>

**Purpose**: Envelope for messages exchanged between bounded contexts via message bus.

**Attributes**:
- `messageId`: string (UUID) - Unique message identifier
- `topic`: string - Message topic (e.g., "order.placed")
- `timestamp`: Date - When message was published
- `payload`: T - Domain-specific payload (generic)
- `correlationId`: string - For tracing (typically orderId)

**Example**:
```typescript
{
  messageId: 'MSG-uuid-1',
  topic: 'order.placed',
  timestamp: new Date('2026-01-05T10:00:01Z'),
  correlationId: 'ORD-001',
  payload: {
    orderId: 'ORD-001',
    customerId: 'CUST-123',
    items: [...],
    totalAmount: 20.00,
    currency: 'BRL'
  }
}
```

---

## Order Aggregate Enhancements

### New State: StockReserved

**Purpose**: Final state after stock reservation completes.

**Transitions**:
- **FROM**: Paid
- **TO**: (Terminal state - no further transitions)

**Updated State Machine**:
```
AwaitingPayment → Paid → StockReserved
                  ↓
               Cancelled
```

### New Fields for Idempotency Tracking

**Private Fields**:
- `processedPaymentIds: Set<string>` - Tracks paymentIds already processed
- `processedReservationIds: Set<string>` - Tracks reservationIds already processed

**Purpose**: Detect duplicate external events and handle idempotently

**Initialization**: Empty Set in Order.create()

**Persistence**: Not persisted (in-memory only for educational demo)

---

## State Transitions

### 1. Order Creation → OrderPlaced Event

**Trigger**: CheckoutService calls Order.create()

**State Change**: None (order starts in AwaitingPayment)

**Event Emitted**: OrderPlaced

**Integration Message Published**: order.placed

**Consumers Listening**: Payments consumer

---

### 2. Payment Approval → Order Transitions to Paid

**Trigger**: Orders receives payment.approved integration message

**Preconditions**:
- Order exists (reject if not)
- Order is in AwaitingPayment state (ignore if not)
- PaymentId not already processed (idempotent if already processed)

**State Change**: AwaitingPayment → Paid

**Fields Updated**:
- `status`: Paid
- `paymentId`: set to received paymentId
- `processedPaymentIds`: add paymentId to set

**Event Emitted**: OrderPaid

**Integration Message Published**: order.paid

**Consumers Listening**: Stock consumer

---

### 3. Stock Reservation → Order Transitions to StockReserved

**Trigger**: Orders receives stock.reserved integration message

**Preconditions**:
- Order exists (reject if not)
- Order is in Paid state (ignore if not)
- ReservationId not already processed (idempotent if already processed)

**State Change**: Paid → StockReserved

**Fields Updated**:
- `status`: StockReserved
- `processedReservationIds`: add reservationId to set

**Event Emitted**: None (terminal state)

**Integration Message Published**: None

---

### 4. Order Cancellation → OrderCancelled Event

**Trigger**: Application calls Order.cancel(reason)

**Preconditions**:
- Order is in AwaitingPayment or Paid state (reject if Cancelled or StockReserved)

**State Change**: Current state → Cancelled

**Fields Updated**:
- `status`: Cancelled
- `cancellationReason`: set to provided reason

**Event Emitted**: OrderCancelled

**Integration Message Published**: order.cancelled

**Consumers Listening**: Payments and Stock consumers (for compensating actions)

---

## Validation Rules

### Event Validation

1. **EventId must be unique**: Each domain event instance gets its own EventId
2. **EventId must be UUID format**: Validated in EventId value object constructor
3. **Domain events are immutable**: All fields readonly, no setters

### Integration Message Validation

1. **MessageId must be unique**: Generated at publish time (UUID)
2. **Topic must match known topics**: "order.placed", "order.paid", "order.cancelled", "payment.approved", "stock.reserved"
3. **Payload must be JSON-serializable**: No domain objects, primitives only
4. **CorrelationId must be orderId**: For tracing across contexts

### Idempotency Validation

1. **Duplicate paymentId**: If `order.processedPaymentIds.has(paymentId)` → return success, no state change
2. **Duplicate reservationId**: If `order.processedReservationIds.has(reservationId)` → return success, no state change
3. **Non-existent order**: If order not found → log error, reject event
4. **Invalid state transition**: If order in incompatible state → log warning, ignore event

### State Machine Validation

1. **AwaitingPayment → Paid**: Only valid with payment.approved event
2. **Paid → StockReserved**: Only valid with stock.reserved event
3. **AwaitingPayment/Paid → Cancelled**: Valid with cancel() command
4. **Cancelled → (any)**: Invalid, terminal state
5. **StockReserved → (any)**: Invalid, terminal state

---

## Data Flow Diagram

```
┌─────────────────┐
│  Checkout       │
│  (User Action)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Order.create()          │
│ ├─ State: AwaitingPayment│
│ └─ Emit: OrderPlaced    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Publish: order.placed   │
│ (IntegrationMessage)    │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Payments Consumer        │
│ ├─ Listen: order.placed  │
│ └─ Publish: payment.approved│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Order.markAsPaid(paymentId)  │
│ ├─ Check: idempotency       │
│ ├─ Check: state = AwaitingPmt│
│ ├─ State: Paid              │
│ └─ Emit: OrderPaid          │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Publish: order.paid     │
│ (IntegrationMessage)    │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Stock Consumer           │
│ ├─ Listen: order.paid    │
│ └─ Publish: stock.reserved│
└────────┬─────────────────┘
         │
         ▼
┌───────────────────────────────┐
│ Order.reserveStock(resId)     │
│ ├─ Check: idempotency        │
│ ├─ Check: state = Paid       │
│ ├─ State: StockReserved      │
│ └─ No event (terminal)       │
└───────────────────────────────┘
```

---

## Summary

**New Value Objects**: 3 (EventId, PaymentId, ReservationId)

**Enhanced Domain Events**: 2 (OrderPaid + eventId, OrderCancelled + eventId)

**New Domain Events**: 1 (OrderPlaced)

**New Integration Message Types**: 5 (order.placed, order.paid, order.cancelled, payment.approved, stock.reserved)

**New Order State**: 1 (StockReserved)

**New Order Fields**: 2 (processedPaymentIds Set, processedReservationIds Set)

**State Machine Transitions**: 4 (create→emit, pay→Paid, reserve→StockReserved, cancel→Cancelled)
