# Domain Events Contract

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Define domain events emitted by the Orders bounded context

---

## Base: DomainEvent

All domain events extend this base class:

```typescript
export abstract class DomainEvent {
  abstract readonly eventId: EventId;
  abstract readonly occurredOn: Date;
}
```

---

## OrderPlaced (NEW)

**Trigger**: Order.create() - emitted when checkout completes successfully

**Purpose**: Signifies a new order has been created and is awaiting payment

### TypeScript Contract

```typescript
export class OrderPlaced extends DomainEvent {
  constructor(
    public readonly eventId: EventId,
    public readonly orderId: OrderId,
    public readonly cartId: CartId,
    public readonly customerId: CustomerId,
    public readonly items: ReadonlyArray<OrderItem>,
    public readonly shippingAddress: ShippingAddress,
    public readonly orderLevelDiscount: Money,
    public readonly totalAmount: Money,
    public readonly occurredOn: Date,
  ) {
    super();
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | EventId | Unique identifier for this event instance |
| `orderId` | OrderId | The newly created order's identifier |
| `cartId` | CartId | Source shopping cart that was checked out |
| `customerId` | CustomerId | Customer who placed the order |
| `items` | OrderItem[] | Immutable snapshot of order items |
| `shippingAddress` | ShippingAddress | Delivery address |
| `orderLevelDiscount` | Money | Cart-wide discount applied |
| `totalAmount` | Money | Final order total after all discounts |
| `occurredOn` | Date | Timestamp when order was placed |

### Invariants

- `eventId` must be unique
- `items` array must contain at least one item
- `totalAmount` must be positive
- All Money values must use the same currency

### Integration Mapping

Maps to `order.placed` integration message topic

---

## OrderPaid (ENHANCED)

**Trigger**: Order.markAsPaid(paymentId) - emitted when payment is confirmed

**Purpose**: Signifies that payment has been processed and order is now paid

### TypeScript Contract

```typescript
export class OrderPaid extends DomainEvent {
  constructor(
    public readonly eventId: EventId,           // ⬅️ NEW FIELD
    public readonly orderId: OrderId,
    public readonly paymentId: string,
    public readonly amount: Money,
    public readonly occurredOn: Date,
  ) {
    super();
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | EventId | ⬅️ **NEW**: Unique identifier for this event instance |
| `orderId` | OrderId | Order that was paid |
| `paymentId` | string | External payment transaction identifier from Payments BC |
| `amount` | Money | Payment amount (should match order total) |
| `occurredOn` | Date | Timestamp when payment was confirmed |

### Invariants

- `eventId` must be unique
- `paymentId` must be non-empty
- `amount` must be positive

### Integration Mapping

Maps to `order.paid` integration message topic

### Migration Notes

**BREAKING CHANGE**: Existing OrderPaid events must be migrated to include `eventId`.

For existing codebase:
1. Update OrderPaid constructor to accept eventId as first parameter
2. Update all Order.markAsPaid() calls to generate new EventId
3. Update tests to provide eventId in test data

---

## OrderCancelled (ENHANCED)

**Trigger**: Order.cancel(reason) - emitted when order is cancelled

**Purpose**: Signifies that order has been cancelled and won't be fulfilled

### TypeScript Contract

```typescript
export class OrderCancelled extends DomainEvent {
  constructor(
    public readonly eventId: EventId,           // ⬅️ NEW FIELD
    public readonly orderId: OrderId,
    public readonly reason: string,
    public readonly previousStatus: OrderStatus,
    public readonly occurredOn: Date,
  ) {
    super();
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | EventId | ⬅️ **NEW**: Unique identifier for this event instance |
| `orderId` | OrderId | Order that was cancelled |
| `reason` | string | Human-readable cancellation reason |
| `previousStatus` | OrderStatus | Order status before cancellation (AwaitingPayment or Paid) |
| `occurredOn` | Date | Timestamp when order was cancelled |

### Invariants

- `eventId` must be unique
- `reason` must be non-empty
- `previousStatus` must be AwaitingPayment or Paid (cannot cancel from Cancelled or StockReserved)

### Integration Mapping

Maps to `order.cancelled` integration message topic

### Migration Notes

**BREAKING CHANGE**: Existing OrderCancelled events must be migrated to include `eventId`.

For existing codebase:
1. Update OrderCancelled constructor to accept eventId as first parameter
2. Update all Order.cancel() calls to generate new EventId
3. Update tests to provide eventId in test data

---

## Event Emission Pattern

### In Order Aggregate

```typescript
export class Order {
  private _domainEvents: DomainEvent[] = [];

  static create(...): Order {
    const order = new Order(..., OrderStatus.AwaitingPayment, ...);

    // Emit OrderPlaced event
    const event = new OrderPlaced(
      EventId.create(),  // Generate new UUID
      order.id,
      order.cartId,
      order.customerId,
      order.items,
      order.shippingAddress,
      order.orderLevelDiscount,
      order.totalAmount,
      new Date(),
    );
    order.addDomainEvent(event);

    return order;
  }

  markAsPaid(paymentId: string): void {
    // Idempotency check
    if (this.processedPaymentIds.has(paymentId)) {
      return; // Already processed
    }

    // State validation
    if (this._status !== OrderStatus.AwaitingPayment) {
      throw new InvalidOrderStateTransitionError(...);
    }

    // Apply state change
    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;
    this.processedPaymentIds.add(paymentId);

    // Emit OrderPaid event
    const event = new OrderPaid(
      EventId.create(),
      this._id,
      paymentId,
      this._totalAmount,
      new Date(),
    );
    this.addDomainEvent(event);
  }

  cancel(reason: string): void {
    // State validation
    if (this._status === OrderStatus.Cancelled || this._status === OrderStatus.StockReserved) {
      throw new InvalidOrderStateTransitionError(...);
    }

    const previousStatus = this._status;
    this._status = OrderStatus.Cancelled;
    this._cancellationReason = reason;

    // Emit OrderCancelled event
    const event = new OrderCancelled(
      EventId.create(),
      this._id,
      reason,
      previousStatus,
      new Date(),
    );
    this.addDomainEvent(event);
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return Object.freeze([...this._domainEvents]);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

---

## Event Publishing Flow

### Application Service Pattern

```typescript
// In CheckoutService (application layer)
async checkout(dto: CheckoutDto): Promise<Order> {
  // 1. Create order (emits OrderPlaced event)
  const order = Order.create(...);

  // 2. Save to repository
  await this.orderRepository.save(order);

  // 3. Publish domain events
  await this.eventPublisher.publishDomainEvents(order.getDomainEvents());

  // 4. Clear events from aggregate
  order.clearDomainEvents();

  return order;
}
```

### Event Publisher (infrastructure layer)

```typescript
// DomainEventPublisher maps domain events to integration messages
class DomainEventPublisher {
  async publishDomainEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (event instanceof OrderPlaced) {
        await this.publishOrderPlaced(event);
      } else if (event instanceof OrderPaid) {
        await this.publishOrderPaid(event);
      } else if (event instanceof OrderCancelled) {
        await this.publishOrderCancelled(event);
      }
    }
  }

  private async publishOrderPlaced(event: OrderPlaced): Promise<void> {
    const payload = this.mapToOrderPlacedPayload(event);
    await this.messageBus.publish('order.placed', payload);
  }

  // ... similar methods for OrderPaid and OrderCancelled
}
```

---

## Testing Domain Events

### Unit Tests

```typescript
describe('Order Domain Events', () => {
  it('should emit OrderPlaced event when order is created', () => {
    const order = Order.create(...);
    const events = order.getDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderPlaced);
    expect(events[0].orderId).toEqual(order.id);
    expect(events[0].eventId).toBeDefined();
  });

  it('should emit OrderPaid event when order is marked as paid', () => {
    const order = Order.create(...);
    order.clearDomainEvents(); // Clear OrderPlaced event

    order.markAsPaid('PAY-123');
    const events = order.getDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderPaid);
    expect((events[0] as OrderPaid).paymentId).toBe('PAY-123');
  });

  it('should not emit duplicate event for same paymentId (idempotency)', () => {
    const order = Order.create(...);
    order.clearDomainEvents();

    order.markAsPaid('PAY-123');
    order.clearDomainEvents();

    order.markAsPaid('PAY-123'); // Duplicate
    const events = order.getDomainEvents();

    expect(events).toHaveLength(0); // No new event
  });
});
```

---

## Summary

**Domain Events**: 3 total
- OrderPlaced (NEW)
- OrderPaid (ENHANCED with eventId)
- OrderCancelled (ENHANCED with eventId)

**Base Class**: DomainEvent (abstract)

**Event Storage**: Private array in Order aggregate

**Event Lifecycle**: Emit → Store in aggregate → Publish via infrastructure → Clear from aggregate

**Idempotency**: Tracked via eventId and processed external IDs (paymentId, reservationId)

**Testing**: Unit tests for emission, integration tests for publishing
