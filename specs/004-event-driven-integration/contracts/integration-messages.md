# Integration Messages Contract

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Define integration message payloads exchanged between bounded contexts

---

## Overview

Integration messages are JSON-serializable payloads wrapped in `IntegrationMessage<T>` envelopes and exchanged via the message bus. Unlike domain events (which use domain value objects), integration messages use primitive types only to prevent coupling between bounded contexts.

**Key Principles**:
- **Primitives only**: No domain objects (string, number, boolean, arrays, plain objects)
- **Self-contained**: Includes all data needed by consumers (no additional queries required)
- **Immutable**: Published messages cannot be modified
- **Versioned**: Include version field if breaking changes expected (out of scope for initial impl)

---

## Orders → Payments/Stock

### order.placed

**Publisher**: Orders Context (after checkout)
**Consumers**: Payments Consumer
**Purpose**: Notify external contexts that a new order was created and needs processing

#### TypeScript Contract

```typescript
export interface OrderPlacedPayload {
  /** Unique order identifier */
  orderId: string;

  /** Customer who placed the order */
  customerId: string;

  /** Order items with product snapshots */
  items: Array<{
    /** Product identifier */
    productId: string;
    /** Product name (snapshot) */
    productName: string;
    /** Quantity ordered */
    quantity: number;
    /** Unit price at time of order */
    unitPrice: number;
    /** Subtotal (quantity * unitPrice) */
    subtotal: number;
  }>;

  /** Total order amount after all discounts */
  totalAmount: number;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Shipping address */
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  /** ISO 8601 timestamp when order was placed */
  timestamp: string;
}
```

#### Example

```json
{
  "orderId": "ORD-20260105-001",
  "customerId": "CUST-123",
  "items": [
    {
      "productId": "PROD-A",
      "productName": "Wireless Mouse",
      "quantity": 2,
      "unitPrice": 50.00,
      "subtotal": 100.00
    },
    {
      "productId": "PROD-B",
      "productName": "USB Cable",
      "quantity": 3,
      "unitPrice": 15.00,
      "subtotal": 45.00
    }
  ],
  "totalAmount": 145.00,
  "currency": "BRL",
  "shippingAddress": {
    "street": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567",
    "country": "BR"
  },
  "timestamp": "2026-01-05T10:00:00.000Z"
}
```

---

### order.paid

**Publisher**: Orders Context (after payment confirmation)
**Consumers**: Stock Consumer
**Purpose**: Notify that payment was confirmed and stock should be reserved

#### TypeScript Contract

```typescript
export interface OrderPaidPayload {
  /** Order identifier */
  orderId: string;

  /** Payment transaction identifier */
  paymentId: string;

  /** Payment amount */
  paidAmount: number;

  /** Currency code */
  currency: string;

  /** ISO 8601 timestamp when payment was confirmed */
  timestamp: string;
}
```

#### Example

```json
{
  "orderId": "ORD-20260105-001",
  "paymentId": "PAY-20260105-ABC123",
  "paidAmount": 145.00,
  "currency": "BRL",
  "timestamp": "2026-01-05T10:01:30.000Z"
}
```

---

### order.cancelled

**Publisher**: Orders Context (after cancellation)
**Consumers**: Payments Consumer (for refund), Stock Consumer (for release)
**Purpose**: Notify that order was cancelled and compensating actions may be needed

#### TypeScript Contract

```typescript
export interface OrderCancelledPayload {
  /** Order identifier */
  orderId: string;

  /** Cancellation reason */
  reason: string;

  /** Previous order status before cancellation */
  previousStatus: 'AwaitingPayment' | 'Paid';

  /** ISO 8601 timestamp when order was cancelled */
  timestamp: string;
}
```

#### Example

```json
{
  "orderId": "ORD-20260105-001",
  "reason": "Customer requested cancellation",
  "previousStatus": "Paid",
  "timestamp": "2026-01-05T10:05:00.000Z"
}
```

---

## Payments → Orders

### payment.approved

**Publisher**: Payments Consumer (simulated external BC)
**Consumers**: Orders Context
**Purpose**: Notify that payment was processed successfully

#### TypeScript Contract

```typescript
export interface PaymentApprovedPayload {
  /** Order identifier (correlation) */
  orderId: string;

  /** Payment transaction identifier (unique per payment attempt) */
  paymentId: string;

  /** Approved amount */
  approvedAmount: number;

  /** Currency code */
  currency: string;

  /** ISO 8601 timestamp when payment was approved */
  timestamp: string;
}
```

#### Example

```json
{
  "orderId": "ORD-20260105-001",
  "paymentId": "PAY-20260105-ABC123",
  "approvedAmount": 145.00,
  "currency": "BRL",
  "timestamp": "2026-01-05T10:01:30.000Z"
}
```

#### Idempotency

Orders Context tracks processed `paymentId` values to detect duplicates. If the same `paymentId` is received multiple times for the same `orderId`, subsequent messages are acknowledged without state change.

---

## Stock → Orders

### stock.reserved

**Publisher**: Stock Consumer (simulated external BC)
**Consumers**: Orders Context
**Purpose**: Notify that stock was reserved for the order

#### TypeScript Contract

```typescript
export interface StockReservedPayload {
  /** Order identifier (correlation) */
  orderId: string;

  /** Stock reservation identifier (unique per reservation) */
  reservationId: string;

  /** Reserved items */
  items: Array<{
    /** Product identifier */
    productId: string;
    /** Reserved quantity */
    quantity: number;
  }>;

  /** ISO 8601 timestamp when stock was reserved */
  timestamp: string;
}
```

#### Example

```json
{
  "orderId": "ORD-20260105-001",
  "reservationId": "RSV-20260105-XYZ789",
  "items": [
    {
      "productId": "PROD-A",
      "quantity": 2
    },
    {
      "productId": "PROD-B",
      "quantity": 3
    }
  ],
  "timestamp": "2026-01-05T10:02:00.000Z"
}
```

#### Idempotency

Orders Context tracks processed `reservationId` values to detect duplicates. If the same `reservationId` is received multiple times for the same `orderId`, subsequent messages are acknowledged without state change.

---

## Mapping: Domain Events → Integration Messages

### OrderPlaced → order.placed

```typescript
function mapOrderPlacedToPayload(event: OrderPlaced): OrderPlacedPayload {
  return {
    orderId: event.orderId.value,
    customerId: event.customerId.value,
    items: event.items.map(item => ({
      productId: item.productId.value,
      productName: item.productSnapshot.name,
      quantity: item.quantity.value,
      unitPrice: item.unitPrice.amount,
      subtotal: item.subtotal.amount,
    })),
    totalAmount: event.totalAmount.amount,
    currency: event.totalAmount.currency,
    shippingAddress: {
      street: event.shippingAddress.street,
      city: event.shippingAddress.city,
      state: event.shippingAddress.state,
      zipCode: event.shippingAddress.zipCode,
      country: event.shippingAddress.country,
    },
    timestamp: event.occurredOn.toISOString(),
  };
}
```

### OrderPaid → order.paid

```typescript
function mapOrderPaidToPayload(event: OrderPaid): OrderPaidPayload {
  return {
    orderId: event.orderId.value,
    paymentId: event.paymentId,
    paidAmount: event.amount.amount,
    currency: event.amount.currency,
    timestamp: event.occurredOn.toISOString(),
  };
}
```

### OrderCancelled → order.cancelled

```typescript
function mapOrderCancelledToPayload(event: OrderCancelled): OrderCancelledPayload {
  return {
    orderId: event.orderId.value,
    reason: event.reason,
    previousStatus: event.previousStatus.toString(),
    timestamp: event.occurredOn.toISOString(),
  };
}
```

---

## Validation Rules

### All Payloads

- **orderId**: Required, non-empty string
- **timestamp**: Required, ISO 8601 format
- **currency**: Required, 3-letter ISO 4217 code (e.g., "BRL", "USD")

### order.placed

- **items**: Array with at least 1 item
- **totalAmount**: Positive number
- **shippingAddress**: All fields required

### payment.approved

- **paymentId**: Required, non-empty string (format: "PAY-{timestamp}-{random}")
- **approvedAmount**: Positive number

### stock.reserved

- **reservationId**: Required, non-empty string (format: "RSV-{timestamp}-{random}")
- **items**: Array with at least 1 item
- **quantity**: Positive integer for each item

---

## Error Handling

### Invalid Payload

If a consumer receives an invalid payload (missing required fields, invalid types):
1. Log error with full message details
2. Reject message (do not process)
3. Do NOT throw exception (prevents message bus disruption)

### Non-Existent Order

If orderId references an order that doesn't exist:
1. Log error: "Order {orderId} not found"
2. Reject message (cannot process)
3. Return gracefully (idempotent - safe to retry)

### Invalid State Transition

If order is in incompatible state for the event:
1. Log warning: "Received {event} for order {orderId} in {currentState} state. Ignoring."
2. Ignore message (do not throw)
3. Return success (idempotent - safe to retry)

---

## Testing Integration Messages

### Schema Validation Tests

```typescript
describe('OrderPlacedPayload', () => {
  it('should be valid JSON-serializable', () => {
    const payload: OrderPlacedPayload = {
      orderId: 'ORD-001',
      customerId: 'CUST-123',
      items: [{...}],
      totalAmount: 100.00,
      currency: 'BRL',
      shippingAddress: {...},
      timestamp: '2026-01-05T10:00:00.000Z',
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(payload);
  });
});
```

### Mapping Tests

```typescript
describe('Domain Event Mapping', () => {
  it('should map OrderPlaced to order.placed payload', () => {
    const event = new OrderPlaced(...);
    const payload = mapOrderPlacedToPayload(event);

    expect(payload.orderId).toBe(event.orderId.value);
    expect(payload.totalAmount).toBe(event.totalAmount.amount);
    expect(payload.currency).toBe(event.totalAmount.currency);
  });
});
```

---

## Summary

**Integration Message Topics**: 5
- order.placed
- order.paid
- order.cancelled
- payment.approved
- stock.reserved

**Payload Formats**: All use primitive types (string, number, boolean, arrays, plain objects)

**Idempotency Keys**:
- payment.approved: `paymentId`
- stock.reserved: `reservationId`

**Correlation**: `orderId` used in all payloads for cross-context tracing

**Validation**: Required fields, type checking, business rules validation

**Error Handling**: Log and ignore/reject, never throw exceptions

**Testing**: Schema validation, mapping tests, end-to-end integration tests
