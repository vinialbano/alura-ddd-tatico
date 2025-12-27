# Value Objects

## Implementation Guidelines

### Value Object Rules
- Make them immutable
- Implement equality by value, not reference
- Use for concepts that are defined by their attributes

## Implemented Value Objects

### ProductId (Lesson 1)
Strong typing for product identifiers, avoiding primitive strings.

**Purpose**: Type safety and domain expressiveness
**Code reference**: (to be implemented in domain layer)

### Quantity (Lesson 1)
Encapsulates quantity with validation (must be > 0).

**Purpose**: Enforce business rules at the type level
**Code reference**: (to be implemented in domain layer)

### Money (Lesson 2)
Encapsulates amount and currency.

**Features**:
- Arithmetic operations (add, subtract, multiply)
- Currency validation
- Formatting for display

**Purpose**: Avoid primitive obsession, ensure currency consistency
**Code reference**: (to be implemented in domain layer)

### ShippingAddress (Lesson 2)
Immutable address representation with validation.

**Purpose**: Encapsulate address validation rules
**Code reference**: (to be implemented in domain layer)

### ProductSnapshot (Lesson 2)
Point-in-time product information captured at order creation.

**Contains**:
- Product name, price, description at the moment of purchase

**Purpose**:
- Prevents issues if product data changes after order placement
- Avoids primitive obsession
- Protects against external context changes

**Code reference**: (to be implemented in domain layer)

## Related Documentation
- Lesson 1 (ProductId, Quantity): `/docs/lessons/lesson-1-shopping-cart.md`
- Lesson 2 (Money, ShippingAddress, ProductSnapshot): `/docs/lessons/lesson-2-checkout-flow.md`
