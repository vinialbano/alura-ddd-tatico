# Research: Event-Driven Integration Flow

**Feature**: 004-event-driven-integration
**Date**: 2026-01-05
**Purpose**: Resolve technical decisions and unknowns before implementation

---

## 1. In-Memory Message Bus Pattern

### Decision

Implement a simple topic-based pub/sub message bus using TypeScript `Map<topic, Set<handler>>` for subscriber storage and immediate synchronous invocation of handlers wrapped in `setTimeout(..., 0)` to simulate async processing.

### Rationale

**Problem**: Need lightweight, testable message bus without external dependencies (RabbitMQ, Kafka, Redis) for educational DDD demonstration.

**Options Considered**:
1. **EventEmitter (Node.js built-in)**
   - ❌ Doesn't support topic-based routing naturally
   - ❌ Synchronous by default, hard to simulate async behavior
   - ✅ Zero dependencies

2. **RxJS Subject**
   - ✅ Supports topic-based filtering via operators
   - ✅ Built-in async handling
   - ❌ Already a dependency but adds complexity for simple use case
   - ❌ Requires Observable understanding (cognitive load)

3. **Custom Map-based implementation** ✅ **CHOSEN**
   - ✅ Explicit topic routing (`Map<topic, Set<handler>>`)
   - ✅ Multiple subscribers per topic (Set data structure)
   - ✅ Async simulation via `setTimeout` for testability
   - ✅ Minimal code, easy to understand and debug
   - ✅ Full control over message delivery semantics

**Implementation Pattern**:
```typescript
class InMemoryMessageBus implements IMessageBus {
  private subscribers = new Map<string, Set<MessageHandler>>();

  async publish<T>(topic: string, payload: T): Promise<void> {
    const handlers = this.subscribers.get(topic) || new Set();
    const message = this.createEnvelope(topic, payload);

    // Simulate async with setTimeout (preserves call stack for errors)
    handlers.forEach(handler => {
      setTimeout(() => handler(message), 0);
    });
  }

  subscribe<T>(topic: string, handler: MessageHandler<T>): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);
  }
}
```

**Testing Considerations**:
- Use `await new Promise(resolve => setImmediate(resolve))` in tests to wait for handlers
- Jest fake timers can control async timing for deterministic tests
- Easy to spy on handlers to verify invocation

### Alternatives Rejected

- **Event Sourcing Store**: Out of scope (OS-005), adds complexity
- **Dead Letter Queue**: Out of scope (OS-002), not needed for success-path focus
- **Retry Logic**: Out of scope (OS-008), simulated consumers always succeed

---

## 2. Domain Event to Integration Message Mapping

### Decision

Use explicit **Publisher Pattern** with dedicated `DomainEventPublisher` service that maps each domain event type to its corresponding integration message topic and payload structure.

### Rationale

**Problem**: Domain events (OrderPlaced, OrderPaid) must be translated to integration messages (order.placed, order.paid) with different payload formats (domain objects → JSON primitives).

**Options Considered**:
1. **Automatic Mapping via Convention**
   - Event name → topic (e.g., "OrderPlaced" → "order.placed")
   - Serialize entire domain event as payload
   - ❌ Leaks domain implementation details to external contexts
   - ❌ Tight coupling (external contexts depend on domain structure)
   - ❌ Breaks Anti-Corruption Layer principle

2. **Event Handler per Domain Event**
   - Each domain event has dedicated handler that publishes integration message
   - ✅ Explicit, easy to understand
   - ❌ Boilerplate code for each event type
   - ❌ Hard to centralize event publishing logic

3. **Centralized Publisher with Explicit Mapping** ✅ **CHOSEN**
   - Single `DomainEventPublisher` service
   - Switch/case or strategy pattern to map event type → topic + payload
   - ✅ Centralized control over all event→message mappings
   - ✅ Easy to add logging, metrics, error handling
   - ✅ Clear separation: domain events (internal) vs integration messages (external)
   - ✅ Anti-Corruption Layer: domain models never exposed directly

**Implementation Pattern**:
```typescript
class DomainEventPublisher {
  constructor(private messageBus: IMessageBus) {}

  async publishDomainEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publishSingleEvent(event);
    }
  }

  private async publishSingleEvent(event: DomainEvent): Promise<void> {
    if (event instanceof OrderPlaced) {
      await this.publishOrderPlaced(event);
    } else if (event instanceof OrderPaid) {
      await this.publishOrderPaid(event);
    } else if (event instanceof OrderCancelled) {
      await this.publishOrderCancelled(event);
    }
  }

  private async publishOrderPlaced(event: OrderPlaced): Promise<void> {
    const payload: OrderPlacedPayload = {
      orderId: event.orderId.value,
      customerId: event.customerId.value,
      items: event.items.map(item => ({
        productId: item.productId.value,
        quantity: item.quantity.value,
        price: item.unitPrice.amount,
      })),
      totalAmount: event.totalAmount.amount,
      currency: event.totalAmount.currency,
      timestamp: event.timestamp.toISOString(),
    };
    await this.messageBus.publish('order.placed', payload);
  }
}
```

**Integration Message Envelope**:
- **messageId**: UUID generated at publish time
- **topic**: Explicit string (e.g., "order.placed")
- **timestamp**: When message was published (may differ from event timestamp)
- **payload**: Flattened, JSON-serializable data (primitives only)
- **correlationId**: orderId for tracing across contexts

### Alternatives Rejected

- **Automatic serialization**: Violates ACL principle, creates tight coupling
- **Event bus integrated into domain**: Violates domain purity (Principle I)

---

## 3. Idempotency Tracking Without Persistence

### Decision

Track processed **paymentIds** and **reservationIds** in `Set<string>` fields within the `Order` aggregate, scoped per order instance. No global idempotency store.

### Rationale

**Problem**: Must detect duplicate external events (payment.approved, stock.reserved) to prevent state corruption, but cannot use persistent storage (educational in-memory constraint).

**Options Considered**:
1. **Global Idempotency Store (Map<orderId, Set<eventId>>)**
   - Centralized tracking across all orders
   - ✅ Easy to implement time-based cleanup
   - ❌ Violates aggregate boundary (cross-order concern)
   - ❌ Requires singleton service (state management complexity)
   - ❌ Not scoped to transaction boundary

2. **Order Aggregate Tracks Processed IDs** ✅ **CHOSEN**
   - `private processedPaymentIds: Set<string>`
   - `private processedReservationIds: Set<string>`
   - ✅ Scoped to aggregate boundary (consistent with DDD)
   - ✅ Idempotency is part of order invariants
   - ✅ Simple: check `if (this.processedPaymentIds.has(paymentId)) return;`
   - ✅ No external dependencies
   - ❌ Lost on application restart (acceptable for educational demo)

3. **Event Sourcing with Event ID Deduplication**
   - Store all events, check eventId before applying
   - ❌ Out of scope (OS-005)
   - ❌ Requires event store infrastructure

**Implementation Pattern**:
```typescript
class Order {
  private processedPaymentIds = new Set<string>();
  private processedReservationIds = new Set<string>();

  markAsPaid(paymentId: string): void {
    // Idempotency check
    if (this.processedPaymentIds.has(paymentId)) {
      return; // Already processed, no-op
    }

    // State validation
    if (this.status !== OrderStatus.AwaitingPayment) {
      throw new InvalidOrderStateTransitionError(...);
    }

    // Apply state change
    this.status = OrderStatus.Paid;
    this.paymentId = paymentId;
    this.processedPaymentIds.add(paymentId);

    // Emit event
    this.addDomainEvent(new OrderPaid(...));
  }
}
```

**Time Window**: 24 hours per spec assumption A-008, but NOT implemented in memory (would require scheduled cleanup job). For educational demo, Sets grow unbounded within single application session.

### Alternatives Rejected

- **Persistent idempotency store**: Requires database (out of scope)
- **Event ID comparison**: EventId is for domain events, not external integration events
- **No idempotency**: Violates FR-022, FR-023, FR-024, FR-025

---

## 4. Simulated Consumer Implementation

### Decision

Implement Payments and Stock consumers as **NestJS Injectable services** that subscribe to message bus topics in their constructor and publish responses with configurable delay (0-100ms) to simulate processing time.

### Rationale

**Problem**: Need realistic external bounded context simulation without actual microservices infrastructure.

**Options Considered**:
1. **Separate NestJS Modules**
   - `PaymentsModule`, `StockModule` with their own controllers/services
   - ✅ Realistic microservice structure
   - ❌ Overkill for simulation
   - ❌ More files to maintain

2. **Injectable Services in Infrastructure Layer** ✅ **CHOSEN**
   - `@Injectable() class PaymentsConsumer`
   - Subscribe to topics in `onModuleInit()`
   - ✅ Simple, lightweight
   - ✅ Easy to inject into tests
   - ✅ Configurable behavior (success rate, delay)
   - ✅ Lives in infrastructure layer (correct architectural placement)

3. **Standalone Classes (Not Injectable)**
   - Manually instantiated and registered
   - ❌ Harder to test
   - ❌ Manual lifecycle management

**Implementation Pattern**:
```typescript
@Injectable()
export class PaymentsConsumer implements OnModuleInit {
  constructor(
    private messageBus: IMessageBus,
    @Inject('PAYMENTS_CONFIG') private config: PaymentsConfig,
  ) {}

  onModuleInit() {
    this.messageBus.subscribe('order.placed', this.handleOrderPlaced.bind(this));
  }

  private async handleOrderPlaced(message: IntegrationMessage<OrderPlacedPayload>): Promise<void> {
    const { orderId, totalAmount } = message.payload;

    // Simulate processing delay
    await this.sleep(this.config.processingDelayMs);

    // Generate payment result
    const paymentId = this.generatePaymentId();

    // Publish response
    await this.messageBus.publish('payment.approved', {
      orderId,
      paymentId,
      approvedAmount: totalAmount,
      currency: 'BRL',
      timestamp: new Date().toISOString(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Configurable Behavior**:
- `processingDelayMs`: 0-100ms (default: 10ms)
- `successRate`: 0.0-1.0 (default: 1.0 = always succeeds, for success-path focus)
- Injected via `@Inject('PAYMENTS_CONFIG')` for easy test configuration

### Alternatives Rejected

- **Real external services**: Out of scope, defeats educational purpose
- **HTTP API simulation**: Unnecessary complexity, adds network layer
- **Separate processes**: Requires orchestration, not needed for in-memory demo

---

## 5. Event Handler Registration in NestJS

### Decision

Create **Application-layer handler interfaces** (`IPaymentApprovedHandler`) and **Infrastructure-layer implementations** that inject domain services/repositories. Register handlers as NestJS Providers and subscribe them to message bus topics in `app.module.ts` using factory pattern.

### Rationale

**Problem**: Need to handle external integration events (payment.approved, stock.reserved) while maintaining layered architecture and dependency injection.

**Options Considered**:
1. **Direct Subscription in Controllers**
   - Controllers subscribe to message bus
   - ❌ Controllers are for HTTP, not event handling (SRP violation)
   - ❌ Mixes concerns

2. **Auto-Discovery via Decorators**
   - `@EventHandler('payment.approved')`
   - NestJS scans and registers automatically
   - ✅ Clean, declarative
   - ❌ Requires custom decorator implementation
   - ❌ Adds complexity for simple use case

3. **Explicit Registration in AppModule** ✅ **CHOSEN**
   - Define handler interfaces in Application layer
   - Implement in Infrastructure layer
   - Register in `app.module.ts` providers array
   - Subscribe in `onModuleInit` lifecycle hook
   - ✅ Explicit, easy to trace
   - ✅ Full control over registration
   - ✅ Works with existing NestJS patterns
   - ✅ Easy to test (mock handlers)

**Implementation Pattern**:
```typescript
// Application layer: Handler interface
export interface IPaymentApprovedHandler {
  handle(event: PaymentApprovedPayload): Promise<void>;
}

// Infrastructure layer: Implementation
@Injectable()
export class PaymentApprovedHandler implements IPaymentApprovedHandler {
  constructor(private orderRepository: OrderRepository) {}

  async handle(event: PaymentApprovedPayload): Promise<void> {
    const order = await this.orderRepository.findById(event.orderId);
    if (!order) {
      console.error(`Order ${event.orderId} not found`);
      return;
    }
    order.markAsPaid(event.paymentId);
    await this.orderRepository.save(order);
  }
}

// app.module.ts: Registration
@Module({
  providers: [
    PaymentApprovedHandler,
    {
      provide: 'EVENT_HANDLER_REGISTRATION',
      useFactory: (
        messageBus: IMessageBus,
        paymentHandler: PaymentApprovedHandler,
        stockHandler: StockReservedHandler,
      ) => {
        messageBus.subscribe('payment.approved', (msg) =>
          paymentHandler.handle(msg.payload)
        );
        messageBus.subscribe('stock.reserved', (msg) =>
          stockHandler.handle(msg.payload)
        );
        return {}; // Factory must return something
      },
      inject: [IMessageBus, PaymentApprovedHandler, StockReservedHandler],
    },
  ],
})
export class AppModule {}
```

**Handler Scope**: Singleton (default NestJS scope) - one instance per application, shared across all event invocations.

### Alternatives Rejected

- **Transient handlers**: Unnecessary overhead, handlers are stateless
- **Request-scoped handlers**: No HTTP request context for events
- **Manual instantiation**: Loses DI benefits

---

## Summary

| Decision | Choice | Key Benefit |
|----------|--------|-------------|
| Message Bus | Custom Map-based impl | Simple, testable, topic-based routing |
| Event Mapping | Centralized Publisher | Anti-Corruption Layer, explicit control |
| Idempotency | Aggregate-scoped Sets | DDD-compliant, transaction boundary |
| Consumers | Injectable Services | Lightweight, configurable, testable |
| Handler Registration | Explicit in AppModule | Clear, traceable, NestJS-native |

**All Decisions Satisfy**:
- Domain Layer Purity (Principle I)
- Layered Architecture (Principle II)
- Anti-Corruption Layer (Principle VI)
- Educational/In-Memory Constraints
- Success-Path Focus (no error handling complexity)

**Next**: Proceed to Phase 1 (Data Model & Contracts)
