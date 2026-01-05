import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderPlacedPayload,
  PaymentApprovedPayload,
} from '../../../application/events/integration-message';
import { MESSAGE_BUS } from '../../../application/events/message-bus.interface';

/**
 * PaymentsConsumer
 *
 * Infrastructure service simulating the Payments bounded context.
 * In a real system, this would be a separate microservice.
 *
 * Responsibilities:
 * 1. Subscribe to "order.placed" topic
 * 2. Simulate payment processing (10ms delay)
 * 3. Publish "payment.approved" message back to message bus
 *
 * This consumer demonstrates eventual consistency and async integration patterns.
 */
@Injectable()
export class PaymentsConsumer {
  private readonly logger = new Logger(PaymentsConsumer.name);

  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
  ) {}

  /**
   * Initialize subscriptions
   * Should be called during application startup (OnModuleInit)
   */
  initialize(): void {
    this.messageBus.subscribe<OrderPlacedPayload>(
      'order.placed',
      this.handleOrderPlaced.bind(this),
    );
    this.logger.log('PaymentsConsumer subscribed to order.placed topic');
  }

  /**
   * Handle order.placed integration message
   * Simulates payment processing and publishes payment.approved
   *
   * @param message - Integration message with order details
   */
  private async handleOrderPlaced(
    message: IntegrationMessage<OrderPlacedPayload>,
  ): Promise<void> {
    const { payload, messageId, correlationId } = message;
    const { orderId, totalAmount, currency } = payload;

    this.logger.log(
      `[PAYMENTS BC] Received order.placed message ${messageId} for order ${orderId}`,
    );

    // Simulate payment processing delay (10ms as per spec)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate successful payment approval
    const paymentId = `payment-${randomUUID()}`;
    const approvedPayload: PaymentApprovedPayload = {
      orderId,
      paymentId,
      approvedAmount: totalAmount,
      currency,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[PAYMENTS BC] Payment ${paymentId} approved for order ${orderId} (amount: ${totalAmount} ${currency})`,
    );

    // Publish payment.approved message
    await this.messageBus.publish('payment.approved', approvedPayload);

    this.logger.log(
      `[PAYMENTS BC] Published payment.approved message for order ${orderId} with payment ${paymentId}`,
    );
  }
}
