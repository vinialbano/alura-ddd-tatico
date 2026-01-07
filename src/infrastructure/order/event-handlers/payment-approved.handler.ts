import { Injectable, Logger } from '@nestjs/common';
import { PaymentApprovedHandler } from '../../../application/events/handlers/payment-approved.handler';
import {
  IntegrationMessage,
  PaymentApprovedPayload,
} from '../../../application/events/integration-message';

/**
 * PaymentApprovedInfrastructureHandler
 *
 * Infrastructure adapter that bridges the message bus subscription
 * with the application service handler.
 *
 * This thin adapter layer:
 * 1. Receives messages from message bus subscriptions
 * 2. Delegates to application service (PaymentApprovedHandler)
 * 3. Handles infrastructure concerns (logging, error handling)
 *
 * This separation allows the application layer to remain infrastructure-agnostic.
 */
@Injectable()
export class PaymentApprovedInfrastructureHandler {
  private readonly logger = new Logger(
    PaymentApprovedInfrastructureHandler.name,
  );

  constructor(
    private readonly paymentApprovedHandler: PaymentApprovedHandler,
  ) {}

  /**
   * Handle payment.approved message from message bus
   * Delegates to application service handler
   *
   * @param message - Integration message with payment approval details
   */
  async handle(
    message: IntegrationMessage<PaymentApprovedPayload>,
  ): Promise<void> {
    const { messageId, payload } = message;
    const { orderId, paymentId } = payload;

    this.logger.debug(
      `[Infrastructure] Routing payment.approved message ${messageId} to application handler (order: ${orderId}, payment: ${paymentId})`,
    );

    try {
      await this.paymentApprovedHandler.handle(message);
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
  }
}
