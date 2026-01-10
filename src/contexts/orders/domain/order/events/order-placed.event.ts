import { Money } from '../../../../../shared/value-objects/money';
import { OrderId } from '../../../../../shared/value-objects/order-id';
import { DomainEvent } from '../../shared/domain-event';
import { CustomerId } from '../../shared/value-objects/customer-id';
import { EventId } from '../../shared/value-objects/event-id';
import { CartId } from '../../shopping-cart/cart-id';
import { OrderItem } from '../order-item';
import { ShippingAddress } from '../value-objects/shipping-address';

/**
 * Domain Event: OrderPlaced
 * Emitted when an order is successfully created after checkout
 */
export class OrderPlaced implements DomainEvent {
  public readonly aggregateId: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly eventId: EventId,
    public readonly orderId: OrderId,
    public readonly customerId: CustomerId,
    public readonly cartId: CartId,
    public readonly items: readonly OrderItem[],
    public readonly totalAmount: Money,
    public readonly shippingAddress: ShippingAddress,
    public readonly timestamp: Date,
  ) {
    this.aggregateId = orderId.getValue();
    this.occurredAt = timestamp;
  }
}
