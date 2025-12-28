/**
 * Domain Exception Contracts for Shopping Cart Domain
 *
 * Exceptions represent business rule violations.
 * Location: src/domain/exceptions/ (or inline with aggregates)
 */

import { CartId, ProductId } from './value-objects';

/**
 * Base domain exception
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when attempting to modify a converted cart
 */
export class CartAlreadyConvertedError extends DomainException {
  constructor(cartId: CartId) {
    super(
      `Cart ${cartId.getValue()} has already been converted and cannot be modified`
    );
  }
}

/**
 * Thrown when adding product would exceed 20 product limit
 */
export class MaxProductsExceededError extends DomainException {
  constructor() {
    super('Cart cannot contain more than 20 unique products');
  }
}

/**
 * Thrown when quantity is invalid (< 1, > 10, or not integer)
 */
export class InvalidQuantityError extends DomainException {
  constructor(value: number) {
    super(`Quantity must be an integer between 1 and 10, got: ${value}`);
  }
}

/**
 * Thrown when operating on product not in cart
 */
export class ProductNotInCartError extends DomainException {
  constructor(productId: ProductId) {
    super(`Product ${productId.getValue()} is not in the cart`);
  }
}

/**
 * Thrown when attempting to convert empty cart
 */
export class EmptyCartError extends DomainException {
  constructor() {
    super('Cannot convert cart with zero items');
  }
}

/**
 * Thrown when value object receives invalid input
 */
export class InvalidValueError extends DomainException {
  constructor(valueName: string, reason: string) {
    super(`Invalid ${valueName}: ${reason}`);
  }
}
