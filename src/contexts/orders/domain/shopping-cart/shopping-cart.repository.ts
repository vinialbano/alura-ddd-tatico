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
  /**
   * Persists a shopping cart
   * @param cart - ShoppingCart aggregate to save
   */
  save(cart: ShoppingCart): Promise<void>;

  /**
   * Finds a cart by its unique identifier
   * @param cartId - Cart identifier
   * @returns ShoppingCart if found, null otherwise
   */
  findById(cartId: CartId): Promise<ShoppingCart | null>;

  /**
   * Finds all carts belonging to a customer
   * @param customerId - Customer identifier
   * @returns Array of ShoppingCart instances
   */
  findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]>;

  /**
   * Deletes a cart from storage
   * @param cartId - Cart identifier
   */
  delete(cartId: CartId): Promise<void>;
}
