/**
 * Value Object Contracts for Shopping Cart Domain
 *
 * All Value Objects are immutable and implement value-based equality.
 * Location: src/domain/value-objects/
 */

/**
 * CartId - Unique identifier for shopping cart instances
 */
export interface CartId {
  getValue(): string;
  equals(other: CartId): boolean;
}

export interface CartIdStatic {
  create(): CartId;
  fromString(value: string): CartId;
}

/**
 * CustomerId - Identifies the customer who owns the cart
 */
export interface CustomerId {
  getValue(): string;
  equals(other: CustomerId): boolean;
}

export interface CustomerIdStatic {
  fromString(value: string): CustomerId;
}

/**
 * ProductId - References a product from the Catalog bounded context
 */
export interface ProductId {
  getValue(): string;
  equals(other: ProductId): boolean;
}

export interface ProductIdStatic {
  fromString(value: string): ProductId;
}

/**
 * Quantity - Represents item quantity with domain constraints (1-10)
 */
export interface Quantity {
  getValue(): number;
  add(other: Quantity): Quantity;
  equals(other: Quantity): boolean;
}

export interface QuantityStatic {
  of(value: number): Quantity;
}
