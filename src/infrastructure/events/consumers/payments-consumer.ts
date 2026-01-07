import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderPlacedPayload,
  OrderCancelledPayload,
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
 * 1. Subscribe to "order.placed" topic - process payments
 * 2. Subscribe to "order.cancelled" topic - trigger refunds
 * 3. Simulate payment processing (10ms delay)
 * 4. Publish "payment.approved" message back to message bus
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
    this.messageBus.subscribe<OrderCancelledPayload>(
      'order.cancelled',
      this.handleOrderCancelled.bind(this),
    );
    this.logger.log(
      'PaymentsConsumer subscribed to order.placed and order.cancelled topics',
    );
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
    const { payload, messageId } = message;
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

  /**
   * Handle order.cancelled integration message
   * Simulates refund processing for cancelled orders
   *
   * @param message - Integration message with order cancellation details
   */
  private handleOrderCancelled(
    message: IntegrationMessage<OrderCancelledPayload>,
  ): void {
    const { payload, messageId } = message;
    const { orderId, reason, previousStatus } = payload;

    this.logger.log(
      `[PAYMENTS BC] Received order.cancelled message ${messageId} for order ${orderId}`,
    );

    // Determine if refund is needed based on previous state
    if (previousStatus === 'PAID') {
      this.logger.log(
        `[PAYMENTS BC] REFUND triggered for order ${orderId} (was ${previousStatus}, reason: ${reason})`,
      );
      // In a real system, this would call a refund API
      // await this.paymentGateway.refund(orderId, paymentId);
    } else {
      this.logger.log(
        `[PAYMENTS BC] No refund needed for order ${orderId} (was ${previousStatus}, reason: ${reason})`,
      );
      // Order was cancelled before payment - no refund needed
    }
  }
}
