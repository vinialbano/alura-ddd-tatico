# Lesson 1: Shopping Cart Aggregate

## Implementation Objective
Model Shopping Cart as aggregate root with encapsulated business rules.

## Components to Implement

### ShoppingCart Aggregate (Root)
- Internal entity: `CartItem`
- Methods:
  - `addItem(productId: ProductId, quantity: Quantity)` - Add/update item with validation
  - `updateItemQuantity(productId: ProductId, newQuantity: Quantity)` - Update quantity
  - `removeItem(productId: ProductId)` - Remove item
- Invariants to enforce:
  - Quantity must be > 0
  - No duplicate products (update quantity instead of adding new)
  - Product must exist and be available

### Value Objects
- `ProductId` - Strongly-typed product identifier
- `Quantity` - Quantity with validation (> 0)

### Repository
- `ShoppingCartRepository` - In-memory implementation
- Methods: `save()`, `findById()`, `delete()`

### Application Service
- Orchestrate cart operations
- Coordinate repository and aggregate

## API Endpoints
- `POST /carts` - Create cart
- `POST /carts/:id/items` - Add item
- `PATCH /carts/:id/items/:productId` - Update quantity
- `DELETE /carts/:id/items/:productId` - Remove item
- `GET /carts/:id` - Get cart details

## Code Location
- Domain: Aggregates, value objects
- Application: Application service
- Infrastructure: Repository implementation, NestJS controller
