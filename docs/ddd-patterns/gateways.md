# Gateways (Anti-Corruption Layer)

## Purpose
Gateways protect the Order domain model from changes in external bounded contexts using synchronous communication (Lessons 2-3). They translate external models to domain-specific types.

## Implementation Guidelines

### Gateway Pattern Rules
- Isolate the domain from external context changes
- Return domain-specific types, not external DTOs
- Translate external models to value objects
- One gateway per external bounded context
- Domain layer defines the interface, infrastructure layer implements it

### Why Use Gateways?
Ensure that external API changes don't ripple through the domain layer. The gateway acts as a protective barrier (anti-corruption layer) between our domain and external systems.

## Implemented Gateways

### CatalogGateway (Lesson 2)
Fetch product information from Catalog bounded context.

**Methods**:
- `getProductById(productId: ProductId): Promise<ProductInfo>`
- `validateProductAvailability(productId: ProductId): Promise<boolean>`

**Returns**: Domain-specific types, not external DTOs
**Used by**: `OrderPricingService` during checkout

**Code reference**: (interface in domain layer, implementation in infrastructure)

### PricingGateway (Lesson 2)
Retrieve pricing information from Pricing bounded context.

**Methods**:
- `calculatePrice(productId: ProductId, quantity: Quantity): Promise<Money>`
- `applyPromotions(items: CartItem[]): Promise<Money>`

**Translates**: External pricing models → `Money` value object
**Used by**: `OrderPricingService` for final price calculation

**Code reference**: (interface in domain layer, implementation in infrastructure)

### PaymentGateway (Lesson 3)
Process payment synchronously (replaced by events in Lesson 4).

**Methods**:
- `processPayment(orderId: string, amount: Money): Promise<PaymentResult>`

**Returns**: Payment approval/rejection
**Used by**: `ConfirmPaymentApplicationService` (Lesson 3 only)

**Note**: This gateway is replaced by event-driven flow in Lesson 4. Instead of synchronous calls, the Payment context consumes `OrderPlaced` events and publishes `PaymentApproved` events.

**Code reference**: (interface in domain layer, implementation in infrastructure)

## Synchronous vs Asynchronous Integration

### When to Use Gateways (Synchronous)
Use for external contexts where you need **immediate validation** and **strong consistency**:
- **Catalog**: Need to verify product exists before adding to cart
- **Pricing**: Need current price for order total calculation

### When to Use Events (Asynchronous)
Use for external contexts where you can accept **eventual consistency**:
- **Payment**: Can confirm payment asynchronously
- **Inventory**: Can reserve stock asynchronously

See `/docs/educational-concepts/cap-theorem.md` for trade-offs.

## Related Documentation
- Domain services using gateways: `/docs/ddd-patterns/domain-services.md`
- Event-driven alternative: `/docs/ddd-patterns/event-driven-integration.md`
- CAP theorem trade-offs: `/docs/educational-concepts/cap-theorem.md`
- Bounded context integration: `/docs/educational-concepts/bounded-context-integration.md`
