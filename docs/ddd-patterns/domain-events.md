# Domain Events

## Implementation Guidelines

### Domain Event Rules
- Name events in past tense (OrderPlaced, not PlaceOrder)
- Include all information subscribers need
- Events represent significant business moments, not technical operations

### Anti-Pattern: CRUD Sourcing
**Avoid** mechanical 1:1 relationship between aggregate methods and events.

✅ **Good**: Events reflect significant business moments
- `OrderPlaced` - A meaningful business fact
- `OrderPaid` - Payment confirmed (important for other contexts)
- `OrderCancelled` - Order cancelled (may require compensation)

❌ **Bad**: Technical CRUD operations
- `OrderUpdated` - Too generic, no business meaning
- `CartItemAdded` - Unless it has specific business significance

## Internal Domain Events (Order Context)

Domain Events represent significant business moments in the Order Context. In Lesson 4, these internal domain events are also published to a message bus for inter-context integration.

### OrderPlaced
Triggered when order is created from cart.

**Contains**:
- orderId
- customerId
- items
- total amount
- shipping address

**Published to**: `order.placed` queue/topic (Lesson 4)
**Consumed by**: Payment context

**Code reference**: (to be implemented in domain layer)

### OrderPaid
Triggered when payment is confirmed.

**Contains**:
- orderId
- paymentId
- timestamp

**Published to**: `order.paid` queue/topic (Lesson 4)
**Consumed by**: Inventory context

**Code reference**: (to be implemented in domain layer)

### OrderCancelled
Triggered when order is cancelled.

**Contains**:
- orderId
- reason
- timestamp

**Published to**: `order.cancelled` queue/topic (Lesson 4)
**May trigger**: Compensating actions in other contexts

**Code reference**: (to be implemented in domain layer)

## External Events Consumed (Lesson 4)

### PaymentApproved
Source: Payment context

**Contains**:
- orderId
- paymentId
- approvedAmount

**Triggers**: `ConfirmPaymentApplicationService`
**Effect**: Calls `order.markAsPaid(paymentId)`

### StockReserved
Source: Inventory context

**Contains**:
- orderId
- reservationId
- items

**Triggers**: `ApplyStockReservedApplicationService`
**Effect**: Updates order state to `StockReserved`

## Event Dispatcher Mechanism

**How it works**:
1. Aggregates maintain an internal list of domain events
2. During aggregate method execution, events are added to the list
3. After method completes, events are collected by the infrastructure
4. Events are dispatched to internal handlers
5. Events are published to the message bus for external consumption (Lesson 4)

**Code reference**: (event dispatcher to be implemented in infrastructure layer)

## Related Documentation
- Event-driven integration: `/docs/ddd-patterns/event-driven-integration.md`
- Event Storming methodology: `/docs/educational-concepts/event-storming.md`
- Lesson 4 (async events): `/docs/lessons/lesson-4-event-driven.md`
