# Quickstart: Event-Driven Integration Flow

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Step-by-step guide to run and test the event-driven integration architecture

---

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Basic understanding of DDD and event-driven architecture

---

## Running the Application

### 1. Start the Application

```bash
npm run start:dev
```

The application starts with:
- NestJS server on `http://localhost:3000`
- In-memory message bus initialized
- Payments and Stock consumers subscribed to topics
- Event handlers registered for payment.approved and stock.reserved

**Expected Console Output**:
```
[Nest] INFO [NestApplication] Nest application successfully started
[MessageBus] INFO Payments Consumer subscribed to 'order.placed'
[MessageBus] INFO Stock Consumer subscribed to 'order.paid'
[MessageBus] INFO Payment Handler subscribed to 'payment.approved'
[MessageBus] INFO Stock Handler subscribed to 'stock.reserved'
```

---

## End-to-End Scenario

### Step 1: Create Shopping Cart

```bash
curl -X POST http://localhost:3000/carts \
  -H "Content-Type: application/json" \
  -d '{"customerId": "CUST-123"}'
```

**Response**:
```json
{
  "id": "CART-001",
  "customerId": "CUST-123",
  "items": [],
  "status": "Active"
}
```

### Step 2: Add Items to Cart

```bash
curl -X POST http://localhost:3000/carts/CART-001/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PROD-A",
    "quantity": 2
  }'
```

**Response**:
```json
{
  "id": "CART-001",
  "items": [
    {
      "productId": "PROD-A",
      "productName": "Wireless Mouse",
      "quantity": 2,
      "unitPrice": 50.00
    }
  ]
}
```

### Step 3: Checkout (Triggers Event-Driven Flow)

```bash
curl -X POST http://localhost:3000/carts/CART-001/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "Rua das Flores, 123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "country": "BR"
    }
  }'
```

**Response**:
```json
{
  "orderId": "ORD-20260105-001",
  "status": "AwaitingPayment",
  "totalAmount": 100.00,
  "currency": "BRL"
}
```

**Console Output (Event Flow)**:
```
[Orders] INFO Order ORD-20260105-001 created
[Orders] INFO Publishing OrderPlaced event...
[MessageBus] INFO Published to 'order.placed': ORD-20260105-001
[PaymentsConsumer] INFO Received order.placed for ORD-20260105-001
[PaymentsConsumer] INFO Processing payment (simulated delay: 10ms)...
[PaymentsConsumer] INFO Payment approved: PAY-20260105-ABC123
[MessageBus] INFO Published to 'payment.approved': ORD-20260105-001
[OrdersHandler] INFO Received payment.approved for ORD-20260105-001
[Orders] INFO Order ORD-20260105-001 marked as Paid
[Orders] INFO Publishing OrderPaid event...
[MessageBus] INFO Published to 'order.paid': ORD-20260105-001
[StockConsumer] INFO Received order.paid for ORD-20260105-001
[StockConsumer] INFO Reserving stock (simulated delay: 10ms)...
[StockConsumer] INFO Stock reserved: RSV-20260105-XYZ789
[MessageBus] INFO Published to 'stock.reserved': ORD-20260105-001
[OrdersHandler] INFO Received stock.reserved for ORD-20260105-001
[Orders] INFO Order ORD-20260105-001 transitioned to StockReserved
[Orders] INFO Order ORD-20260105-001 is now complete!
```

### Step 4: Verify Final Order State

```bash
curl http://localhost:3000/orders/ORD-20260105-001
```

**Response**:
```json
{
  "id": "ORD-20260105-001",
  "customerId": "CUST-123",
  "status": "StockReserved",
  "totalAmount": 100.00,
  "currency": "BRL",
  "paymentId": "PAY-20260105-ABC123",
  "createdAt": "2026-01-05T10:00:00.000Z"
}
```

**Expected State**: `StockReserved` (final state, order complete)

**Time to Complete**: <5 seconds (per success criterion SC-002)

---

## Testing Idempotency

### Replay Payment Approval Event

```bash
# This would normally be done through internal message bus API
# For demo, trigger duplicate via e2e test (see below)
```

**Expected Behavior**:
- First event: Order transitions to Paid
- Duplicate event: Logged as "Already processed paymentId PAY-xxx", no state change
- No errors thrown

**Console Output**:
```
[OrdersHandler] INFO Received payment.approved for ORD-20260105-001
[Orders] WARN Payment PAY-20260105-ABC123 already processed for ORD-20260105-001. Ignoring.
```

---

## Testing Invalid State Transitions

### Send stock.reserved to AwaitingPayment Order

```bash
# Trigger this scenario via e2e test (see below)
```

**Expected Behavior**:
- Event logged as received
- State validation fails (order not in Paid state)
- Warning logged, event ignored
- Order remains in AwaitingPayment

**Console Output**:
```
[OrdersHandler] INFO Received stock.reserved for ORD-20260105-001
[Orders] WARN Order ORD-20260105-001 is in AwaitingPayment state, cannot reserve stock. Ignoring.
```

---

## Testing Order Cancellation

### Cancel an Order

```bash
curl -X POST http://localhost:3000/orders/ORD-20260105-001/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer requested cancellation"}'
```

**Response**:
```json
{
  "orderId": "ORD-20260105-001",
  "status": "Cancelled",
  "reason": "Customer requested cancellation"
}
```

**Console Output**:
```
[Orders] INFO Order ORD-20260105-001 cancelled
[Orders] INFO Publishing OrderCancelled event...
[MessageBus] INFO Published to 'order.cancelled': ORD-20260105-001
[PaymentsConsumer] INFO Received order.cancelled for ORD-20260105-001
[PaymentsConsumer] INFO Triggering refund for payment PAY-20260105-ABC123 (simulated)
[StockConsumer] INFO Received order.cancelled for ORD-20260105-001
[StockConsumer] INFO Releasing stock reservation RSV-20260105-XYZ789 (simulated)
```

---

## Running Automated Tests

### Unit Tests

Test domain events, Order aggregate logic, and message bus mechanics:

```bash
npm run test
```

**Coverage Goals**: >80% for domain layer

**Key Test Suites**:
- `order.spec.ts`: Order state transitions, event emission
- `in-memory-message-bus.spec.ts`: Publish/subscribe mechanics
- `domain-event-publisher.spec.ts`: Event-to-message mapping

### Integration Tests

Test event handlers, consumers, and end-to-end event flow:

```bash
npm run test -- --testPathPattern=integration
```

**Key Test Suites**:
- `payment-approved.handler.spec.ts`: Payment event handling with repository
- `stock-reserved.handler.spec.ts`: Stock event handling with repository
- `payments-consumer.spec.ts`: Payments consumer behavior
- `stock-consumer.spec.ts`: Stock consumer behavior

### End-to-End Tests

Test complete eventual consistency flow:

```bash
npm run test:e2e
```

**Key Test Suite**: `event-driven-flow.e2e-spec.ts`

**Test Scenarios**:
1. **Happy Path**: Checkout → Payment → Stock → Complete
2. **Idempotency**: Duplicate payment.approved event
3. **Invalid State**: stock.reserved to AwaitingPayment order
4. **Cancellation**: Cancel order and verify event propagation
5. **Non-Existent Order**: Send event for order that doesn't exist

**Example Test**:
```typescript
it('should complete end-to-end flow with eventual consistency', async () => {
  // 1. Create cart and add items
  const cart = await createCart('CUST-123');
  await addItem(cart.id, 'PROD-A', 2);

  // 2. Checkout (emits OrderPlaced, triggers Payments consumer)
  const order = await checkout(cart.id, shippingAddress);
  expect(order.status).toBe('AwaitingPayment');

  // 3. Wait for async payment processing
  await waitFor(() => order.status === 'Paid', { timeout: 1000 });
  expect(order.paymentId).toBeDefined();

  // 4. Wait for async stock reservation
  await waitFor(() => order.status === 'StockReserved', { timeout: 1000 });

  // 5. Verify final state
  const finalOrder = await getOrder(order.id);
  expect(finalOrder.status).toBe('StockReserved');
}, 5000); // 5 second timeout per SC-002
```

---

## Observing Event Flow

### Enable Debug Logging

Set log level to DEBUG in environment:

```bash
export LOG_LEVEL=debug
npm run start:dev
```

**Additional Output**:
- Message bus internal routing
- Event payload contents
- Idempotency check results
- State validation details

### Message Bus Stats

Query message bus statistics (if endpoint implemented):

```bash
curl http://localhost:3000/debug/message-bus-stats
```

**Response**:
```json
{
  "topics": {
    "order.placed": {
      "messagesPublished": 10,
      "subscribers": 1
    },
    "payment.approved": {
      "messagesPublished": 10,
      "subscribers": 1
    },
    "stock.reserved": {
      "messagesPublished": 10,
      "subscribers": 1
    }
  }
}
```

---

## Common Issues & Troubleshooting

### Issue: Events Not Being Published

**Symptoms**: Order created but no console output for event flow

**Possible Causes**:
1. Event publisher not registered in AppModule
2. Domain events not being published after repository save
3. Message bus not initialized

**Solution**:
```bash
# Verify AppModule providers include DomainEventPublisher
# Verify CheckoutService calls eventPublisher.publishDomainEvents()
# Check console for message bus initialization logs
```

### Issue: Handlers Not Receiving Events

**Symptoms**: Events published but handlers never invoked

**Possible Causes**:
1. Handlers not subscribed to correct topic
2. Handler registration failed
3. Async timing issue in tests

**Solution**:
```bash
# Verify handler subscription in AppModule factory
# Add await setImmediate() in tests before assertions
# Check handler method is bound correctly (.bind(this))
```

### Issue: Idempotency Not Working

**Symptoms**: Duplicate events cause state corruption

**Possible Causes**:
1. processedPaymentIds/processedReservationIds Sets not initialized
2. Idempotency check placed after state change
3. Different paymentId generated each time

**Solution**:
```bash
# Initialize Sets in Order constructor
# Move idempotency check to start of markAsPaid() method
# Ensure paymentId comes from external event, not generated internally
```

---

## Performance Benchmarks

### Event Publishing Latency

Measure time from domain event emission to integration message published:

**Target**: <100ms (SC-001)

**Measurement**:
```typescript
const start = Date.now();
await eventPublisher.publishDomainEvents(order.getDomainEvents());
const latency = Date.now() - start;
console.log(`Event publishing latency: ${latency}ms`);
```

**Expected**: 1-10ms (in-memory is very fast)

### End-to-End Flow Duration

Measure time from checkout to final StockReserved state:

**Target**: <5 seconds (SC-002)

**Measurement**:
```typescript
const start = Date.now();
const order = await checkout(cart.id, address);
await waitFor(() => order.status === 'StockReserved');
const duration = Date.now() - start;
console.log(`End-to-end duration: ${duration}ms`);
```

**Expected**: 50-500ms (simulated consumers have 10ms delay each)

---

## Next Steps

1. **Explore the Code**: Review implementation in `src/` matching the contracts
2. **Run Tests**: Verify all test suites pass
3. **Modify Consumers**: Change simulated delay or success rate to test different scenarios
4. **Add New Events**: Practice adding a new domain event (e.g., OrderShipped)
5. **Integrate Real Services**: Replace simulated consumers with actual external service calls

---

## Additional Resources

- [Implementation Plan](./plan.md): Complete technical design
- [Research Decisions](./research.md): Technical choices and rationale
- [Data Model](./data-model.md): Entities and state transitions
- [Message Bus Contract](./contracts/message-bus.interface.md): Pub/sub interface
- [Domain Events](./contracts/domain-events.md): Event definitions
- [Integration Messages](./contracts/integration-messages.md): Message payloads

---

## Summary

**Setup Time**: <5 minutes (npm install + npm run start:dev)

**E2E Scenario Time**: <5 seconds (checkout → complete)

**Test Execution Time**: <30 seconds (unit + integration + e2e)

**Key Commands**:
- `npm run start:dev` - Start application
- `npm run test` - Run all tests
- `npm run test:e2e` - Run end-to-end tests

**Success Indicators**:
- Order completes in StockReserved state
- All events logged in console
- Tests pass with >80% coverage
- Performance targets met (<100ms publish, <5s end-to-end)
