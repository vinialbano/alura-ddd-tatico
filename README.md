# DDD Tactical Patterns - E-commerce Order Management

Educational NestJS application demonstrating **Tactical DDD patterns** through a complete order management flow.

## Course Structure

This codebase supports a 4-hour DDD course with four lessons:

### Lesson 1: Creating a Cart (Shopping Cart Aggregate)
- **Concepts**: Aggregates, Value Objects, Entities
- **Live code**: Value object examples (Money, Quantity), Cart methods
- **Pre-implemented**: Repository interfaces, controllers, NestJS setup

### Lesson 2: Converting Cart to Order (Domain Services)
- **Concepts**: Domain Services, orchestration within bounded context
- **Live code**: OrderCreationService, checkout flow
- **Pre-implemented**: Order aggregate, value objects

### Lesson 3: Synchronous Payment (Gateway Pattern)
- **Concepts**: Cross-context integration, Gateway pattern, Anti-Corruption Layer
- **Live code**: PaymentGateway interface, markAsPaid(), state transitions
- **Pre-implemented**: Gateway stubs, OrderStatus states

### Lesson 4: Asynchronous Payment (Event-Driven Architecture)
- **Concepts**: Domain events, event dispatcher, message bus, eventual consistency
- **Live code**: Domain events, event handlers, message bus interface
- **Pre-implemented**: Message bus implementation, payment simulator

## Tech Stack

- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3 (target ES2023)
- **Testing**: Jest
- **Storage**: In-memory (educational - no database)
- **Architecture**: Layered DDD (Domain → Application → Infrastructure)

## Project Structure

```
src/
├── domain/              # Domain layer (business logic)
│   ├── shopping-cart/   # Shopping Cart aggregate
│   ├── order/          # Order aggregate + domain services
│   └── shared/         # Shared kernel (value objects, base classes)
├── application/        # Application layer (use cases)
│   ├── services/       # Application services
│   ├── dtos/          # Data transfer objects
│   ├── gateways/      # Gateway interfaces
│   └── events/        # Event handlers
└── infrastructure/     # Infrastructure layer (NestJS)
    ├── controllers/    # REST controllers
    ├── repositories/   # In-memory repositories
    ├── gateways/      # Gateway implementations (stubs)
    ├── events/        # Message bus implementation
    └── modules/       # NestJS modules
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Start development server
npm run start:dev

# Lint code
npm run lint

# Format code
npm run format
```

## API Endpoints

### Cart Operations
- `POST /cart` - Create cart
- `POST /cart/:cartId/items` - Add item to cart
- `PATCH /cart/:cartId/items/:productId` - Update quantity
- `POST /cart/:cartId/checkout` - Checkout (convert to order)

### Order Operations
- `GET /orders/:orderId` - Get order details
- `POST /orders/:orderId/pay` - Mark order as paid (sync)
- `POST /orders/:orderId/cancel` - Cancel order

## Key DDD Concepts Demonstrated

### Aggregates
- **ShoppingCart**: Manages cart lifecycle, enforces cart invariants
- **Order**: Manages order state machine, enforces order invariants

### Value Objects
- **Money**: Encapsulates currency and amount
- **Quantity**: Validates product quantities
- **ProductId, CartId, OrderId**: Typed identifiers

### Domain Services
- **OrderCreationService**: Orchestrates order creation from cart
- **OrderPricingService**: Calculates order pricing

### Domain Events
- **OrderPlaced**: Published when order created
- **OrderPaid**: Published when payment confirmed
- **OrderCancelled**: Published when order cancelled

### Gateways (Anti-Corruption Layer)
- **CatalogGateway**: Fetches product information
- **PricingGateway**: Calculates pricing
- **PaymentGateway**: Processes payments

### Repository Pattern
- **ShoppingCartRepository**: Persists shopping carts
- **OrderRepository**: Persists orders

## Student Exercises

### Homework: Stock Reservation Flow

Implement the stock reservation feature by completing TODOs in:

1. **Domain Layer** (`src/domain/order/order.ts`):
   - Implement `applyStockReserved()` method
   - Handle state transition: Paid → StockReserved

2. **Application Layer**:
   - Create `StockReservedHandler`
   - Subscribe to `stock.reserved` events

3. **Infrastructure Layer**:
   - Register event handler in module
   - Update message bus subscriptions

See TODO comments in code for guidance.

## Testing Approach

```bash
# Run all tests
npm test

# Run specific test suite
npm test src/domain/shopping-cart/__tests__/shopping-cart.spec.ts

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Domain tests**: Business rule validation (aggregates, value objects, domain services)
- **E2E tests**: Complete flows (cart → checkout → payment)

## Design Decisions

### Why In-Memory Storage?
Focus on DDD patterns, not infrastructure complexity. Production apps would use PostgreSQL, MongoDB, etc.

### Why Stubbed External Services?
Demonstrates Gateway pattern and ACL without external dependencies. Production would integrate real services.

### Why Simple Error Handling?
Educational clarity over production robustness. Production would have comprehensive error handling.

## Learning Resources

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **NestJS Documentation**: https://docs.nestjs.com

## License

MIT - Educational purposes
