import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrderPlaced } from '../../contexts/orders/domain/order/events/order-placed.event';
import { DomainEvent } from '../../contexts/orders/domain/shared/domain-event';
import type { IMessageBus } from '../message-bus/message-bus.interface';
import { MESSAGE_BUS } from '../message-bus/message-bus.interface';
import { OrderPlacedPayload } from './integration-message';

/**
 * Domain Event Publisher
 * Maps domain events to integration messages and publishes to message bus
 * Acts as Anti-Corruption Layer between domain and external contexts
 */
@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);

  constructor(@Inject(MESSAGE_BUS) private readonly messageBus: IMessageBus) {}

  /**
   * Publish domain events as integration messages
   * @param events Array of domain events to publish
   */
  async publishDomainEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publishSingleEvent(event);
    }
  }

  private async publishSingleEvent(event: DomainEvent): Promise<void> {
    if (event instanceof OrderPlaced) {
      await this.publishOrderPlaced(event);
    }
    // Unknown event types are silently ignored
  }

  private async publishOrderPlaced(event: OrderPlaced): Promise<void> {
    const payload: OrderPlacedPayload = {
      orderId: event.orderId.getValue(),
      customerId: event.customerId.getValue(),
      cartId: event.cartId.getValue(),
      items: event.items.map((item) => ({
        productId: item.productId.getValue(),
        quantity: item.quantity.getValue(),
        unitPrice: item.unitPrice.amount,
      })),
      totalAmount: event.totalAmount.amount,
      currency: event.totalAmount.currency,
      shippingAddress: {
        street: event.shippingAddress.street,
        city: event.shippingAddress.city,
        state: event.shippingAddress.stateOrProvince,
        zipCode: event.shippingAddress.postalCode,
        country: event.shippingAddress.country,
      },
      timestamp: event.timestamp.toISOString(),
    };

    this.logger.log(
      `Publishing order.placed for order ${payload.orderId} (${payload.items.length} items, ${payload.totalAmount} ${payload.currency})`,
    );
    await this.messageBus.publish('order.placed', payload);
  }
}
