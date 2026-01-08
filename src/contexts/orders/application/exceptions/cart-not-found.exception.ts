import { CartId } from '../../domain/shopping-cart/value-objects/cart-id';

/**
 * Application exception thrown when a cart cannot be found in the repository
 * This represents an application-level resource not found error, not a domain invariant violation
 */
export class CartNotFoundException extends Error {
  constructor(cartId: CartId) {
    super(`Cart ${cartId.getValue()} not found`);
    this.name = 'CartNotFoundException';
    Object.setPrototypeOf(this, CartNotFoundException.prototype);
  }
}
