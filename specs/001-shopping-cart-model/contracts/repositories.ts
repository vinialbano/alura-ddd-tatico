/**
 * Repository Contracts for Shopping Cart Domain
 *
 * Repository interfaces defined in domain layer.
 * Implementations in infrastructure layer.
 * Location: src/domain/repositories/
 */

import { ShoppingCart } from './aggregates';
import { CartId, CustomerId } from './value-objects';

/**
 * ShoppingCartRepository - Persistence contract for ShoppingCart aggregate
 *
 * One repository per aggregate root.
 * Repository operates on complete aggregates, not internal entities.
 */
export interface ShoppingCartRepository {
  /**
   * Persists a shopping cart (create or update)
   */
  save(cart: ShoppingCart): Promise<void>;

  /**
   * Retrieves cart by unique identifier
   * Returns null if not found
   */
  findById(cartId: CartId): Promise<ShoppingCart | null>;

  /**
   * Retrieves all carts for a customer
   * Returns empty array if none found
   */
  findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]>;

  /**
   * Deletes a cart (for cleanup/testing)
   */
  delete(cartId: CartId): Promise<void>;
}
