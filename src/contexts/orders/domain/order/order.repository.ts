import { OrderId } from '../../../../shared/value-objects/order-id';
import { CartId } from '../shopping-cart/cart-id';
import { Order } from './order';

/**
 * OrderRepository Interface
 *
 * Repository contract for Order aggregate persistence.
 * Defined in domain layer to maintain domain independence from infrastructure.
 *
 * Implementations will reside in infrastructure layer.
 */
export interface OrderRepository {
  /**
   * Persist an order (create or update)
   *
   * @param order - Order aggregate to save
   */
  save(order: Order): Promise<void>;

  /**
   * Find an order by its unique identifier
   *
   * @param id - Order identifier
   * @returns Order if found, null otherwise
   */
  findById(id: OrderId): Promise<Order | null>;

  /**
   * Find an order by its source cart identifier
   *
   * Used to implement idempotent checkout (prevent duplicate orders from same cart)
   *
   * @param cartId - Cart identifier
   * @returns Order if found, null otherwise
   */
  findByCartId(cartId: CartId): Promise<Order | null>;
}
