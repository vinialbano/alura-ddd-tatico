import { CartId } from '../value-objects/cart-id';

/**
 * Domain exception thrown when attempting to modify a cart that has already been converted to an order
 */
export class CartAlreadyConvertedError extends Error {
  constructor(cartId: CartId) {
    super(
      `Cart ${cartId.getValue()} has already been converted and cannot be modified`,
    );
    this.name = 'CartAlreadyConvertedError';
    Object.setPrototypeOf(this, CartAlreadyConvertedError.prototype);
  }
}
