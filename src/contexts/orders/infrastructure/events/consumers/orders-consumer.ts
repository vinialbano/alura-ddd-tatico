import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IMessageBus } from '../../../../../shared/message-bus/message-bus.interface';
import { MESSAGE_BUS } from '../../../../../shared/message-bus/message-bus.interface';
import { PaymentApprovedPayload } from '../../../../../shared/events/integration-message';
import { PaymentApprovedHandler } from '../../../application/events/handlers/payment-approved.handler';

/**
 * OrdersConsumer
 *
 * Subscribes to integration events from other bounded contexts
 * that the Orders context needs to react to.
 *
 * Currently handles:
 * - payment.approved: Payment BC notifies that payment was approved
 */
@Injectable()
export class OrdersConsumer {
  private readonly logger = new Logger(OrdersConsumer.name);

  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
    private readonly paymentApprovedHandler: PaymentApprovedHandler,
  ) {}

  /**
   * Initialize subscriptions to integration events
   */
  initialize(): void {
    this.subscribeToPaymentApproved();
  }

  /**
   * Subscribe to payment.approved events from Payment BC
   */
  private subscribeToPaymentApproved(): void {
    this.messageBus.subscribe<PaymentApprovedPayload>(
      'payment.approved',
      async (message) => {
        const { messageId, payload } = message;
        const { orderId, paymentId } = payload;

        this.logger.debug(
          `[Infrastructure] Routing payment.approved message ${messageId} to application handler (order: ${orderId}, payment: ${paymentId})`,
        );

        try {
          await this.paymentApprovedHandler.handle(payload);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `[Infrastructure] Failed to handle payment.approved message ${messageId}: ${errorMessage}`,
            errorStack,
          );
          // In production, this might publish to a dead-letter queue
          throw error;
        }
      },
    );

    this.logger.log(
      'Subscribed to payment.approved events from Payment context',
    );
  }
}
