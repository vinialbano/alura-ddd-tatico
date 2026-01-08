import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IMessageBus } from '../../../../shared/message-bus/message-bus.interface';
import { MESSAGE_BUS } from '../../../../shared/message-bus/message-bus.interface';
import { DomainEvent } from '../../domain/shared/domain-event';
import { OrderPlaced } from '../../domain/order/events/order-placed.event';
import { OrderPaid } from '../../domain/order/events/order-paid.event';
import { OrderCancelled } from '../../domain/order/events/order-cancelled.event';
import {
  OrderPlacedPayload,
  OrderPaidPayload,
  OrderCancelledPayload,
} from '../../../../shared/events/integration-message';

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
    } else if (event instanceof OrderPaid) {
      await this.publishOrderPaid(event);
    } else if (event instanceof OrderCancelled) {
      await this.publishOrderCancelled(event);
    }
    // Unknown event types are silently ignored
  }

  private async publishOrderPlaced(event: OrderPlaced): Promise<void> {
    const payload: OrderPlacedPayload = {
      orderId: event.orderId.getValue(),
      customerId: event.customerId.getValue(),
      cartId: event.cartId.getValue(),
      items: event.items.map((item) => ({
        productId: item.productSnapshot.sku, // Using SKU as product identifier
        productName: item.productSnapshot.name,
        quantity: item.quantity.getValue(),
        unitPrice: item.unitPrice.amount, // unitPrice is on OrderItem, not ProductSnapshot
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

  private async publishOrderPaid(event: OrderPaid): Promise<void> {
    const payload: OrderPaidPayload = {
      orderId: event.aggregateId,
      paymentId: event.paymentId,
      amount: 0, // Will be populated when we have access to order amount
      currency: 'BRL',
      timestamp: event.occurredAt.toISOString(),
    };

    this.logger.log(
      `Publishing order.paid for order ${payload.orderId} with payment ${payload.paymentId}`,
    );
    await this.messageBus.publish('order.paid', payload);
  }

  private async publishOrderCancelled(event: OrderCancelled): Promise<void> {
    const payload: OrderCancelledPayload = {
      orderId: event.aggregateId,
      reason: event.cancellationReason,
      previousStatus: event.previousState,
      timestamp: event.occurredAt.toISOString(),
    };

    this.logger.log(
      `Publishing order.cancelled for order ${payload.orderId} (was ${payload.previousStatus}, reason: ${payload.reason})`,
    );
    await this.messageBus.publish('order.cancelled', payload);
  }
}
