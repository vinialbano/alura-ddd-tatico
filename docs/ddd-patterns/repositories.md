# Repositories

## Purpose
Repositories provide an abstraction for persisting and retrieving aggregates, hiding infrastructure details from the domain layer.

## Implementation Guidelines

### Repository Pattern Rules
- Interface-based persistence abstractions
- Separate domain interface from infrastructure implementation
- Repository methods work with complete aggregates
- One repository per aggregate root
- Domain layer defines the interface, infrastructure layer implements it

## Implemented Repositories

### ShoppingCartRepository
**Aggregate**: `ShoppingCart`
**Implementation**: In-memory (educational purposes)

**Methods** (typical):
- `save(cart: ShoppingCart): Promise<void>`
- `findById(id: string): Promise<ShoppingCart | null>`
- `delete(id: string): Promise<void>`

**Code reference**: (to be implemented with interface in domain, implementation in infrastructure)

### OrderRepository
**Aggregate**: `Order`
**Implementation**: In-memory (educational purposes)

**Methods** (typical):
- `save(order: Order): Promise<void>`
- `findById(id: string): Promise<Order | null>`
- `findAll(): Promise<Order[]>`

**Code reference**: (to be implemented with interface in domain, implementation in infrastructure)

## Educational Note
This project uses in-memory implementations to focus on domain modeling rather than infrastructure concerns. In a production system, these would be replaced with persistent storage (database, event store, etc.).

## Related Documentation
- Aggregates: `/docs/ddd-patterns/aggregates.md`
- Educational constraints: See main CLAUDE.md "Educational Implementation Notes"
