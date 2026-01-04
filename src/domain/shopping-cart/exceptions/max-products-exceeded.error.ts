/**
 * Domain exception thrown when attempting to add more than 20 unique products to a cart
 */
export class MaxProductsExceededError extends Error {
  constructor() {
    super('Cart cannot contain more than 20 unique products');
    this.name = 'MaxProductsExceededError';
    Object.setPrototypeOf(this, MaxProductsExceededError.prototype);
  }
}
