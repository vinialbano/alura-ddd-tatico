import { CustomerId } from '../shared/value-objects/customer-id';
import { CartId } from './cart-id';
import { ShoppingCart } from './shopping-cart';

/**
 * ShoppingCartRepository Interface
 *
 * Defines the persistence contract for ShoppingCart aggregate.
 * Implementation is provided by the infrastructure layer.
 */
export interface ShoppingCartRepository {
  save(cart: ShoppingCart): Promise<void>;

  findById(cartId: CartId): Promise<ShoppingCart | null>;

  findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]>;

  delete(cartId: CartId): Promise<void>;
}
