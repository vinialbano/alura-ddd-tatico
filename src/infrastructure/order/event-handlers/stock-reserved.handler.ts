import { Injectable, Logger } from '@nestjs/common';
import { StockReservedHandler } from '../../../application/events/handlers/stock-reserved.handler';
import {
  IntegrationMessage,
  StockReservedPayload,
} from '../../../application/events/integration-message';

/**
 * StockReservedInfrastructureHandler
 *
 * Infrastructure adapter that bridges the message bus subscription
 * with the application service handler.
 *
 * This thin adapter layer:
 * 1. Receives messages from message bus subscriptions
 * 2. Delegates to application service (StockReservedHandler)
 * 3. Handles infrastructure concerns (logging, error handling)
 *
 * This separation allows the application layer to remain infrastructure-agnostic.
 */
@Injectable()
export class StockReservedInfrastructureHandler {
  private readonly logger = new Logger(StockReservedInfrastructureHandler.name);

  constructor(private readonly stockReservedHandler: StockReservedHandler) {}

  /**
   * Handle stock.reserved message from message bus
   * Delegates to application service handler
   *
   * @param message - Integration message with stock reservation details
   */
  async handle(
    message: IntegrationMessage<StockReservedPayload>,
  ): Promise<void> {
    const { messageId, payload } = message;
    const { orderId, reservationId } = payload;

    this.logger.debug(
      `[Infrastructure] Routing stock.reserved message ${messageId} to application handler (order: ${orderId}, reservation: ${reservationId})`,
    );

    try {
      await this.stockReservedHandler.handle(message);
    } catch (error) {
      this.logger.error(
        `[Infrastructure] Failed to handle stock.reserved message ${messageId}: ${error.message}`,
        error.stack,
      );
      // In production, this might publish to a dead-letter queue
      throw error;
    }
  }
}
