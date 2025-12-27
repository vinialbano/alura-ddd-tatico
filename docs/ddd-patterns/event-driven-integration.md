# Event-Driven Integration

## Overview
Lesson 4 introduces asynchronous integration using a message bus, evolving from the synchronous gateway approach of Lessons 2-3.

## Message Bus / Event Bus

### Interface
```typescript
interface EventBus {
  publish(eventName: string, payload: any): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
```

### Implementation
- **Educational**: In-memory implementation for learning purposes
- **Production**: Adaptable to real message brokers (RabbitMQ, Kafka, AWS SNS/SQS, etc.)

**Code reference**: (to be implemented in infrastructure layer)

## Event Flow Architecture

### 1. Order Context Publishes
Events from Order aggregate are published to message bus:
- `OrderPlaced` → `order.placed` topic
- `OrderPaid` → `order.paid` topic
- `OrderCancelled` → `order.cancelled` topic

### 2. Other Contexts Consume and Respond

**Payment Context** (simulated in this project):
- Subscribes to `order.placed`
- Processes payment (simulated approval)
- Publishes `PaymentApproved` event

**Inventory Context** (simulated in this project):
- Subscribes to `order.paid`
- Reserves stock (simulated)
- Publishes `StockReserved` event

### 3. Order Context Consumes External Events

**Consuming `PaymentApproved`**:
- Event handler subscribes to `payment.approved` topic
- Triggers `ConfirmPaymentApplicationService`
- Updates order: calls `order.markAsPaid(paymentId)`

**Consuming `StockReserved`**:
- Event handler subscribes to `stock.reserved` topic
- Triggers `ApplyStockReservedApplicationService`
- Updates order: calls `order.applyStockReserved()`

## Event Dispatcher Mechanism

**How events get from aggregates to the message bus**:
1. Aggregate methods add events to internal list
2. After aggregate operation completes, collect events
3. Dispatch events to internal domain handlers
4. Publish events to message bus for external consumption
5. Clear aggregate's event list

**Code reference**: (dispatcher to be implemented in infrastructure layer)

## Benefits of Event-Driven Integration

### Loose Coupling
- Order context doesn't need to know about Payment/Inventory implementations
- Contexts can evolve independently
- New consumers can subscribe without changing publishers

### High Availability
- Order service remains available even if Payment/Inventory services are down
- Eventual consistency model (see `/docs/educational-concepts/eventual-consistency.md`)
- Better resilience to network partitions

### Scalability
- Events can be processed asynchronously
- Each context can scale independently
- Message bus handles load distribution

## Trade-offs

### Eventual Consistency
- Order is placed before payment is confirmed
- Temporary inconsistency window
- Need to handle late failures (payment declined after order placed)

### Complexity
- Distributed system complexity
- Need message bus infrastructure
- Event versioning and schema evolution concerns

See `/docs/educational-concepts/cap-theorem.md` for detailed trade-off analysis.

## Educational Note
This project simulates Payment and Inventory contexts within the same application for educational purposes. In a real microservices architecture, these would be separate services communicating via a shared message bus.

## Related Documentation
- Domain events: `/docs/ddd-patterns/domain-events.md`
- CAP theorem: `/docs/educational-concepts/cap-theorem.md`
- Eventual consistency: `/docs/educational-concepts/eventual-consistency.md`
- Lesson 4: `/docs/lessons/lesson-4-event-driven.md`
