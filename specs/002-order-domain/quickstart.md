# Quickstart: Order Domain Implementation

**Feature**: Order Domain and Checkout Flow
**Branch**: `002-order-domain`
**Date**: 2025-12-28
**For**: Developers implementing the Order domain

## Overview

This quickstart guide provides the essential steps to implement the Order domain aggregate with checkout flow, state machine, and external context integration using Tactical DDD patterns.

**Target**: Stage 2 - Domain Services & Gateways
**Prerequisites**: Stage 1 completed (Shopping Cart aggregate exists)
**Estimated Scope**: ~35-40 implementation tasks (see tasks.md for full breakdown)

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                     │
│  (NestJS Controllers, Repositories, Gateways, Modules)      │
│                                                               │
│  OrderController ──► CheckoutService ──► OrderPricingService │
│                           │                      │            │
│                           │                      ▼            │
│                           │          CatalogGateway (stub)   │
│                           │          PricingGateway (stub)   │
│                           ▼                                   │
│                    Order Repository                           │
└─────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Application Layer                        │
│         (Use Cases, DTOs, Gateway Interfaces)                │
│                                                               │
│  CheckoutService, OrderService, DTOs                         │
│  CatalogGateway interface, PricingGateway interface          │
└─────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                       Domain Layer                            │
│      (Pure TypeScript - No Infrastructure Dependencies)      │
│                                                               │
│  Order Aggregate ──owns──► OrderItem Entity                  │
│       │                                                       │
│       ├─ Value Objects: Money, ShippingAddress,              │
│       │                 ProductSnapshot, OrderId, OrderStatus│
│       │                                                       │
│       └─ OrderPricingService (Domain Service)                │
│                                                               │
│  State Machine: AwaitingPayment ─► Paid ─► Cancelled        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Sequence

Follow this order to ensure dependencies are met and TDD workflow is maintained:

### Phase 1: Value Objects (Foundation)
Build immutable, self-validating domain primitives

1. **Money** → Amount + ISO 4217 currency, operations (add, subtract, multiply)
2. **OrderId** → UUID wrapper for order identification
3. **OrderStatus** → State enumeration (AwaitingPayment, Paid, Cancelled)
4. **ProductSnapshot** → Captured product data (name, description, SKU)
5. **ShippingAddress** → Delivery location (5 required fields)

**Why first**: Value Objects are leaf dependencies with no other domain dependencies

### Phase 2: Entities
Build behavioral components that use Value Objects

6. **OrderItem** → Line item with product snapshot, quantity, pricing
   - Depends on: ProductSnapshot, Quantity, Money

**Why second**: OrderItem is owned by Order aggregate, must exist first

### Phase 3: Order Aggregate
Build aggregate root with state machine

7. **Order** → Aggregate root with state machine and invariants
   - Depends on: OrderId, CustomerId, CartId, OrderItem[], ShippingAddress, Money, OrderStatus
   - Methods: `create()`, `markAsPaid()`, `cancel()`, state validators

**Why third**: Aggregates compose entities and value objects

### Phase 4: Domain Exceptions
Define functional error types

8. **InvalidOrderStateTransitionError** → State machine violations
9. **ProductDataUnavailableError** → Catalog failures
10. **ProductPricingFailedError** → Pricing failures

**Why fourth**: Exceptions used by aggregates and domain services

### Phase 5: Gateway Interfaces (Application Layer)
Define Anti-Corruption Layer contracts

11. **CatalogGateway interface** → Product data contract
12. **PricingGateway interface** → Pricing calculation contract

**Why fifth**: Domain service depends on these interfaces

### Phase 6: Domain Service
Orchestrate pricing logic

13. **OrderPricingService** → Coordinates catalog and pricing gateways
    - Depends on: CatalogGateway, PricingGateway interfaces
    - Returns: Fully priced OrderItem data for Order creation

**Why sixth**: Domain service orchestrates complex business logic across contexts

### Phase 7: Repository Interface
Define persistence contract

14. **OrderRepository interface** → Persistence abstraction in domain layer

**Why seventh**: Application services depend on repository interface

### Phase 8: Application Services
Orchestrate use cases

15. **CheckoutService** → Checkout use case (cart → order)
16. **OrderService** → Order operations (mark paid, cancel)

**Why eighth**: Application services orchestrate domain objects and repositories

### Phase 9: DTOs
Define HTTP request/response shapes

17. **CheckoutRequest DTO** → Cart ID + shipping address
18. **OrderResponse DTO** → Complete order representation
19. **MarkPaidRequest DTO** → Payment ID
20. **CancelOrderRequest DTO** → Cancellation reason

**Why ninth**: DTOs used by controllers

### Phase 10: Infrastructure - Gateways
Implement gateway interfaces with stubs

21. **StubCatalogGateway** → Hardcoded product data
22. **StubPricingGateway** → Hardcoded pricing rules

**Why tenth**: Infrastructure implements application layer interfaces

### Phase 11: Infrastructure - Repository
Implement persistence

23. **InMemoryOrderRepository** → In-memory order storage

**Why eleventh**: Infrastructure implements domain layer interface

### Phase 12: Infrastructure - Controller
Expose HTTP API

24. **OrderController** → REST endpoints (checkout, mark paid, cancel, get)

**Why twelfth**: Controller depends on all application services and DTOs

### Phase 13: Infrastructure - Module
Wire dependencies

25. **OrderModule** → NestJS module with DI configuration

**Why last**: Module wires all components together

## Key Implementation Patterns

### 1. TDD Workflow (Mandatory)

**Red-Green-Refactor Cycle**:
```
Write Test (FAILS) → Implement Code (PASSES) → Refactor (GREEN)
```

**Example for Money Value Object**:
```typescript
// Step 1: Write failing test
describe('Money', () => {
  it('should create money with amount and currency', () => {
    const money = new Money(99.99, 'USD');
    expect(money.amount).toBe(99.99);
    expect(money.currency).toBe('USD');
  });

  it('should reject negative amounts', () => {
    expect(() => new Money(-10.00, 'USD')).toThrow('Amount cannot be negative');
  });
});

// Step 2: Implement to make test pass
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }
}

// Step 3: Refactor if needed (extract validation, add methods, etc.)
```

**Commit After Each Test+Implementation**:
```bash
git add .
git commit -m "test: add Money value object validation tests"
git add .
git commit -m "feat: implement Money value object with currency support"
```

### 2. Value Object Pattern

**Characteristics**:
- Immutable (readonly fields, no setters)
- Value equality (equals method compares all fields)
- Self-validating (validation in constructor)
- Rich behavior (domain methods, not just data)

**Template**:
```typescript
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.amount < 0) {
      throw new InvalidMoneyError('Amount cannot be negative');
    }
    if (!this.isValidCurrency(this.currency)) {
      throw new InvalidCurrencyError(`Invalid currency code: ${this.currency}`);
    }
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  // More methods...
}
```

### 3. Aggregate Pattern

**Characteristics**:
- Aggregate root enforces invariants
- Owns child entities (OrderItem)
- No public setters, only intention-revealing methods
- State changes through domain methods

**Template**:
```typescript
export class Order {
  private constructor(
    private readonly _id: OrderId,
    private readonly _cartId: CartId,
    private readonly _customerId: CustomerId,
    private readonly _items: OrderItem[],
    private readonly _shippingAddress: ShippingAddress,
    private _status: OrderStatus,
    private readonly _orderLevelDiscount: Money,
    private readonly _totalAmount: Money,
    private _paymentId: string | null,
    private _cancellationReason: string | null,
    private readonly _createdAt: Date
  ) {
    this.validate();
  }

  static create(/* params */): Order {
    // Factory method for creation
    return new Order(/* ... */);
  }

  markAsPaid(paymentId: string): void {
    if (!this.canBePaid()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot mark order as paid: order is in ${this._status} state`
      );
    }
    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;
  }

  private canBePaid(): boolean {
    return this._status === OrderStatus.AwaitingPayment;
  }

  // Getters only, no setters
  get id(): OrderId { return this._id; }
  get status(): OrderStatus { return this._status; }
}
```

### 4. Domain Service Pattern

**When to Use**: Complex logic that doesn't naturally fit in an aggregate, or coordination across multiple aggregates/contexts.

**Template**:
```typescript
export class OrderPricingService {
  constructor(
    private readonly catalogGateway: CatalogGateway,
    private readonly pricingGateway: PricingGateway
  ) {}

  async price(cartItems: CartItem[]): Promise<PricedOrderData> {
    // Step 1: Get product snapshots
    const productDataMap = await this.catalogGateway.getProductDataBatch(
      cartItems.map(item => item.productId)
    );

    // Step 2: Calculate pricing
    const pricingResult = await this.pricingGateway.calculatePricing(
      cartItems.map(item => ({ productId: item.productId, quantity: item.quantity }))
    );

    // Step 3: Combine into domain objects
    const orderItems = cartItems.map(/* ... */);

    return {
      items: orderItems,
      orderLevelDiscount: pricingResult.orderLevelDiscount,
      orderTotal: pricingResult.orderTotal
    };
  }
}
```

### 5. Gateway Pattern (Anti-Corruption Layer)

**Purpose**: Isolate domain from external system data structures.

**Interface in Application Layer**:
```typescript
// src/application/gateways/catalog.gateway.interface.ts
export interface CatalogGateway {
  getProductData(productId: ProductId): Promise<ProductData>;
}

export interface ProductData {
  name: string;
  description: string;
  sku: string;
}
```

**Stub Implementation in Infrastructure**:
```typescript
// src/infrastructure/gateways/stub-catalog.gateway.ts
export class StubCatalogGateway implements CatalogGateway {
  private readonly products = new Map<string, ProductData>([
    ['COFFEE-COL-001', { name: 'Coffee Beans', description: '...', sku: 'COFFEE-COL-001' }]
  ]);

  async getProductData(productId: ProductId): Promise<ProductData> {
    const product = this.products.get(productId.value);
    if (!product) {
      throw new ProductDataUnavailableError(`Product not found: ${productId.value}`);
    }
    return product;
  }
}
```

### 6. Application Service Pattern

**Purpose**: Orchestrate use cases, coordinate domain objects, handle transactions.

**Template**:
```typescript
export class CheckoutService {
  constructor(
    private readonly cartRepository: ShoppingCartRepository,
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingService
  ) {}

  async checkout(cartId: CartId, shippingAddress: ShippingAddress): Promise<Order> {
    // 1. Load cart
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    // 2. Check if already converted
    if (cart.isConverted) {
      return await this.orderRepository.findByCartId(cartId);
    }

    // 3. Price cart items (domain service)
    const pricedData = await this.pricingService.price(cart.items);

    // 4. Create order (aggregate)
    const order = Order.create({
      cartId: cart.id,
      customerId: cart.customerId,
      items: pricedData.items,
      shippingAddress,
      orderLevelDiscount: pricedData.orderLevelDiscount,
      totalAmount: pricedData.orderTotal
    });

    // 5. Persist order and update cart
    await this.orderRepository.save(order);
    cart.markAsConverted(order.id);
    await this.cartRepository.save(cart);

    return order;
  }
}
```

## Testing Strategy

### Unit Tests
**Target**: Domain layer (aggregates, entities, value objects, domain services)

**Location**: `src/domain/**/__tests__/*.spec.ts`

**Characteristics**:
- No external dependencies
- Pure logic testing
- Fast execution (<1ms per test)

**Example**:
```typescript
describe('Order.markAsPaid', () => {
  it('should transition from AwaitingPayment to Paid', () => {
    const order = createTestOrder({ status: OrderStatus.AwaitingPayment });
    order.markAsPaid('pay_123');
    expect(order.status).toBe(OrderStatus.Paid);
    expect(order.paymentId).toBe('pay_123');
  });

  it('should reject payment when already paid', () => {
    const order = createTestOrder({ status: OrderStatus.Paid });
    expect(() => order.markAsPaid('pay_456')).toThrow(
      InvalidOrderStateTransitionError
    );
  });
});
```

### Integration Tests
**Target**: Application layer (application services with mocked gateways)

**Location**: `src/application/services/__tests__/*.spec.ts`

**Characteristics**:
- Mock external dependencies (gateways, repositories)
- Test use case orchestration
- Verify interaction between layers

**Example**:
```typescript
describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockCartRepo: jest.Mocked<ShoppingCartRepository>;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockPricingService: jest.Mocked<OrderPricingService>;

  beforeEach(() => {
    mockCartRepo = { findById: jest.fn(), save: jest.fn() };
    mockOrderRepo = { save: jest.fn(), findByCartId: jest.fn() };
    mockPricingService = { price: jest.fn() };
    service = new CheckoutService(mockCartRepo, mockOrderRepo, mockPricingService);
  });

  it('should create order and mark cart as converted', async () => {
    // Arrange
    const cart = createTestCart();
    mockCartRepo.findById.mockResolvedValue(cart);
    mockPricingService.price.mockResolvedValue(mockPricedData);

    // Act
    const order = await service.checkout(cart.id, testAddress);

    // Assert
    expect(order.status).toBe(OrderStatus.AwaitingPayment);
    expect(mockOrderRepo.save).toHaveBeenCalledWith(order);
    expect(cart.isConverted).toBe(true);
  });
});
```

### E2E Tests
**Target**: Full HTTP request/response cycle

**Location**: `test/order.e2e-spec.ts`

**Characteristics**:
- Real HTTP requests via SuperTest
- Real NestJS application context
- Stub gateways (no external services)
- Test complete user flows

**Example**:
```typescript
describe('POST /orders/checkout (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should create order successfully', async () => {
    // Arrange
    const cart = await createTestCart();

    // Act
    const response = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send({
        cartId: cart.id.value,
        shippingAddress: {
          street: '123 Main St',
          city: 'Springfield',
          stateOrProvince: 'IL',
          postalCode: '62701',
          country: 'USA'
        }
      })
      .expect(201);

    // Assert
    expect(response.body.status).toBe('AWAITING_PAYMENT');
    expect(response.body.totalAmount.amount).toBeGreaterThan(0);
  });
});
```

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Anemic Domain Model
```typescript
// BAD: Getters/setters only, no behavior
class Order {
  private status: string;

  setStatus(status: string) {
    this.status = status;
  }
}
```

### ✅ Solution: Rich Domain Model
```typescript
// GOOD: Intention-revealing methods, enforces invariants
class Order {
  private _status: OrderStatus;

  markAsPaid(paymentId: string): void {
    if (!this.canBePaid()) {
      throw new InvalidOrderStateTransitionError(/* ... */);
    }
    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;
  }
}
```

---

### ❌ Pitfall 2: Primitive Obsession
```typescript
// BAD: Primitives everywhere
class OrderItem {
  unitPriceAmount: number;
  unitPriceCurrency: string;
}
```

### ✅ Solution: Value Objects
```typescript
// GOOD: Domain concepts as value objects
class OrderItem {
  unitPrice: Money;
}
```

---

### ❌ Pitfall 3: Infrastructure in Domain
```typescript
// BAD: Domain depends on NestJS
import { Injectable } from '@nestjs/common';

@Injectable()
export class Order {
  // Domain aggregate should not have framework decorators
}
```

### ✅ Solution: Pure Domain
```typescript
// GOOD: Pure TypeScript in domain layer
export class Order {
  // No framework dependencies
}

// NestJS decorators only in Infrastructure layer
@Injectable()
export class OrderService {
  // Application/Infrastructure service can have decorators
}
```

---

### ❌ Pitfall 4: Business Logic in Application Service
```typescript
// BAD: Business logic leaking into application layer
class CheckoutService {
  async checkout(cartId, address): Promise<Order> {
    const cart = await this.cartRepo.findById(cartId);

    // Business logic here is WRONG
    if (cart.items.length > 10) {
      throw new Error('Too many items');
    }

    return order;
  }
}
```

### ✅ Solution: Business Logic in Domain
```typescript
// GOOD: Business logic in aggregate
class ShoppingCart {
  addItem(item: CartItem): void {
    if (this._items.length >= MAX_ITEMS) {
      throw new MaxProductsExceededError();
    }
    this._items.push(item);
  }
}

// Application service just orchestrates
class CheckoutService {
  async checkout(cartId, address): Promise<Order> {
    const cart = await this.cartRepo.findById(cartId);
    // No business logic, just orchestration
    return order;
  }
}
```

## Useful Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- order.spec.ts

# Run tests in watch mode (TDD)
npm run test:watch

# Run E2E tests
npm run test:e2e

# Check linting
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format

# Build project
npm run build

# Run development server
npm run start:dev
```

## Next Steps

1. **Read the full implementation plan**: [plan.md](./plan.md)
2. **Review the data model**: [data-model.md](./data-model.md)
3. **Study the API contract**: [contracts/openapi.yaml](./contracts/openapi.yaml)
4. **Review gateway contracts**: [contracts/gateway-contracts.md](./contracts/gateway-contracts.md)
5. **Execute tasks**: Wait for tasks.md generation via `/speckit.tasks` command

## References

- **Feature Specification**: [spec.md](./spec.md)
- **Research Document**: [research.md](./research.md)
- **DDD Pattern Docs**: `/docs/ddd-patterns/`
- **Lesson Guide**: `/docs/lessons/lesson-2.md` (Domain Services & Gateways)
- **Project Constitution**: `/.specify/memory/constitution.md`

---

**Remember**: Follow TDD strictly, keep domain pure, use value objects, and commit atomically with Conventional Commits format.
