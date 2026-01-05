# Message Bus Contract

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Define the message bus interface for publish/subscribe integration

---

## IMessageBus Interface

### Overview

The message bus provides a lightweight, topic-based publish/subscribe mechanism for asynchronous communication between bounded contexts. It enables loose coupling by allowing publishers to emit messages without knowing who (if anyone) will consume them, and allows consumers to subscribe to topics of interest without knowing who publishes them.

### Interface Definition

```typescript
export interface IMessageBus {
  /**
   * Publish a message to a specific topic.
   *
   * All subscribers to this topic will receive the message asynchronously.
   * Publishing is fire-and-forget; no guarantee of delivery or processing.
   *
   * @param topic - The topic to publish to (e.g., "order.placed")
   * @param payload - The message payload (must be JSON-serializable)
   * @returns Promise that resolves when message is queued for delivery
   * @throws Error if payload is not JSON-serializable
   */
  publish<T>(topic: string, payload: T): Promise<void>;

  /**
   * Subscribe a handler to a specific topic.
   *
   * Multiple handlers can subscribe to the same topic (fan-out pattern).
   * Handlers are invoked asynchronously when messages are published to the topic.
   * Handlers should be idempotent as messages may be delivered more than once.
   *
   * @param topic - The topic to subscribe to (e.g., "payment.approved")
   * @param handler - Async function to handle incoming messages
   * @returns void (subscription is active immediately)
   */
  subscribe<T>(
    topic: string,
    handler: (message: IntegrationMessage<T>) => Promise<void>,
  ): void;
}
```

---

## IntegrationMessage Envelope

### Purpose

Provides a consistent structure for all messages exchanged via the message bus, including metadata for tracing, ordering, and debugging.

### Structure

```typescript
export interface IntegrationMessage<T> {
  /**
   * Unique identifier for this message.
   * Format: UUID v4
   * Generated at publish time by the message bus.
   */
  messageId: string;

  /**
   * The topic this message was published to.
   * Examples: "order.placed", "payment.approved", "stock.reserved"
   */
  topic: string;

  /**
   * Timestamp when the message was published.
   * ISO 8601 format: "2026-01-05T10:00:00.000Z"
   */
  timestamp: Date;

  /**
   * The business payload of the message.
   * Must be JSON-serializable (primitives, arrays, plain objects only).
   * No domain objects (e.g., no Money, OrderId value objects).
   */
  payload: T;

  /**
   * Correlation identifier for tracing across bounded contexts.
   * Typically the orderId to link related messages in a flow.
   * Example: "ORD-20260105-001"
   */
  correlationId: string;
}
```

---

## Topics

### Naming Convention

Topics follow kebab-case format: `{entity}.{action}`

**Examples**:
- `order.placed` (entity: order, action: placed)
- `payment.approved` (entity: payment, action: approved)
- `stock.reserved` (entity: stock, action: reserved)

### Defined Topics

| Topic | Publisher | Consumers | Payload Type |
|-------|-----------|-----------|--------------|
| `order.placed` | Orders Context (after checkout) | Payments Consumer | `OrderPlacedPayload` |
| `order.paid` | Orders Context (after payment confirm) | Stock Consumer | `OrderPaidPayload` |
| `order.cancelled` | Orders Context (after cancellation) | Payments, Stock Consumers | `OrderCancelledPayload` |
| `payment.approved` | Payments Consumer | Orders Context | `PaymentApprovedPayload` |
| `stock.reserved` | Stock Consumer | Orders Context | `StockReservedPayload` |

---

## Message Delivery Semantics

### At-Least-Once Delivery

**Guarantee**: Each message will be delivered to each subscriber at least once.

**Implication**: Consumers MUST implement idempotency. The same message may be delivered multiple times due to retries, failures, or message bus restarts.

**Implementation**: In-memory message bus does not persist messages, so delivery happens immediately. If a handler fails, the message is lost (acceptable for educational demo). In production, use durable queues (RabbitMQ, Kafka, AWS SQS).

### FIFO Ordering (Per Topic)

**Guarantee**: Messages published to the same topic are delivered in the order they were published.

**Implication**: If Order A is placed before Order B, `order.placed` for A will be delivered before `order.placed` for B.

**Limitation**: Ordering is NOT guaranteed across different topics. `order.placed` and `payment.approved` may be delivered out of order if there's a delay in payment processing.

### Asynchronous Delivery

**Guarantee**: `publish()` returns immediately after queuing the message. Handlers are invoked asynchronously.

**Implication**: The publisher does not wait for consumers to process the message. This enables decoupling and prevents blocking.

**Implementation**: `setTimeout(..., 0)` simulates async delivery in the in-memory implementation.

---

## Handler Requirements

### Idempotency

Handlers MUST be idempotent. The same message may be delivered multiple times.

**Example**:
```typescript
async handlePaymentApproved(message: IntegrationMessage<PaymentApprovedPayload>): Promise<void> {
  const { orderId, paymentId } = message.payload;
  const order = await this.orderRepository.findById(orderId);

  // Idempotency check
  if (order.hasProcessedPayment(paymentId)) {
    return; // Already processed, skip
  }

  order.markAsPaid(paymentId);
  await this.orderRepository.save(order);
}
```

### Error Handling

Handlers SHOULD catch and log errors rather than throwing. Uncaught errors will be logged by the message bus but will NOT retry the message (in-memory implementation).

**Example**:
```typescript
async handleStockReserved(message: IntegrationMessage<StockReservedPayload>): Promise<void> {
  try {
    // ... business logic
  } catch (error) {
    console.error(`Failed to handle stock.reserved for ${message.correlationId}`, error);
    // Do NOT re-throw; message is lost in in-memory implementation
  }
}
```

### State Validation

Handlers SHOULD validate that the target entity is in the correct state before applying changes. Invalid state transitions should be logged and ignored.

**Example**:
```typescript
if (order.status !== OrderStatus.Paid) {
  console.warn(`Received stock.reserved for order ${orderId} in ${order.status} state. Ignoring.`);
  return; // Ignore, do not throw
}
```

---

## Implementation Notes

### In-Memory Implementation

For this educational demo, the message bus is implemented as:
```typescript
class InMemoryMessageBus implements IMessageBus {
  private subscribers = new Map<string, Set<MessageHandler>>();

  async publish<T>(topic: string, payload: T): Promise<void> {
    const message = this.createMessage(topic, payload);
    const handlers = this.subscribers.get(topic) || new Set();

    handlers.forEach(handler => {
      setTimeout(() => handler(message).catch(console.error), 0);
    });
  }

  subscribe<T>(topic: string, handler: MessageHandler<T>): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);
  }

  private createMessage<T>(topic: string, payload: T): IntegrationMessage<T> {
    return {
      messageId: crypto.randomUUID(),
      topic,
      timestamp: new Date(),
      payload,
      correlationId: (payload as any).orderId || 'unknown',
    };
  }
}
```

### Production Considerations (Out of Scope)

In a production system, replace the in-memory message bus with:
- **RabbitMQ**: Durable queues, dead letter exchanges, retry policies
- **AWS SNS/SQS**: Pub/sub with SQS queues for durability
- **Apache Kafka**: High-throughput event streaming
- **Azure Service Bus**: Enterprise messaging with sessions and transactions

These provide:
- Persistent message storage (survives restarts)
- Automatic retries with exponential backoff
- Dead letter queues for failed messages
- Message replay capabilities
- Cross-service communication over the network

---

## Testing

### Unit Testing Message Bus

Test publish/subscribe mechanics in isolation:
```typescript
describe('InMemoryMessageBus', () => {
  it('should deliver message to single subscriber', async () => {
    const bus = new InMemoryMessageBus();
    const handler = jest.fn();

    bus.subscribe('test.topic', handler);
    await bus.publish('test.topic', { data: 'test' });

    await new Promise(resolve => setImmediate(resolve)); // Wait for async delivery
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'test.topic',
      payload: { data: 'test' },
    }));
  });

  it('should deliver message to multiple subscribers (fan-out)', async () => {
    const bus = new InMemoryMessageBus();
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    bus.subscribe('test.topic', handler1);
    bus.subscribe('test.topic', handler2);
    await bus.publish('test.topic', { data: 'test' });

    await new Promise(resolve => setImmediate(resolve));
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
```

### Integration Testing Event Flow

Test complete publish → consume → publish cycle:
```typescript
describe('Event-Driven Flow', () => {
  it('should handle payment approval flow', async () => {
    const messageBus = app.get(IMessageBus);
    const orderRepo = app.get(OrderRepository);

    // Arrange: Create order
    const order = Order.create(...);
    await orderRepo.save(order);

    // Act: Publish payment.approved
    await messageBus.publish('payment.approved', {
      orderId: order.id.value,
      paymentId: 'PAY-123',
      approvedAmount: 100.00,
      currency: 'BRL',
    });

    // Assert: Order transitioned to Paid
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async processing
    const updated = await orderRepo.findById(order.id);
    expect(updated.status).toBe(OrderStatus.Paid);
  });
});
```

---

## Summary

**Interface Methods**: 2 (publish, subscribe)

**Message Envelope Fields**: 5 (messageId, topic, timestamp, payload, correlationId)

**Defined Topics**: 5 (order.placed, order.paid, order.cancelled, payment.approved, stock.reserved)

**Delivery Guarantees**: At-least-once, FIFO per topic, asynchronous

**Handler Requirements**: Idempotent, error-handling, state-validating

**Implementation**: In-memory for educational demo, replaceable with durable message brokers for production
