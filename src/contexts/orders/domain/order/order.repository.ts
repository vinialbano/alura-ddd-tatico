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
  save(order: Order): Promise<void>;

  findById(id: OrderId): Promise<Order | null>;

  /**
   * Used to implement idempotent checkout (prevent duplicate orders from same cart)
   */
  findByCartId(cartId: CartId): Promise<Order | null>;
}
