# Lesson 4: Event-Driven Integration

## Implementation Objective
Replace synchronous payment gateway with asynchronous event-driven architecture using message bus.

## Components to Implement

### Message Bus Interface
```typescript
interface EventBus {
  publish(eventName: string, payload: any): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
```
Implementation: In-memory (educational) or adaptable to RabbitMQ/Kafka

### Domain Events (Order Context)
**OrderPlaced** - Raised when order created from cart
- Payload: orderId, customerId, items, total, shippingAddress
- Published to: `order.placed` topic

**OrderPaid** - Raised when payment confirmed
- Payload: orderId, paymentId, timestamp
- Published to: `order.paid` topic

**OrderCancelled** - Raised when order cancelled
- Payload: orderId, reason, timestamp
- Published to: `order.cancelled` topic

### Event Dispatcher
- Aggregates maintain internal event list
- After aggregate method execution, collect and dispatch events
- Publish to message bus

### External Event Consumers

**PaymentApproved** (from Payment context):
- Consumes from `payment.approved` topic
- Triggers `ConfirmPaymentApplicationService`
- Calls `order.markAsPaid(paymentId)`

**StockReserved** (from Inventory context):
- Consumes from `stock.reserved` topic
- Triggers `ApplyStockReservedApplicationService`
- Calls `order.applyStockReserved()`
- New state: `StockReserved`

### Simulated External Contexts

**Payment Context** (simulated):
- Subscribes to `order.placed`
- Simulates payment approval
- Publishes `PaymentApproved`

**Inventory Context** (simulated):
- Subscribes to `order.paid`
- Simulates stock reservation
- Publishes `StockReserved`

### Application Services

**ConfirmPaymentApplicationService** (updated):
- Triggered by `PaymentApproved` event (not gateway)
- Calls `order.markAsPaid(paymentId)`

**ApplyStockReservedApplicationService** (new):
- Triggered by `StockReserved` event
- Calls `order.applyStockReserved()`

## API Endpoints
Same as Lesson 3 (implementation changes, not interface):
- `POST /orders/:id/pay` - Now triggers event flow
- `POST /orders/:id/cancel` - Now triggers event flow

## Code Location
- Domain: Domain events, event dispatcher mechanism
- Application: Updated application services, event consumers
- Infrastructure: Event bus implementation, event handlers, simulated contexts
