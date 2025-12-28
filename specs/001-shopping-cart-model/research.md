# Research: Shopping Cart Domain Model

**Feature**: 001-shopping-cart-model
**Date**: 2025-12-27
**Stage**: Phase 0 - Research & Pattern Analysis

## Overview

This document captures research findings and design decisions for implementing the Shopping Cart domain model using tactical DDD patterns. The focus is on Stage 1 patterns: Aggregates and Value Objects.

## DDD Pattern Research

### 1. Aggregate Pattern

**Decision**: ShoppingCart as Aggregate Root

**Rationale**:
- The cart is a natural transaction boundary - all cart item operations must maintain cart-level invariants
- Cart owns its items (CartItem entities) - items cannot exist independently
- Enforces business rules: max 20 products, quantity limits, conversion status
- Single point of entry for all cart modifications ensures consistency

**Key References**:
- `/docs/ddd-patterns/aggregates.md` - Project-specific aggregate guidelines
- Aggregate boundaries align with transactional consistency requirements
- Keep aggregates small: ShoppingCart + CartItem is minimal viable boundary

**Alternatives Considered**:
- **CartItem as separate aggregate**: Rejected - would allow inconsistent cart state (e.g., exceeding 20 product limit across separate transactions)
- **Order + Cart as single aggregate**: Rejected - different transaction boundaries; cart conversion creates order but doesn't extend cart's boundary

**Implementation Approach**:
```typescript
// Aggregate root pattern
export class ShoppingCart {
  private readonly items: Map<string, CartItem>;
  private conversionStatus: 'active' | 'converted';

  // Private constructor + static factory ensures valid creation
  private constructor(
    private readonly cartId: CartId,
    private readonly customerId: CustomerId
  ) {
    this.items = new Map();
    this.conversionStatus = 'active';
  }

  // Static factory method
  static create(cartId: CartId, customerId: CustomerId): ShoppingCart {
    return new ShoppingCart(cartId, customerId);
  }

  // Intention-revealing methods (not setters)
  addItem(productId: ProductId, quantity: Quantity): void {
    this.ensureNotConverted();
    this.ensureWithinProductLimit(productId);
    // Consolidation logic...
  }

  markAsConverted(): void {
    if (this.items.size === 0) {
      throw new Error('Cannot convert empty cart');
    }
    this.conversionStatus = 'converted';
  }
}
```

### 2. Value Objects

**Decision**: Use explicit Value Objects for all domain identifiers and quantities

**Value Objects**:
1. **CartId** - Unique cart identifier
2. **CustomerId** - Customer identifier
3. **ProductId** - Product reference
4. **Quantity** - Item quantity with validation (1-10)

**Rationale**:
- Avoid primitive obsession - make domain concepts explicit
- Encapsulate validation logic in one place
- Immutability ensures value objects cannot be corrupted
- Equality by value enables proper comparisons

**Key References**:
- `/docs/ddd-patterns/value-objects.md` - Project-specific VO guidelines
- Value Objects must be immutable
- Value Objects must validate invariants in constructor
- Implement `equals()` method for value equality

**Implementation Pattern**:
```typescript
export class Quantity {
  private readonly value: number;

  private constructor(value: number) {
    if (value < 1 || value > 10) {
      throw new Error('Quantity must be between 1 and 10');
    }
    this.value = value;
  }

  static of(value: number): Quantity {
    return new Quantity(value);
  }

  getValue(): number {
    return this.value;
  }

  add(other: Quantity): Quantity {
    const newValue = this.value + other.value;
    return Quantity.of(newValue); // May throw if exceeds 10
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }
}
```

### 3. Entity Pattern

**Decision**: CartItem as Entity within ShoppingCart aggregate

**Rationale**:
- CartItem has identity based on ProductId
- CartItem lifecycle is bound to ShoppingCart
- CartItem is mutable (quantity can change) but controlled by aggregate root
- CartItem cannot be accessed directly outside aggregate

**Key Characteristics**:
- Identity: ProductId uniquely identifies cart item within cart
- Lifecycle: Created/destroyed by ShoppingCart aggregate only
- Encapsulation: CartItem validates its own invariants (quantity > 0)

**Implementation**:
```typescript
export class CartItem {
  private constructor(
    private readonly productId: ProductId,
    private quantity: Quantity
  ) {}

  static create(productId: ProductId, quantity: Quantity): CartItem {
    return new CartItem(productId, quantity);
  }

  getProductId(): ProductId {
    return this.productId;
  }

  getQuantity(): Quantity {
    return this.quantity;
  }

  updateQuantity(newQuantity: Quantity): void {
    this.quantity = newQuantity;
  }

  addQuantity(additionalQuantity: Quantity): void {
    this.quantity = this.quantity.add(additionalQuantity);
  }
}
```

### 4. Repository Pattern

**Decision**: Repository interface in domain, implementation in infrastructure

**Rationale**:
- Domain defines what it needs (interface), not how it's stored (implementation)
- Enables testing with mock repositories
- Infrastructure layer provides in-memory implementation for Stage 1
- Future stages can swap implementation without domain changes

**Key References**:
- `/docs/ddd-patterns/repositories.md` - Project repository patterns
- One repository per aggregate root (ShoppingCart only)
- Repository operates on aggregate roots, not internal entities

**Interface Design**:
```typescript
// Domain layer: src/domain/repositories/shopping-cart.repository.interface.ts
export interface ShoppingCartRepository {
  save(cart: ShoppingCart): Promise<void>;
  findById(cartId: CartId): Promise<ShoppingCart | null>;
  findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]>;
}

// Infrastructure layer: src/infrastructure/repositories/in-memory-shopping-cart.repository.ts
export class InMemoryShoppingCartRepository implements ShoppingCartRepository {
  private carts: Map<string, ShoppingCart> = new Map();

  async save(cart: ShoppingCart): Promise<void> {
    this.carts.set(cart.getCartId().getValue(), cart);
  }

  // ... other methods
}
```

## TypeScript Best Practices for DDD

### Immutability

**Decision**: Use `readonly` for all Value Object fields

**Rationale**:
- TypeScript `readonly` enforces immutability at compile time
- Prevents accidental mutations
- Clear intent: this value cannot change after construction

**Pattern**:
```typescript
export class ProductId {
  private readonly value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductId cannot be empty');
    }
    this.value = value;
  }
}
```

### Private Constructors + Static Factories

**Decision**: Use private constructors with static factory methods

**Rationale**:
- Forces users to go through named factory methods
- Allows validation before construction
- Enables more descriptive creation APIs (e.g., `Quantity.of(5)` vs `new Quantity(5)`)

**Pattern**:
```typescript
export class CartId {
  private constructor(private readonly value: string) {
    // Validation
  }

  static create(): CartId {
    return new CartId(crypto.randomUUID());
  }

  static fromString(value: string): CartId {
    return new CartId(value);
  }
}
```

### Domain Exceptions

**Decision**: Use descriptive Error types for domain violations

**Pattern**:
```typescript
export class CartAlreadyConvertedError extends Error {
  constructor(cartId: CartId) {
    super(`Cart ${cartId.getValue()} has already been converted and cannot be modified`);
    this.name = 'CartAlreadyConvertedError';
  }
}

export class MaxProductsExceededError extends Error {
  constructor() {
    super('Cart cannot contain more than 20 unique products');
    this.name = 'MaxProductsExceededError';
  }
}
```

**Rationale**:
- Type-safe error handling
- Clear communication of business rule violations
- Enables specific error handling in application layer

## Testing Strategy

### Unit Tests (Domain Layer)

**Scope**: Test aggregates, entities, and value objects in isolation

**Approach**:
```typescript
describe('ShoppingCart', () => {
  describe('addItem', () => {
    it('should add new item to empty cart', () => {
      // Arrange
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-123')
      );
      const productId = ProductId.fromString('product-1');
      const quantity = Quantity.of(3);

      // Act
      cart.addItem(productId, quantity);

      // Assert
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].getProductId()).toEqual(productId);
    });

    it('should consolidate quantity when adding duplicate product', () => {
      // Test quantity consolidation
    });

    it('should throw when adding to converted cart', () => {
      // Test invariant enforcement
    });
  });
});
```

**Coverage**:
- All aggregate methods
- All invariant enforcement
- Value Object validation
- Entity behavior

### Integration Tests (Application Layer)

**Scope**: Test use case orchestration with real repositories

**Approach**:
- Use in-memory repository implementation
- Test application service coordination
- Verify DTO transformations

### E2E Tests

**Scope**: Test complete API flows

**Approach**:
- Use NestJS testing utilities
- Test HTTP endpoints
- Verify request/response formats

## Implementation Sequence

Based on TDD principles and dependency order:

1. **Value Objects** (no dependencies)
   - CartId, CustomerId, ProductId, Quantity
   - Write tests → Implement → Refactor

2. **Entity** (depends on VOs)
   - CartItem
   - Write tests → Implement → Refactor

3. **Aggregate** (depends on Entity + VOs)
   - ShoppingCart
   - Write tests → Implement → Refactor

4. **Repository Interface** (depends on Aggregate)
   - ShoppingCartRepository interface
   - No tests needed (interface only)

5. **DTOs** (Application layer)
   - AddItemDto, UpdateQuantityDto, CartResponseDto
   - Light validation tests

6. **Application Service** (depends on all domain)
   - CartService
   - Write integration tests → Implement

7. **Infrastructure** (depends on everything)
   - InMemoryShoppingCartRepository
   - CartController
   - CartModule
   - Write implementation + e2e tests

## Decisions Log

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| ShoppingCart as single aggregate | Clear transaction boundary, maintains invariants | Split into multiple aggregates (would break consistency) |
| Max 20 products / 10 quantity | User-specified aggressive limits for learning | No limits (would miss validation patterns), Higher limits (less constrained testing) |
| In-memory repository | Educational focus, fast iteration | Real database (unnecessary complexity for Stage 1) |
| No domain events (Stage 1) | Stage 1 focuses on aggregates only | Include events (breaks learning progression) |
| Private constructors + factories | Forces validation, explicit intent | Public constructors (allows invalid creation) |
| Last-write-wins concurrency | Simplicity, domain model focus | Optimistic locking (deferred to infrastructure if needed) |

## Next Steps (Phase 1)

1. Generate `data-model.md` with detailed entity/VO definitions
2. Create `/contracts/` with TypeScript interfaces for repositories and services
3. Generate `quickstart.md` with developer setup instructions
4. Update agent context with Stage 1 patterns

## References

- [Project DDD Patterns](/docs/ddd-patterns/)
- [Lesson 1: Aggregates & Value Objects](/docs/lessons/lesson-1.md)
- [Project Constitution](/.specify/memory/constitution.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [NestJS Documentation](https://docs.nestjs.com/)
