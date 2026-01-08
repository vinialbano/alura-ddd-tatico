import { OrderId } from '../../../../shared/value-objects/order-id';

/**
 * OrderNotFoundException
 *
 * Application exception thrown when an order cannot be found in the repository
 */
export class OrderNotFoundException extends Error {
  constructor(orderId: OrderId) {
    super(`Order with ID ${orderId.getValue()} not found`);
    this.name = 'OrderNotFoundException';
  }
}
