# Architecture Evolution

The project evolves through four progressive stages, each introducing new patterns and architectural concerns.

## Stage 1: Aggregates & Value Objects

### Architecture
```
[Controller] → [Application Service] → [ShoppingCart Aggregate] → [Repository]
```

### Components
- `ShoppingCart` aggregate root with `CartItem` entity
- Value objects: `ProductId`, `Quantity`
- In-memory repository
- Application service for orchestration

### Pattern Focus
Encapsulation and invariant protection within aggregate boundaries.

---

## Stage 2: Domain Services & Synchronous Gateways

### Architecture
```
[Controller] → [Application Service] → [Domain Service] → [Gateways]
                        ↓                      ↓
                 [Order Aggregate]      [External Contexts]
                        ↓
                   [Repository]
```

### Components
- `Order` aggregate with checkout flow
- `OrderPricingService` domain service
- Rich value objects: `Money`, `ShippingAddress`, `ProductSnapshot`
- Synchronous gateways: `CatalogGateway`, `PricingGateway`
- `PlaceOrderFromCartApplicationService`

### Pattern Focus
Anti-corruption layer and synchronous integration with external contexts.

---

## Stage 3: State Management

### Architecture
```
[Controller] → [Application Service] → [PaymentGateway]
                        ↓
                 [Order Aggregate]
                 (State Machine)
                        ↓
                   [Repository]
```

### Components
- Explicit state machine in Order aggregate
- States: `AwaitingPayment`, `Paid`, `Cancelled`
- State transition methods: `markAsPaid()`, `cancel()`
- `PaymentGateway` for synchronous payment
- Payment and cancellation application services

### Pattern Focus
Aggregate lifecycle and controlled state transitions.

---

## Stage 4: Event-Driven Architecture

### Architecture
```
[Controller] → [Application Service] → [Order Aggregate]
                                             ↓
                                      [Event Dispatcher]
                                             ↓
                                       [Message Bus]
                                       ↙         ↘
                            [Payment Context] [Inventory Context]
                            (consumes events) (consumes events)
                                       ↘         ↙
                                    (publishes events)
                                             ↓
                                    [Event Consumers]
                                             ↓
                                  [Application Services]
                                             ↓
                                      [Order Aggregate]
```

### Components
- Domain events: `OrderPlaced`, `OrderPaid`, `OrderCancelled`
- Message bus for publish/subscribe
- Event dispatcher mechanism
- Asynchronous integration with Payment and Inventory contexts
- Event consumers handling external events
- New state: `StockReserved`

### Pattern Focus
Eventual consistency and event-driven communication between bounded contexts.

---

## Layered Architecture (All Stages)

### Domain Layer
- Aggregates, Entities, Value Objects
- Domain Services
- Domain Events
- Repository interfaces
- **Dependencies**: None (pure domain logic)

### Application Layer
- Application Services (use case orchestration)
- DTOs (data transfer objects)
- Gateway interfaces
- **Dependencies**: Domain layer only

### Infrastructure Layer
- NestJS modules and controllers
- Repository implementations (in-memory)
- Gateway implementations
- Event bus implementation
- Event consumers/handlers
- **Dependencies**: Domain and Application layers

---

## Technical Evolution Summary

| Stage | Aggregates | Services | Integration | Consistency |
|-------|-----------|----------|-------------|-------------|
| 1 | ShoppingCart | Application | None | N/A |
| 2 | + Order | + Domain, Gateways | Sync (Catalog, Pricing) | Strong |
| 3 | + State Machine | + Payment Gateway | Sync (Payment) | Strong |
| 4 | + Events | + Event Bus | Async (Payment, Inventory) | Eventual |

---

## Implementation Notes

- **In-memory storage**: Repositories and message bus use in-memory implementations
- **Simplified contexts**: External bounded contexts (Catalog, Pricing, Payment, Inventory) are stubbed
- **Progressive complexity**: Each stage builds on previous without breaking existing functionality
