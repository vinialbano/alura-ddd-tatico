import { ProductId } from '../shared/value-objects/product-id';

/**
 * Domain exception thrown when attempting to modify or remove a product that doesn't exist in the cart
 */
export class ProductNotInCartError extends Error {
  constructor(productId: ProductId) {
    super(`Product ${productId.getValue()} is not in the cart`);
    this.name = 'ProductNotInCartError';
    Object.setPrototypeOf(this, ProductNotInCartError.prototype);
  }
}
