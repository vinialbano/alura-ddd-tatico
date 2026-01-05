# Quickstart: Synchronous Payment and Order Cancellation Flows

**Feature**: 003-payment-cancel-flows
**Date**: 2026-01-04

## Overview

This quickstart guide helps developers understand, test, and extend the payment processing and order cancellation features. It covers local setup, API usage, testing strategies, and common development workflows following TDD and DDD principles.

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Project cloned and dependencies installed (`npm install`)
- ✅ Familiarity with TypeScript and NestJS basics
- ✅ Understanding of DDD tactical patterns (aggregates, value objects, domain events)
- ✅ Read `/docs/lessons/lesson-3-state-management.md` and `/docs/domain/order-state-machine.md`

## Project Structure

```
src/
├── domain/order/
│   ├── order.ts                    # Order aggregate with markAsPaid/cancel methods
│   ├── events/
│   │   ├── order-paid.event.ts    # Domain event for payment
│   │   └── order-cancelled.event.ts # Domain event for cancellation
│
├── application/order/
│   ├── services/
│   │   ├── confirm-payment.service.ts  # Payment orchestration
│   │   └── cancel-order.service.ts     # Cancellation orchestration
│   ├── gateways/
│   │   └── payment-gateway.interface.ts # Gateway contract
│
└── infrastructure/order/
    ├── gateways/
    │   └── stubbed-payment.gateway.ts   # Stubbed gateway implementation
    └── controllers/
        └── order.controller.ts          # REST endpoints
```

## Quick Start - Running the Application

### 1. Start Development Server

```bash
npm run start:dev
```

Server starts on `http://localhost:3000` with hot reload enabled.

### 2. Verify Application Health

```bash
curl http://localhost:3000
# Expected: Hello World (from default NestJS route)
```

### 3. Create Test Order (from Stage 2)

First, create a shopping cart and checkout to get an order in AwaitingPayment state:

```bash
# Create cart (from Stage 1)
POST http://localhost:3000/carts
{
  "customerId": "customer-123"
}

# Add items to cart
POST http://localhost:3000/carts/{cartId}/items
{
  "productId": "prod-001",
  "quantity": 2
}

# Checkout (from Stage 2)
POST http://localhost:3000/orders/checkout
{
  "cartId": "cart-abc",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "USA"
  }
}

# Response includes orderId in AwaitingPayment state
```

### 4. Test Payment Processing

```bash
# Pay for order (successful - orderId ending in 0)
POST http://localhost:3000/orders/{orderId}/pay
{}

# Response: Order with status="Paid", paymentId="PAY-{orderId}"
```

### 5. Test Order Cancellation

```bash
# Cancel order
POST http://localhost:3000/orders/{orderId}/cancel
{
  "reason": "Customer changed mind"
}

# Response: Order with status="Cancelled", cancellationReason populated
```

## API Reference

### POST /orders/:id/pay

**Process payment for an order**

**Path Parameters:**
- `id` (string, UUID): Order ID

**Request Body:**
```json
{}
```
*(Currently empty - payment details abstracted by stubbed gateway)*

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "customer-123",
  "status": "Paid",
  "totalAmount": { "amount": 100.00, "currency": "USD" },
  "paymentId": "PAY-550e8400",
  "cancellationReason": null,
  "items": [...],
  "shippingAddress": {...},
  "createdAt": "2026-01-04T15:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Order does not exist
- `409 Conflict`: Order not in AwaitingPayment state (already paid or cancelled)
- `422 Unprocessable Entity`: Payment gateway declined payment

**Example Error (409 Conflict - Already Paid):**
```json
{
  "statusCode": 409,
  "message": "Cannot mark order as paid: order is in Paid state",
  "error": "Conflict",
  "currentState": "Paid"
}
```

**Example Error (422 - Payment Declined):**
```json
{
  "statusCode": 422,
  "message": "Payment declined",
  "error": "Unprocessable Entity",
  "reason": "Insufficient funds"
}
```

### POST /orders/:id/cancel

**Cancel an order with required reason**

**Path Parameters:**
- `id` (string, UUID): Order ID

**Request Body:**
```json
{
  "reason": "Customer changed mind"
}
```
*(Reason is mandatory, 1-500 characters, cannot be whitespace-only)*

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "customer-123",
  "status": "Cancelled",
  "totalAmount": { "amount": 100.00, "currency": "USD" },
  "paymentId": null,
  "cancellationReason": "Customer changed mind",
  "items": [...],
  "shippingAddress": {...},
  "createdAt": "2026-01-04T15:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (empty reason, too long, etc.)
- `404 Not Found`: Order does not exist
- `409 Conflict`: Order already cancelled
- `422 Unprocessable Entity`: Whitespace-only reason

**Example Error (409 Conflict - Already Cancelled):**
```json
{
  "statusCode": 409,
  "message": "Cannot cancel order: order is in Cancelled state",
  "error": "Conflict",
  "currentState": "Cancelled",
  "originalReason": "Customer changed mind"
}
```

## Testing Guide

### Running Tests

```bash
# All unit tests
npm run test

# Single test file
npm run test order.spec

# Watch mode (re-runs on file changes)
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

### Test Structure

**Domain Layer Tests** (`src/domain/order/__tests__/order.spec.ts`):
```typescript
describe('Order.markAsPaid', () => {
  it('should transition from AwaitingPayment to Paid', () => {
    const order = createOrderInAwaitingPayment();
    order.markAsPaid('PAY-123');
    expect(order.status.equals(OrderStatus.Paid)).toBe(true);
    expect(order.paymentId).toBe('PAY-123');
  });

  it('should raise OrderPaid event', () => {
    const order = createOrderInAwaitingPayment();
    order.markAsPaid('PAY-123');
    const events = order.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderPaid);
  });

  it('should throw when order already paid', () => {
    const order = createPaidOrder();
    expect(() => order.markAsPaid('PAY-456')).toThrow(InvalidOrderStateTransitionError);
  });
});
```

**Application Layer Tests** (`src/application/order/services/__tests__/confirm-payment.service.spec.ts`):
```typescript
describe('ConfirmPaymentService', () => {
  it('should confirm payment when gateway approves', async () => {
    const gateway = createMockGateway({ success: true, paymentId: 'PAY-123' });
    const service = new ConfirmPaymentService(repository, gateway, eventPublisher);

    const result = await service.execute('order-abc');

    expect(result.status).toBe('Paid');
    expect(result.paymentId).toBe('PAY-123');
    expect(eventPublisher.publishAll).toHaveBeenCalled();
  });

  it('should throw when gateway declines', async () => {
    const gateway = createMockGateway({ success: false, reason: 'Insufficient funds' });
    const service = new ConfirmPaymentService(repository, gateway, eventPublisher);

    await expect(service.execute('order-abc')).rejects.toThrow(PaymentDeclinedError);
  });
});
```

**E2E Tests** (`test/order/order-payment.e2e-spec.ts`):
```typescript
describe('POST /orders/:id/pay (e2e)', () => {
  it('should pay order successfully', () => {
    return request(app.getHttpServer())
      .post(`/orders/${orderId}/pay`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('Paid');
        expect(res.body.paymentId).toBeDefined();
      });
  });

  it('should return 409 when order already paid', () => {
    return request(app.getHttpServer())
      .post(`/orders/${paidOrderId}/pay`)
      .send({})
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toContain('already paid');
      });
  });
});
```

### Test Data Patterns (Stubbed Gateway)

The `StubbedPaymentGateway` uses deterministic patterns for testing:

**Payment Approval Patterns:**
- OrderId ending in "0": ✅ Approval with paymentId "PAY-{orderId}"
- OrderId ending in "5": ❌ Rejection "Insufficient funds"
- OrderId ending in "9": ❌ Rejection "Card declined"
- Amount < $0.01: ❌ Rejection "Invalid amount"
- Amount > $10,000: ❌ Rejection "Fraud check failed"

**Example Test Order IDs:**
- `order-abc-def-0`: Will be approved
- `order-abc-def-5`: Will be rejected (insufficient funds)
- `order-abc-def-9`: Will be rejected (card declined)

## Development Workflow (TDD)

### Adding New Feature to Order Aggregate

Follow this TDD cycle:

**1. Write Failing Test First**

```typescript
// src/domain/order/__tests__/order.spec.ts
describe('Order.newFeature', () => {
  it('should do something when conditions met', () => {
    const order = createOrderInSomeState();
    order.newFeature();
    expect(order.someProperty).toBe(expectedValue);
  });
});
```

Run test → ❌ Fails (method doesn't exist)

**2. Implement Minimum Code to Pass**

```typescript
// src/domain/order/order.ts
export class Order {
  newFeature(): void {
    // Implement business logic here
    this.someProperty = newValue;
  }
}
```

Run test → ✅ Passes

**3. Refactor While Keeping Tests Green**

```typescript
// Extract helper methods, improve naming, etc.
// Tests still pass
```

**4. Commit Following Conventional Commits**

```bash
# After writing test
git add src/domain/order/__tests__/order.spec.ts
git commit -m "test: add test for Order.newFeature()"

# After implementing feature
git add src/domain/order/order.ts
git commit -m "feat: implement Order.newFeature()"

# After refactoring
git add src/domain/order/order.ts
git commit -m "refactor: extract helper method in Order.newFeature()"
```

### Extending Application Service

**1. Write Integration Test**

```typescript
// src/application/order/services/__tests__/new-service.spec.ts
describe('NewService', () => {
  it('should orchestrate domain and infrastructure', async () => {
    const mockRepo = createMockRepository();
    const mockGateway = createMockGateway();
    const service = new NewService(mockRepo, mockGateway);

    const result = await service.execute(input);

    expect(mockRepo.save).toHaveBeenCalled();
    expect(result).toMatchSnapshot();
  });
});
```

**2. Implement Service (Orchestration Only)**

```typescript
// src/application/order/services/new-service.ts
@Injectable()
export class NewService {
  constructor(
    private orderRepo: IOrderRepository,
    private gateway: ISomeGateway,
  ) {}

  async execute(input: InputDto): Promise<OutputDto> {
    // 1. Load aggregate
    // 2. Call gateway if needed
    // 3. Invoke domain method (business logic stays in aggregate!)
    // 4. Persist
    // 5. Publish events
    // 6. Return DTO
  }
}
```

**3. Add E2E Test**

```typescript
// test/order/new-feature.e2e-spec.ts
describe('POST /orders/:id/new-action (e2e)', () => {
  it('should execute new action successfully', () => {
    return request(app.getHttpServer())
      .post(`/orders/${orderId}/new-action`)
      .send(payload)
      .expect(200);
  });
});
```

## Common Development Tasks

### Task: Add New Domain Event

**1. Create Event Class**

```typescript
// src/domain/order/events/order-something-happened.event.ts
import { DomainEvent } from '../../shared/domain-event';

export class OrderSomethingHappened implements DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly occurredAt: Date,
    public readonly someData: string,
  ) {}
}
```

**2. Raise Event from Aggregate**

```typescript
// src/domain/order/order.ts
doSomething(): void {
  // Business logic
  this._domainEvents.push(
    new OrderSomethingHappened(
      this._id.value,
      new Date(),
      this.someData,
    ),
  );
}
```

**3. Test Event Raising**

```typescript
it('should raise OrderSomethingHappened event', () => {
  const order = createOrder();
  order.doSomething();
  const events = order.getDomainEvents();
  expect(events).toContainInstanceOf(OrderSomethingHappened);
});
```

### Task: Add New Gateway

**1. Define Interface (Application Layer)**

```typescript
// src/application/order/gateways/new-gateway.interface.ts
export interface INewGateway {
  doSomething(input: DomainType): Promise<Result>;
}
```

**2. Implement in Infrastructure**

```typescript
// src/infrastructure/order/gateways/new-gateway.impl.ts
@Injectable()
export class NewGatewayImpl implements INewGateway {
  async doSomething(input: DomainType): Promise<Result> {
    // HTTP call, message queue, etc.
  }
}
```

**3. Register in Module**

```typescript
// src/infrastructure/order/order.module.ts
@Module({
  providers: [
    {
      provide: 'INewGateway',
      useClass: NewGatewayImpl,
    },
  ],
})
```

### Task: Add Validation Rule

**Domain Validation** (invariants):
```typescript
// src/domain/order/order.ts
private validateInvariants(): void {
  if (this.someCondition) {
    throw new Error('Invariant violated: some condition must be met');
  }
}
```

**Application Validation** (DTO):
```typescript
// src/application/order/dtos/some.dto.ts
export class SomeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  someField: string;
}
```

## Debugging Tips

### Common Issues

**Issue: "Cannot mark order as paid: order is in Paid state"**
- **Cause**: Order already paid (state machine violation)
- **Solution**: Check order status before calling payment endpoint
- **Debug**: `GET /orders/:id` to see current status

**Issue: "Payment declined: Insufficient funds"**
- **Cause**: Gateway rejected payment (orderId ending in "5" in stubbed gateway)
- **Solution**: Use orderId ending in "0" for testing approvals
- **Debug**: Check gateway stub logic in `stubbed-payment.gateway.ts`

**Issue: "Cancellation reason cannot be empty or whitespace-only"**
- **Cause**: Reason validation failed
- **Solution**: Provide substantive reason (1-500 characters, not just whitespace)
- **Debug**: Check DTO validation decorators

### Logging

Enable debug logging:

```bash
# Environment variable
DEBUG=* npm run start:dev

# Or in code
console.log('Order state:', order.status.toString());
console.log('Payment result:', result);
```

### Database Inspection (In-Memory)

Since project uses in-memory repository, inspect via:

```typescript
// In test or debug code
const allOrders = await orderRepository.findAll();
console.log('All orders:', allOrders);
```

## Best Practices

### ✅ DO

- Write tests before implementation (TDD)
- Keep business logic in domain layer (Order aggregate)
- Use intention-revealing method names (`markAsPaid`, not `updateStatus`)
- Validate invariants in aggregate constructors
- Use value objects instead of primitives
- Commit atomically with Conventional Commits
- Run linting and formatting before committing

### ❌ DON'T

- Put business logic in application services (orchestration only)
- Use NestJS decorators in domain layer
- Expose aggregate setters publicly
- Skip writing tests
- Couple domain to infrastructure concerns
- Make large commits mixing multiple changes

## Next Steps

After mastering this feature:

1. ✅ Review `/docs/lessons/lesson-3-state-management.md` for deeper understanding
2. ✅ Explore Stage 4 (Lesson 4) for event-driven async integration
3. ✅ Read `/docs/ddd-patterns/domain-events.md` for event patterns
4. ✅ Practice TDD by adding new order state transitions
5. ✅ Experiment with real payment gateway integration (replace stubbed gateway)

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [Conventional Commits Specification](https://www.conventionalcommits.org)
- Project constitution: `.specify/memory/constitution.md`
- DDD patterns: `/docs/ddd-patterns/`
- API contracts: `./contracts/`

## Support

For questions or issues:
- Review lesson documentation in `/docs/lessons/`
- Check DDD pattern reference in `/docs/ddd-patterns/`
- Consult project constitution for principles
- Run `/help` in Claude Code CLI

