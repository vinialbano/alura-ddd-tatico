import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderPaidPayload,
  StockReservedPayload,
} from '../../../application/events/integration-message';
import { MESSAGE_BUS } from '../../../application/events/message-bus.interface';

/**
 * StockConsumer
 *
 * Infrastructure service simulating the Inventory bounded context.
 * In a real system, this would be a separate microservice.
 *
 * Responsibilities:
 * 1. Subscribe to "order.paid" topic
 * 2. Simulate stock reservation processing (10ms delay)
 * 3. Publish "stock.reserved" message back to message bus
 *
 * This consumer demonstrates eventual consistency and async integration patterns.
 */
@Injectable()
export class StockConsumer {
  private readonly logger = new Logger(StockConsumer.name);

  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
  ) {}

  /**
   * Initialize subscriptions
   * Should be called during application startup (OnModuleInit)
   */
  initialize(): void {
    this.messageBus.subscribe<OrderPaidPayload>(
      'order.paid',
      this.handleOrderPaid.bind(this),
    );
    this.logger.log('StockConsumer subscribed to order.paid topic');
  }

  /**
   * Handle order.paid integration message
   * Simulates stock reservation and publishes stock.reserved
   *
   * @param message - Integration message with order payment details
   */
  private async handleOrderPaid(
    message: IntegrationMessage<OrderPaidPayload>,
  ): Promise<void> {
    const { payload, messageId, correlationId } = message;
    const { orderId, paymentId, amount, currency } = payload;

    this.logger.log(
      `[INVENTORY BC] Received order.paid message ${messageId} for order ${orderId} with payment ${paymentId}`,
    );

    // Simulate stock reservation processing delay (10ms as per spec)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate successful stock reservation
    const reservationId = `reservation-${randomUUID()}`;

    // Note: In a real system, we would load order items from the database or message payload
    // For this simulation, we're creating a minimal payload
    const reservedPayload: StockReservedPayload = {
      orderId,
      reservationId,
      items: [
        // Simplified: actual items would come from order data
        // This is sufficient for state machine demonstration
      ],
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[INVENTORY BC] Stock reserved for order ${orderId} with reservation ${reservationId}`,
    );

    // Publish stock.reserved message
    await this.messageBus.publish('stock.reserved', reservedPayload);

    this.logger.log(
      `[INVENTORY BC] Published stock.reserved message for order ${orderId} with reservation ${reservationId}`,
    );
  }
}
