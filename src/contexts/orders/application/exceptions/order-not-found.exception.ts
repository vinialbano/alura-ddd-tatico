import { OrderId } from '../../../../shared/value-objects/order-id';

export class OrderNotFoundException extends Error {
  constructor(orderId: OrderId) {
    super(`Order with ID ${orderId.getValue()} not found`);
    this.name = 'OrderNotFoundException';
  }
}
