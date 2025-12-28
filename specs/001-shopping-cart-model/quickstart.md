# Quick Start: Shopping Cart Domain Model

**Feature**: 001-shopping-cart-model
**Stage**: 1 - Aggregates & Value Objects
**Date**: 2025-12-27

## Overview

This guide helps you implement the Shopping Cart domain model following tactical DDD patterns. This is Stage 1 of a 4-stage learning path, focusing on **Aggregates** and **Value Objects**.

## Prerequisites

- Node.js 18+ installed
- Basic TypeScript knowledge
- Understanding of DDD concepts (aggregates, value objects, entities)
- Familiarity with NestJS (recommended but not required for domain layer)

## Project Setup

The project is already initialized with NestJS. Verify your environment:

```bash
# Install dependencies
npm install

# Verify tests run
npm test

# Verify build works
npm run build

# Verify linting
npm run lint
```

## Implementation Sequence (TDD)

Follow this sequence strictly to maintain dependency order and practice TDD:

### Phase 1: Value Objects (Pure TypeScript, No Dependencies)

**Order**: CartId → CustomerId → ProductId → Quantity

#### 1. CartId

**Test File**: `test/unit/value-objects/cart-id.spec.ts`

```typescript
describe('CartId', () => {
  describe('create', () => {
    it('should generate a unique UUID', () => {
      const id1 = CartId.create();
      const id2 = CartId.create();
      expect(id1.getValue()).not.toBe(id2.getValue());
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('fromString', () => {
    it('should create CartId from valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const cartId = CartId.fromString(uuid);
      expect(cartId.getValue()).toBe(uuid);
    });

    it('should throw error for empty string', () => {
      expect(() => CartId.fromString('')).toThrow();
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => CartId.fromString('invalid-uuid')).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for same UUID values', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const id1 = CartId.fromString(uuid);
      const id2 = CartId.fromString(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different UUID values', () => {
      const id1 = CartId.create();
      const id2 = CartId.create();
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
```

**Implementation File**: `src/domain/value-objects/cart-id.ts`

**Key Points**:
- Use `crypto.randomUUID()` for UUID generation
- Validate UUID format in `fromString()`
- Private constructor + static factories pattern
- Immutable (`readonly` fields)

#### 2-3. CustomerId & ProductId

Similar structure to CartId but without UUID generation (accept any non-empty string).

**Test**: Non-empty validation, equality
**Implementation**: Trim whitespace, validate non-empty

#### 4. Quantity

**Test File**: `test/unit/value-objects/quantity.spec.ts`

Focus on:
- Valid range (1-10)
- Integer validation
- Add operation with overflow detection
- Boundary testing (0, 1, 10, 11)

**Implementation Challenges**:
- `add()` must return new Quantity (immutable)
- `add()` may throw if result > 10

### Phase 2: Entity (Depends on Value Objects)

#### CartItem

**Test File**: `test/unit/cart-item.spec.ts`

**Test Coverage**:
- Creation with valid values
- Update quantity
- Add quantity (test both success and overflow)
- ProductId immutability

**Implementation File**: `src/domain/entities/cart-item.ts`

**Key Points**:
- ProductId is readonly (identity)
- Quantity is mutable through methods only
- No public setters

### Phase 3: Aggregate Root (Depends on Entity + VOs)

#### ShoppingCart

**Test File**: `test/unit/shopping-cart.spec.ts`

**Critical Test Scenarios**:

```typescript
describe('ShoppingCart', () => {
  describe('create', () => {
    it('should create empty active cart with CustomerId', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.isConverted()).toBe(false);
    });
  });

  describe('addItem', () => {
    it('should add new item to empty cart', () => {
      // Test new item addition
    });

    it('should consolidate quantity for duplicate product', () => {
      // Test quantity consolidation
    });

    it('should throw when adding 21st unique product', () => {
      // Test max products invariant
    });

    it('should throw when consolidation exceeds max quantity', () => {
      // Test quantity overflow during consolidation
    });

    it('should throw when cart is converted', () => {
      // Test immutability after conversion
    });
  });

  describe('updateItemQuantity', () => {
    it('should update existing item quantity', () => {});
    it('should throw for non-existent product', () => {});
    it('should throw when cart is converted', () => {});
  });

  describe('removeItem', () => {
    it('should remove existing item', () => {});
    it('should throw for non-existent product', () => {});
    it('should throw when cart is converted', () => {});
  });

  describe('markAsConverted', () => {
    it('should mark cart as converted', () => {
      // Test conversion success
    });

    it('should throw when cart is empty', () => {
      // Test empty cart conversion rejection
    });

    it('should prevent all modifications after conversion', () => {
      // Test immutability
    });
  });
});
```

**Implementation File**: `src/domain/aggregates/shopping-cart.ts`

**Key Implementation Details**:
- Use `Map<string, CartItem>` for O(1) product lookup
- Key = `productId.getValue()`
- Check `conversionStatus` at start of every command method
- Check product count before adding new products
- Defensive copy for `getItems()` (return array from Map.values())

### Phase 4: Repository Interface

**File**: `src/domain/repositories/shopping-cart.repository.interface.ts`

No tests needed (just an interface). Define the contract per `contracts/repositories.ts`.

### Phase 5: Application Layer

#### DTOs

**Files**: `src/application/dtos/*.dto.ts`

Simple classes/interfaces with validation decorators (if using class-validator).

#### Application Service

**Test File**: `test/integration/cart.service.spec.ts`

**Integration Test Example**:
```typescript
describe('CartService', () => {
  let service: CartService;
  let repository: ShoppingCartRepository;

  beforeEach(() => {
    repository = new InMemoryShoppingCartRepository();
    service = new CartService(repository);
  });

  it('should create cart and add item', async () => {
    const createDto: CreateCartDto = { customerId: 'customer-1' };
    const cartResponse = await service.createCart(createDto);

    const addItemDto: AddItemDto = { productId: 'product-1', quantity: 3 };
    const updated = await service.addItem(cartResponse.cartId, addItemDto);

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].quantity).toBe(3);
  });
});
```

**Implementation File**: `src/application/services/cart.service.ts`

**Key Points**:
- Orchestration only (no business logic)
- Convert DTOs → Domain objects
- Call aggregate methods
- Save via repository
- Convert Domain → DTOs for response

### Phase 6: Infrastructure Layer

#### In-Memory Repository

**File**: `src/infrastructure/repositories/in-memory-shopping-cart.repository.ts`

**Implementation**:
- Use `Map<string, ShoppingCart>` for storage
- Implement all interface methods
- Remember: Store aggregate by CartId value

#### Controller

**File**: `src/infrastructure/controllers/cart.controller.ts`

**E2E Test**: `test/e2e/cart.e2e-spec.ts`

**Key Endpoints**:
```typescript
POST   /carts                   # Create cart
POST   /carts/:id/items         # Add item
PUT    /carts/:id/items/:productId  # Update quantity
DELETE /carts/:id/items/:productId  # Remove item
POST   /carts/:id/convert       # Mark as converted
GET    /carts/:id               # Get cart
```

#### Module

**File**: `src/infrastructure/modules/cart.module.ts`

Wire up: Controller → Service → Repository

## Development Workflow

### Before Writing Code

1. Read relevant docs:
   - `/docs/lessons/lesson-1.md` - Stage 1 overview
   - `/docs/ddd-patterns/aggregates.md` - Aggregate guidance
   - `/docs/ddd-patterns/value-objects.md` - VO guidance

2. Review constitution:
   - `/.specify/memory/constitution.md` - Core principles

3. Review this plan:
   - `specs/001-shopping-cart-model/plan.md` - Technical context
   - `specs/001-shopping-cart-model/data-model.md` - Detailed design
   - `specs/001-shopping-cart-model/research.md` - Pattern decisions

### TDD Cycle

```bash
# 1. Write failing test
npm test -- cart-id.spec.ts

# 2. Implement minimum code to pass
# Edit src/domain/value-objects/cart-id.ts

# 3. Verify test passes
npm test -- cart-id.spec.ts

# 4. Refactor if needed
# Run tests again to ensure green

# 5. Commit (Conventional Commits)
git add test/unit/value-objects/cart-id.spec.ts
git commit -m "test: add CartId value object tests"

git add src/domain/value-objects/cart-id.ts
git commit -m "feat: implement CartId value object"
```

### Quality Gates

Run before each commit:

```bash
# Linting
npm run lint

# Formatting
npm run format

# All tests
npm test

# Build
npm run build
```

## Common Pitfalls

### 1. Leaking Infrastructure into Domain

❌ **Wrong**:
```typescript
// domain/aggregates/shopping-cart.ts
import { Injectable } from '@nestjs/common'; // NO!

@Injectable() // NO!
export class ShoppingCart {
  // ...
}
```

✅ **Correct**:
```typescript
// domain/aggregates/shopping-cart.ts
// Pure TypeScript, no imports from NestJS
export class ShoppingCart {
  // ...
}
```

### 2. Anemic Domain Model

❌ **Wrong**:
```typescript
export class ShoppingCart {
  setItems(items: CartItem[]) { this.items = items; }
  setConversionStatus(status: string) { this.conversionStatus = status; }
}
```

✅ **Correct**:
```typescript
export class ShoppingCart {
  addItem(productId: ProductId, quantity: Quantity) {
    this.ensureNotConverted();
    // Business logic here
  }

  markAsConverted() {
    if (this.items.size === 0) {
      throw new EmptyCartError();
    }
    this.conversionStatus = 'converted';
  }
}
```

### 3. Mutable Value Objects

❌ **Wrong**:
```typescript
export class Quantity {
  private value: number; // Not readonly!

  setValue(newValue: number) { this.value = newValue; } // NO!
}
```

✅ **Correct**:
```typescript
export class Quantity {
  private readonly value: number;

  add(other: Quantity): Quantity {
    return Quantity.of(this.value + other.value); // New instance
  }
}
```

### 4. Public Constructors

❌ **Wrong**:
```typescript
export class CartId {
  public constructor(value: string) { // Public!
    this.value = value;
  }
}
```

✅ **Correct**:
```typescript
export class CartId {
  private constructor(value: string) {
    // Validation
    this.value = value;
  }

  static fromString(value: string): CartId {
    return new CartId(value);
  }
}
```

## Debugging Tips

### Test Failures

```bash
# Run specific test file
npm test -- cart-item.spec.ts

# Run specific test case
npm test -- -t "should consolidate quantity"

# Watch mode
npm test -- --watch
```

### Type Errors

```bash
# Check TypeScript compilation
npm run build

# Use VS Code TypeScript checking
# Bottom right: TypeScript version display
```

## Next Steps

After completing Stage 1 implementation:

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement following TDD sequence (this guide)
3. Move to Stage 2: Domain Services & Gateways

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- Project Documentation: `/docs/`

## Support

Questions or issues? Check:
- Constitution: `/.specify/memory/constitution.md`
- CLAUDE.md: `/CLAUDE.md`
- DDD Patterns: `/docs/ddd-patterns/`
- Lesson docs: `/docs/lessons/lesson-1.md`
