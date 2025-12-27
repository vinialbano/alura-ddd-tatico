# Strategic DDD Context

## Core Domain: Sales Subdomain

## Bounded Contexts

### Orders (This Project)
**Responsibility**: Shopping cart and order management

**Ubiquitous Language**: Shopping Cart, Cart Item, Order, Order Item, Checkout, Payment, Cancellation

---

### External Contexts (Integrated)

#### Catalog Context
**Responsibility**: Product information and availability

**Integration**: Synchronous via `CatalogGateway`
- `getProductById(productId: ProductId): Promise<ProductInfo>`
- `validateProductAvailability(productId: ProductId): Promise<boolean>`

**Why Synchronous**: Need immediate validation - can't add non-existent product to cart

**Status**: Stubbed in this project

---

#### Pricing Context
**Responsibility**: Price calculations and promotions

**Integration**: Synchronous via `PricingGateway`
- `calculatePrice(productId: ProductId, quantity: Quantity): Promise<Money>`
- `applyPromotions(items: CartItem[]): Promise<Money>`

**Why Synchronous**: Need current price for order total calculation

**Status**: Stubbed in this project

---

#### Payments Context
**Responsibility**: Payment processing and authorization

**Integration (Lesson 3)**: Synchronous via `PaymentGateway`
- `processPayment(orderId: string, amount: Money): Promise<PaymentResult>`

**Integration (Lesson 4)**: Asynchronous via events
- **Consumes**: `OrderPlaced` → `order.placed`
- **Publishes**: `PaymentApproved` → `payment.approved`

**Why Asynchronous (Lesson 4)**: Can accept eventual consistency, improves availability

**Status**: Simulated in this project for Lesson 4

---

#### Inventory Context
**Responsibility**: Stock management and reservation

**Integration**: Asynchronous via events (Lesson 4)
- **Consumes**: `OrderPaid` → `order.paid`
- **Publishes**: `StockReserved` → `stock.reserved`

**Why Asynchronous**: Can accept eventual consistency, decoupling needed

**Status**: Simulated in this project for Lesson 4

---

## Integration Patterns Summary

| Context | Pattern | Reason | Consistency |
|---------|---------|--------|-------------|
| Catalog | Sync Gateway | Immediate validation needed | Strong |
| Pricing | Sync Gateway | Current price needed | Strong |
| Payments (L3) | Sync Gateway | Immediate feedback (temp) | Strong |
| Payments (L4) | Async Events | Improved availability | Eventual |
| Inventory | Async Events | Decoupling needed | Eventual |

---

## Context Mapping

### Upstream/Downstream
- **Upstream** (Suppliers): Catalog, Pricing
- **Downstream** (Consumer): Orders (this project)
- **Pattern**: Customer/Supplier with Anti-Corruption Layer (Gateways)

### Partnership
- **Partners**: Orders ↔ Payments, Orders ↔ Inventory
- **Pattern**: Partnership with Event-Driven Integration (Lesson 4)

---

## Implementation Details

### Synchronous Integration (Gateways)
- Domain layer defines gateway interfaces
- Infrastructure layer implements gateways
- Gateways return domain-specific types (Value Objects), not external DTOs
- Isolates domain from external API changes

### Asynchronous Integration (Events)
- Domain events published to message bus
- Event consumers subscribe to topics
- Each context processes events independently
- In-memory bus implementation (educational)
