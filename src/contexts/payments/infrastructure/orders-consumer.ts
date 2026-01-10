import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IntegrationMessage,
  OrderPlacedPayload,
  PaymentApprovedPayload,
} from '../../../shared/events/integration-message';
import type { IMessageBus } from '../../../shared/message-bus/message-bus.interface';
import { MESSAGE_BUS } from '../../../shared/message-bus/message-bus.interface';

/**
 * OrdersConsumer (in Payments BC)
 *
 * Consumes integration events from the Orders bounded context.
 * In a real system, this would be part of a separate Payments microservice.
 *
 * Responsibilities:
 * 1. Subscribe to "order.placed" topic - process payments
 * 2. Simulate payment processing (10ms delay)
 * 3. Publish "payment.approved" message back to message bus
 *
 * This consumer demonstrates eventual consistency and async integration patterns.
 */
@Injectable()
export class OrdersConsumer {
  private readonly logger = new Logger(OrdersConsumer.name);

  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
  ) {}

  /**
   * Can be controlled via ENABLE_AUTOMATIC_PAYMENT environment variable:
   * - 'true' (default): Automatic payment processing (event-driven flow)
   * - 'false': Manual payment via POST /payments (synchronous flow)
   */
  initialize(): void {
    const enableAutomaticPayment =
      process.env.ENABLE_AUTOMATIC_PAYMENT !== 'false';

    if (!enableAutomaticPayment) {
      this.logger.log(
        'OrdersConsumer (Payments BC) - Automatic payment DISABLED. Use POST /payments for manual payment processing.',
      );
      return;
    }

    this.messageBus.subscribe<OrderPlacedPayload>(
      'order.placed',
      this.handleOrderPlaced.bind(this),
    );
    this.logger.log(
      'OrdersConsumer (Payments BC) subscribed to order.placed topic',
    );
  }

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
}
