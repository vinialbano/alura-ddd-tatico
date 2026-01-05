# Data Model: Synchronous Payment and Order Cancellation Flows

**Feature**: 003-payment-cancel-flows
**Date**: 2026-01-04

## Overview

This document describes the data model changes and new domain entities introduced for payment processing and order cancellation flows. Most entities already exist from Stage 2 (Order Domain). This feature primarily adds domain events and extends existing aggregates rather than introducing new entities.

## Domain Layer

### Aggregate: Order (EXTENDED)

**Location**: `src/domain/order/order.ts`

**Changes**:
- Add private array to collect domain events
- Modify `markAsPaid()` to raise `OrderPaid` event
- Modify `cancel()` to raise `OrderCancelled` event
- Add `getDomainEvents()` method to expose collected events
- Add `clearDomainEvents()` method for post-publish cleanup

**Fields** (existing, documented for context):

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| _id | OrderId | Yes | Unique order identifier | System-generated UUID |
| _cartId | CartId | Yes | Reference to source shopping cart | Valid CartId |
| _customerId | CustomerId | Yes | Customer who owns this order | Valid CustomerId |
| _items | OrderItem[] | Yes | Collection of order line items | Min 1 item, all same currency |
| _shippingAddress | ShippingAddress | Yes | Delivery address | 5 required fields |
| _status | OrderStatus | Yes | Current order state | AwaitingPayment\|Paid\|Cancelled |
| _orderLevelDiscount | Money | Yes | Cart-wide discount | Non-negative, same currency as total |
| _totalAmount | Money | Yes | Total after all discounts | Non-negative, matches sum of items |
| _paymentId | string \| null | No | Payment transaction ID | Populated when status = Paid |
| _cancellationReason | string \| null | No | Cancellation explanation | Populated when status = Cancelled, 1-500 chars |
| _createdAt | Date | Yes | Order creation timestamp | System-generated |
| _domainEvents | DomainEvent[] | Yes | Collected domain events | Internal, cleared after publishing |

**Methods** (existing, now raising events):

| Method | Parameters | Returns | Side Effects | Throws |
|--------|------------|---------|--------------|--------|
| markAsPaid | paymentId: string | void | Sets _status = Paid, stores _paymentId, raises OrderPaid event | InvalidOrderStateTransitionError if not AwaitingPayment |
| cancel | reason: string | void | Sets _status = Cancelled, stores _cancellationReason, raises OrderCancelled event | InvalidOrderStateTransitionError if already Cancelled |
| canBePaid | - | boolean | None (query) | - |
| canBeCancelled | - | boolean | None (query) | - |
| getDomainEvents | - | readonly DomainEvent[] | None (query) | - |
| clearDomainEvents | - | void | Clears _domainEvents array | - |

**State Transitions**:

```
[AwaitingPayment]
  ├─ markAsPaid(paymentId) → [Paid] + raises OrderPaid
  └─ cancel(reason) → [Cancelled] + raises OrderCancelled

[Paid]
  └─ cancel(reason) → [Cancelled] + raises OrderCancelled

[Cancelled]
  └─ (terminal state, no transitions)
```

**Invariants**:
1. Must have at least one OrderItem
2. All OrderItems must share same currency as Order totalAmount
3. Cannot transition to Paid unless currently in AwaitingPayment
4. Cannot transition to Cancelled if already Cancelled
5. PaymentId must be non-empty string when marking as paid
6. Cancellation reason must be non-empty, non-whitespace, max 500 chars

### Base Interface: DomainEvent (NEW)

**Location**: `src/domain/shared/domain-event.ts`

**Purpose**: Base interface for all domain events, providing common metadata

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| aggregateId | string | Yes | ID of aggregate that raised event |
| occurredAt | Date | Yes | Timestamp when event occurred |

**Usage**: All domain events extend this interface

### Domain Event: OrderPaid (NEW)

**Location**: `src/domain/order/events/order-paid.event.ts`

**Purpose**: Raised when order successfully transitions to Paid state after payment confirmation

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| aggregateId | string | Yes | Order ID (from DomainEvent) | "550e8400-e29b-41d4-a716-446655440000" |
| occurredAt | Date | Yes | Event timestamp (from DomainEvent) | 2026-01-04T15:30:00Z |
| paymentId | string | Yes | Payment transaction identifier from gateway | "PAY-12345-XYZ" |

**Example**:
```typescript
{
  aggregateId: "order-123",
  occurredAt: new Date("2026-01-04T15:30:00Z"),
  paymentId: "PAY-12345-XYZ"
}
```

**Raised By**: `Order.markAsPaid(paymentId)` method

**Subscribers** (future, Stage 4):
- Inventory context (to reserve stock)
- Notification service (to send confirmation email)
- Analytics service (to track conversion)

### Domain Event: OrderCancelled (NEW)

**Location**: `src/domain/order/events/order-cancelled.event.ts`

**Purpose**: Raised when order transitions to Cancelled state from either AwaitingPayment or Paid

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| aggregateId | string | Yes | Order ID (from DomainEvent) | "550e8400-e29b-41d4-a716-446655440000" |
| occurredAt | Date | Yes | Event timestamp (from DomainEvent) | 2026-01-04T16:45:00Z |
| cancellationReason | string | Yes | User/system provided reason | "Customer changed mind" |
| previousState | string | Yes | State before cancellation | "AwaitingPayment" or "Paid" |

**Example**:
```typescript
{
  aggregateId: "order-456",
  occurredAt: new Date("2026-01-04T16:45:00Z"),
  cancellationReason: "Item out of stock",
  previousState: "Paid"
}
```

**Raised By**: `Order.cancel(reason)` method

**Subscribers** (future, Stage 4):
- Refund service (if previousState was Paid)
- Inventory context (to release reserved stock)
- Notification service (to send cancellation email)
- Analytics service (to track cancellation reasons)

### Exception: InvalidOrderStateTransitionError (EXISTS)

**Location**: `src/domain/order/exceptions/invalid-order-state-transition.error.ts`

**Purpose**: Thrown when attempted state transition violates state machine rules

**Usage**: Already exists from Stage 2, used by markAsPaid/cancel methods

## Application Layer

### Gateway Interface: IPaymentGateway (NEW)

**Location**: `src/application/order/gateways/payment-gateway.interface.ts`

**Purpose**: Abstract interface for external payment processing system (Anti-Corruption Layer)

**Contract**:

```typescript
export interface IPaymentGateway {
  processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult>;
}

export type PaymentResult =
  | { success: true; paymentId: string }
  | { success: false; reason: string };
```

**Implementations**:
- `StubbedPaymentGateway` (infrastructure, this stage)
- `StripePaymentGateway` (future, if integrated with real payment system)

### Application Service: ConfirmPaymentService (NEW)

**Location**: `src/application/order/services/confirm-payment.service.ts`

**Purpose**: Orchestrate payment confirmation use case

**Dependencies**:
- `IOrderRepository` (domain interface)
- `IPaymentGateway` (application interface)
- `IDomainEventPublisher` (future - NestJS EventEmitter or message bus)

**Method**: `execute(orderId: string): Promise<OrderResponseDto>`

**Flow**:
1. Load Order from repository
2. Call PaymentGateway.processPayment()
3. If declined, throw PaymentDeclinedError
4. If approved, call Order.markAsPaid(paymentId)
5. Save Order to repository
6. Publish domain events
7. Return OrderResponseDto

### Application Service: CancelOrderService (NEW)

**Location**: `src/application/order/services/cancel-order.service.ts`

**Purpose**: Orchestrate order cancellation use case

**Dependencies**:
- `IOrderRepository` (domain interface)
- `IDomainEventPublisher` (future)

**Method**: `execute(orderId: string, reason: string): Promise<OrderResponseDto>`

**Flow**:
1. Load Order from repository
2. Validate reason is non-empty, non-whitespace
3. Call Order.cancel(reason)
4. Save Order to repository
5. Publish domain events
6. Return OrderResponseDto

### DTOs

#### PayOrderDto (NEW)

**Location**: `src/application/order/dtos/pay-order.dto.ts`

**Purpose**: Request body for POST /orders/:id/pay (currently empty, payment details abstracted by stubbed gateway)

**Fields**: None (future: payment method, billing address)

**Validation**: None required

#### CancelOrderDto (NEW)

**Location**: `src/application/order/dtos/cancel-order.dto.ts`

**Purpose**: Request body for POST /orders/:id/cancel

**Fields**:

| Field | Type | Required | Validation | Example |
|-------|------|----------|------------|---------|
| reason | string | Yes | @IsString, @IsNotEmpty, @MinLength(1), @MaxLength(500) | "Customer changed mind" |

#### OrderResponseDto (EXTENDED)

**Location**: `src/application/order/dtos/order-response.dto.ts`

**Purpose**: Response body for order-related endpoints

**New Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| paymentId | string \| null | No | Payment transaction ID (null if not paid) | "PAY-12345-XYZ" |
| cancellationReason | string \| null | No | Cancellation reason (null if not cancelled) | "Item out of stock" |

**Existing Fields** (from Stage 2): id, customerId, status, totalAmount, items, shippingAddress, createdAt

## Infrastructure Layer

### Gateway Implementation: StubbedPaymentGateway (NEW)

**Location**: `src/infrastructure/order/gateways/stubbed-payment.gateway.ts`

**Purpose**: Stubbed implementation of IPaymentGateway for educational/testing purposes

**Behavior** (deterministic for testing):
- OrderId ending in "0" → Approval with paymentId "PAY-{orderId}"
- OrderId ending in "5" → Rejection with reason "Insufficient funds"
- OrderId ending in "9" → Rejection with reason "Card declined"
- Amount < $0.01 → Rejection with reason "Invalid amount"
- Amount > $10,000 → Rejection with reason "Fraud check failed"
- Simulates latency: 500ms-2s random delay

**Not Implemented** (out of scope):
- Real HTTP calls to external API
- Retry logic
- Idempotency checking
- Webhook handling

### Controller Extension: OrderController (EXTENDED)

**Location**: `src/infrastructure/order/controllers/order.controller.ts`

**New Endpoints**:

#### POST /orders/:id/pay

**Purpose**: Process payment for order in AwaitingPayment state

**Request**:
- Path param: `id` (string, UUID)
- Body: `PayOrderDto` (currently empty)

**Responses**:
- 200 OK: Payment successful, returns `OrderResponseDto` with status=Paid
- 404 Not Found: Order does not exist
- 409 Conflict: Order not in AwaitingPayment state
- 422 Unprocessable Entity: Payment gateway declined payment

**Controller Logic**:
```typescript
@Post(':id/pay')
async pay(@Param('id') id: string, @Body() dto: PayOrderDto): Promise<OrderResponseDto> {
  try {
    return await this.confirmPaymentService.execute(id);
  } catch (error) {
    if (error instanceof InvalidOrderStateTransitionError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof PaymentDeclinedError) {
      throw new UnprocessableEntityException({ message: 'Payment declined', reason: error.reason });
    }
    throw error;
  }
}
```

#### POST /orders/:id/cancel

**Purpose**: Cancel order with required reason

**Request**:
- Path param: `id` (string, UUID)
- Body: `CancelOrderDto` { reason: string }

**Responses**:
- 200 OK: Cancellation successful, returns `OrderResponseDto` with status=Cancelled
- 404 Not Found: Order does not exist
- 409 Conflict: Order already cancelled
- 422 Unprocessable Entity: Validation failed (empty reason, whitespace-only)

**Controller Logic**:
```typescript
@Post(':id/cancel')
async cancel(@Param('id') id: string, @Body() dto: CancelOrderDto): Promise<OrderResponseDto> {
  try {
    return await this.cancelOrderService.execute(id, dto.reason);
  } catch (error) {
    if (error instanceof InvalidOrderStateTransitionError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }
}
```

## Data Flow Diagrams

### Payment Processing Flow

```
[Client]
  POST /orders/123/pay
    ↓
[OrderController]
    ↓
[ConfirmPaymentService]
  ├─ 1. Load Order(123) from Repository
  ├─ 2. PaymentGateway.processPayment()
  │     ↓
  │   [StubbedPaymentGateway]
  │     → returns { success: true, paymentId: "PAY-123" }
  ├─ 3. Order.markAsPaid("PAY-123")
  │     ├─ Validate state = AwaitingPayment
  │     ├─ Set _status = Paid
  │     ├─ Set _paymentId = "PAY-123"
  │     └─ Raise OrderPaid event
  ├─ 4. Repository.save(Order)
  ├─ 5. EventPublisher.publishAll([OrderPaid])
  └─ 6. Return OrderResponseDto
    ↓
[Client]
  ← 200 OK { id: "123", status: "Paid", paymentId: "PAY-123" }
```

### Cancellation Flow

```
[Client]
  POST /orders/456/cancel { reason: "Customer changed mind" }
    ↓
[OrderController]
    ↓
[CancelOrderService]
  ├─ 1. Load Order(456) from Repository
  ├─ 2. Validate reason non-empty
  ├─ 3. Order.cancel("Customer changed mind")
  │     ├─ Validate state allows cancellation
  │     ├─ Capture previousState
  │     ├─ Set _status = Cancelled
  │     ├─ Set _cancellationReason = "Customer changed mind"
  │     └─ Raise OrderCancelled event
  ├─ 4. Repository.save(Order)
  ├─ 5. EventPublisher.publishAll([OrderCancelled])
  └─ 6. Return OrderResponseDto
    ↓
[Client]
  ← 200 OK { id: "456", status: "Cancelled", cancellationReason: "Customer changed mind" }
```

## Validation Rules Summary

### Domain Layer Validation

| Rule | Enforced By | Error Type |
|------|-------------|------------|
| Order must have ≥ 1 item | Order constructor | Error (invariant violation) |
| All items same currency | Order constructor | Error (invariant violation) |
| Can only pay from AwaitingPayment | Order.markAsPaid() | InvalidOrderStateTransitionError |
| Can only cancel from AwaitingPayment or Paid | Order.cancel() | InvalidOrderStateTransitionError |
| PaymentId must be non-empty | Order.markAsPaid() | Error (precondition violation) |
| Cancellation reason must be non-empty | Order.cancel() | Error (precondition violation) |

### Application Layer Validation

| Rule | Enforced By | Error Type |
|------|-------------|------------|
| OrderId must exist | Application Service + Repository | OrderNotFoundError |
| Cancellation reason 1-500 chars | CancelOrderDto validation | ValidationError (HTTP 400) |
| Cancellation reason not whitespace-only | CancelOrderService | ValidationError |

### Infrastructure Layer Validation

| Rule | Enforced By | HTTP Status |
|------|-------------|-------------|
| Request body matches DTO schema | NestJS ValidationPipe | 400 Bad Request |
| UUID format for orderId | NestJS ParseUUIDPipe | 400 Bad Request |

## Testing Considerations

### Test Data Patterns

**Orders for Payment Testing**:
- Order ending in "0": Will receive payment approval
- Order ending in "5": Will receive "Insufficient funds" rejection
- Order ending in "9": Will receive "Card declined" rejection
- Order with totalAmount < $0.01: Will receive "Invalid amount" rejection
- Order with totalAmount > $10,000: Will receive "Fraud check failed" rejection

**Orders for Cancellation Testing**:
- Order in AwaitingPayment: Cancellation should succeed
- Order in Paid: Cancellation should succeed (refund scenario)
- Order in Cancelled: Cancellation should fail with 409 Conflict

### Mock Data Examples

**Example Order (AwaitingPayment)**:
```json
{
  "id": "order-abc-def-0",
  "customerId": "customer-123",
  "status": "AwaitingPayment",
  "totalAmount": { "amount": 100.00, "currency": "USD" },
  "paymentId": null,
  "cancellationReason": null,
  "createdAt": "2026-01-04T15:00:00Z"
}
```

**After Payment (Paid)**:
```json
{
  "id": "order-abc-def-0",
  "status": "Paid",
  "paymentId": "PAY-order-abc-def-0",
  ...
}
```

**After Cancellation (Cancelled)**:
```json
{
  "id": "order-abc-def-0",
  "status": "Cancelled",
  "cancellationReason": "Customer changed mind",
  ...
}
```

## Summary

This data model extends the existing Order aggregate with domain event capabilities and introduces two new domain events (OrderPaid, OrderCancelled). The gateway pattern provides anti-corruption layer for external payment system. Application services orchestrate use cases without business logic. DTOs maintain clean API contract separate from domain model. All validation rules enforce invariants at appropriate layers following DDD principles.

**Key Changes**:
- ✅ Order aggregate: +domain events, +event collection methods
- ✅ 2 new domain events: OrderPaid, OrderCancelled
- ✅ 1 new gateway interface: IPaymentGateway
- ✅ 2 new application services: ConfirmPaymentService, CancelOrderService
- ✅ 3 new/extended DTOs: PayOrderDto, CancelOrderDto, OrderResponseDto
- ✅ 1 gateway implementation: StubbedPaymentGateway
- ✅ 2 new controller endpoints: POST /orders/:id/pay, POST /orders/:id/cancel

**No Breaking Changes**: Existing Order aggregate API remains compatible. New functionality is additive.

