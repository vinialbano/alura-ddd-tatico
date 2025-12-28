# Data Model: Shopping Cart Domain

**Feature**: 001-shopping-cart-model
**Date**: 2025-12-27
**Stage**: Phase 1 - Design & Contracts

## Overview

This document defines the complete data model for the Shopping Cart domain, including all aggregates, entities, value objects, and their relationships. All types are designed following DDD tactical patterns with strict invariant enforcement.

## Domain Model Diagram

```
┌─────────────────────────────────────────────────┐
│         ShoppingCart (Aggregate Root)           │
├─────────────────────────────────────────────────┤
│ - cartId: CartId                                │
│ - customerId: CustomerId                        │
│ - items: Map<ProductId, CartItem>              │
│ - conversionStatus: 'active' | 'converted'     │
├─────────────────────────────────────────────────┤
│ + create(cartId, customerId): ShoppingCart     │
│ + addItem(productId, quantity): void           │
│ + updateItemQuantity(productId, quantity):void │
│ + removeItem(productId): void                  │
│ + markAsConverted(): void                      │
│ + getCartId(): CartId                          │
│ + getCustomerId(): CustomerId                  │
│ + getItems(): CartItem[]                       │
│ + isConverted(): boolean                       │
└────────────────┬────────────────────────────────┘
                 │ owns (1..20)
                 ▼
         ┌───────────────────┐
         │     CartItem      │
         │    (Entity)       │
         ├───────────────────┤
         │ - productId       │
         │ - quantity        │
         └───────────────────┘
```

## Value Objects

### CartId

**Purpose**: Unique identifier for shopping cart instances

**Location**: `src/domain/value-objects/cart-id.ts`

**Fields**:
- `value: string` (readonly, private) - UUID format

**Invariants**:
- Value must be non-empty
- Value must be a valid UUID format

**Methods**:
```typescript
static create(): CartId
  // Generates new UUID and creates CartId

static fromString(value: string): CartId
  // Creates CartId from existing string (for reconstitution)

getValue(): string
  // Returns the underlying UUID value

equals(other: CartId): boolean
  // Value-based equality comparison
```

**Validation**:
- Throws `Error` if value is empty or invalid UUID format

**Usage Example**:
```typescript
const cartId = CartId.create(); // New cart
const existingCartId = CartId.fromString('123e4567-e89b-12d3-a456-426614174000');
```

---

### CustomerId

**Purpose**: Identifies the customer who owns the cart

**Location**: `src/domain/value-objects/customer-id.ts`

**Fields**:
- `value: string` (readonly, private)

**Invariants**:
- Value must be non-empty
- Value must be trimmed (no leading/trailing whitespace)

**Methods**:
```typescript
static fromString(value: string): CustomerId
  // Creates CustomerId from string

getValue(): string
  // Returns the underlying customer identifier

equals(other: CustomerId): boolean
  // Value-based equality comparison
```

**Validation**:
- Throws `Error` if value is empty or whitespace-only

**Usage Example**:
```typescript
const customerId = CustomerId.fromString('customer-12345');
```

---

### ProductId

**Purpose**: References a product from the Catalog bounded context

**Location**: `src/domain/value-objects/product-id.ts`

**Fields**:
- `value: string` (readonly, private)

**Invariants**:
- Value must be non-empty
- Value must be trimmed

**Methods**:
```typescript
static fromString(value: string): ProductId
  // Creates ProductId from string

getValue(): string
  // Returns the underlying product identifier

equals(other: ProductId): boolean
  // Value-based equality comparison
```

**Validation**:
- Throws `Error` if value is empty or whitespace-only

**Note**: Product existence is NOT validated at this layer. Validation deferred to cart-to-order conversion.

**Usage Example**:
```typescript
const productId = ProductId.fromString('product-abc-123');
```

---

### Quantity

**Purpose**: Represents item quantity with domain-specific constraints

**Location**: `src/domain/value-objects/quantity.ts`

**Fields**:
- `value: number` (readonly, private)

**Invariants**:
- Value must be >= 1 (minimum)
- Value must be <= 10 (maximum per clarifications)
- Value must be an integer (no fractional quantities)

**Methods**:
```typescript
static of(value: number): Quantity
  // Creates Quantity with validation

getValue(): number
  // Returns the numeric quantity value

add(other: Quantity): Quantity
  // Returns new Quantity with sum (may throw if > 10)

equals(other: Quantity): boolean
  // Value-based equality comparison
```

**Validation**:
- Throws `InvalidQuantityError` if value < 1, > 10, or not an integer

**Usage Example**:
```typescript
const qty1 = Quantity.of(3);
const qty2 = Quantity.of(5);
const total = qty1.add(qty2); // Throws: exceeds max 10
```

---

## Entities

### CartItem

**Purpose**: Line item within shopping cart, associates product with quantity

**Location**: `src/domain/entities/cart-item.ts`

**Identity**: ProductId (unique within cart)

**Fields**:
- `productId: ProductId` (readonly, private)
- `quantity: Quantity` (private, mutable through methods)

**Invariants**:
- Quantity must always be valid (1-10)
- ProductId cannot change after creation

**Methods**:
```typescript
static create(productId: ProductId, quantity: Quantity): CartItem
  // Factory method for creating cart item

getProductId(): ProductId
  // Returns the product identifier

getQuantity(): Quantity
  // Returns current quantity

updateQuantity(newQuantity: Quantity): void
  // Replaces quantity with new value

addQuantity(additionalQuantity: Quantity): void
  // Adds to existing quantity (may throw if exceeds 10)
```

**Lifecycle**: Managed exclusively by ShoppingCart aggregate

**Usage Example**:
```typescript
const item = CartItem.create(
  ProductId.fromString('product-1'),
  Quantity.of(3)
);
item.updateQuantity(Quantity.of(5));
```

---

## Aggregates

### ShoppingCart

**Purpose**: Aggregate root managing cart lifecycle and enforcing cart-level invariants

**Location**: `src/domain/aggregates/shopping-cart.ts`

**Identity**: CartId

**Fields**:
- `cartId: CartId` (readonly, private)
- `customerId: CustomerId` (readonly, private)
- `items: Map<string, CartItem>` (private) - Key is ProductId.getValue()
- `conversionStatus: 'active' | 'converted'` (private)

**Aggregate Invariants**:
1. Cart must have a CustomerId at creation (no anonymous carts)
2. Cart cannot contain more than 20 unique products
3. Each item quantity must be 1-10
4. Duplicate products are consolidated (single line item per product)
5. Empty carts cannot be converted to orders
6. Converted carts cannot be modified

**Methods**:

#### Creation
```typescript
static create(cartId: CartId, customerId: CustomerId): ShoppingCart
  // Factory method - creates empty active cart
  // Ensures cart always has customer identifier
```

#### Item Management
```typescript
addItem(productId: ProductId, quantity: Quantity): void
  // Adds new item or consolidates quantity if product exists
  // Throws: CartAlreadyConvertedError if cart is converted
  // Throws: MaxProductsExceededError if adding would exceed 20 products
  // Throws: InvalidQuantityError if consolidation exceeds 10

updateItemQuantity(productId: ProductId, newQuantity: Quantity): void
  // Updates quantity for existing item
  // Throws: CartAlreadyConvertedError if cart is converted
  // Throws: ProductNotInCartError if product doesn't exist

removeItem(productId: ProductId): void
  // Removes item from cart
  // Throws: CartAlreadyConvertedError if cart is converted
  // Throws: ProductNotInCartError if product doesn't exist
```

#### Conversion
```typescript
markAsConverted(): void
  // Marks cart as converted, preventing further modifications
  // Throws: EmptyCartError if cart has zero items
```

#### Queries
```typescript
getCartId(): CartId
  // Returns cart identifier

getCustomerId(): CustomerId
  // Returns customer identifier

getItems(): CartItem[]
  // Returns array of cart items (defensive copy)

isConverted(): boolean
  // Returns true if cart has been converted

getItemCount(): number
  // Returns number of unique products in cart
```

**State Transitions**:
```
[CREATED]
   │
   ├─> addItem() ──────────┐
   ├─> updateItemQuantity()├─> [ACTIVE with items]
   ├─> removeItem()────────┘         │
   │                                 │
   └─> markAsConverted() ───────────┴─> [CONVERTED]
                                          (terminal state)
```

**Usage Example**:
```typescript
// Create cart
const cart = ShoppingCart.create(
  CartId.create(),
  CustomerId.fromString('customer-123')
);

// Add items
cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));
cart.addItem(ProductId.fromString('product-2'), Quantity.of(5));

// Consolidation example
cart.addItem(ProductId.fromString('product-1'), Quantity.of(2)); // Now qty=5

// Update quantity
cart.updateItemQuantity(ProductId.fromString('product-2'), Quantity.of(7));

// Remove item
cart.removeItem(ProductId.fromString('product-2'));

// Convert (if not empty)
cart.markAsConverted(); // Cart now immutable
```

---

## Domain Exceptions

**Location**: `src/domain/exceptions/` (or inline with aggregates)

### CartAlreadyConvertedError
- **Thrown by**: addItem(), updateItemQuantity(), removeItem()
- **When**: Attempting to modify a converted cart
- **Message**: "Cart {cartId} has already been converted and cannot be modified"

### MaxProductsExceededError
- **Thrown by**: addItem()
- **When**: Adding product would exceed 20 unique products
- **Message**: "Cart cannot contain more than 20 unique products"

### InvalidQuantityError
- **Thrown by**: Quantity.of(), Quantity.add()
- **When**: Quantity < 1, > 10, or not integer
- **Message**: "Quantity must be an integer between 1 and 10"

### ProductNotInCartError
- **Thrown by**: updateItemQuantity(), removeItem()
- **When**: Operating on non-existent product
- **Message**: "Product {productId} is not in the cart"

### EmptyCartError
- **Thrown by**: markAsConverted()
- **When**: Attempting to convert empty cart
- **Message**: "Cannot convert cart with zero items"

---

## Repository Interface

**Location**: `src/domain/repositories/shopping-cart.repository.interface.ts`

**Purpose**: Defines persistence contract for ShoppingCart aggregate

**Interface**:
```typescript
export interface ShoppingCartRepository {
  save(cart: ShoppingCart): Promise<void>;
  findById(cartId: CartId): Promise<ShoppingCart | null>;
  findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]>;
  delete(cartId: CartId): Promise<void>;
}
```

**Implementation Note**: Infrastructure layer provides `InMemoryShoppingCartRepository` for Stage 1.

---

## Validation Summary

| Layer | What's Validated | Where |
|-------|-----------------|-------|
| **Value Objects** | Format, range, non-empty | Constructor |
| **Entity** | Quantity range (via VO) | CartItem uses Quantity VO |
| **Aggregate** | Business rules, invariants | ShoppingCart methods |
| **Application** | Input format, DTO validation | Application services |
| **Infrastructure** | HTTP constraints, API contracts | Controllers |

---

## Type Relationships

```typescript
// Value Objects (no dependencies)
CartId
CustomerId
ProductId
Quantity

// Entity (depends on VOs)
CartItem
  ├── depends on: ProductId
  └── depends on: Quantity

// Aggregate (depends on Entity + VOs)
ShoppingCart
  ├── depends on: CartId
  ├── depends on: CustomerId
  ├── depends on: CartItem
  └── CartItem depends on: ProductId, Quantity

// Repository (depends on Aggregate)
ShoppingCartRepository
  └── depends on: ShoppingCart, CartId, CustomerId
```

---

## Implementation Notes

1. **Immutability**: All Value Objects are immutable (readonly fields)
2. **Private Constructors**: Use static factories for controlled creation
3. **Defensive Copies**: getItems() returns array copy, not internal Map
4. **Map Internal Storage**: Using Map<string, CartItem> for O(1) lookup by ProductId
5. **No Setters**: Aggregate uses intention-revealing methods, not generic setters
6. **Pure TypeScript**: Domain layer has ZERO dependencies on NestJS or infrastructure

---

## Next Phase

Phase 1 continues with:
- Generate `/contracts/` TypeScript interface files
- Generate `quickstart.md` with setup instructions
- Update agent context with patterns used
