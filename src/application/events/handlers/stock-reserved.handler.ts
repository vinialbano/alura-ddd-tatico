import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OrderRepository } from '../../../domain/order/order.repository';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';
import {
  IntegrationMessage,
  StockReservedPayload,
} from '../integration-message';

/**
 * StockReservedHandler
 *
 * Application service that handles stock.reserved integration messages
 * from the Inventory bounded context.
 *
 * Responsibilities:
 * 1. Receive stock.reserved message from message bus
 * 2. Load Order aggregate by orderId
 * 3. Call Order.reserveStock() with reservationId (idempotent operation)
 * 4. Persist updated Order
 *
 * This handler bridges the integration layer (message bus) with the domain layer,
 * translating external inventory events into domain commands.
 */
@Injectable()
export class StockReservedHandler {
  private readonly logger = new Logger(StockReservedHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * Handle stock.reserved integration message
   *
   * @param message - Integration message with stock reservation details
   */
  async handle(
    message: IntegrationMessage<StockReservedPayload>,
  ): Promise<void> {
    const { payload, messageId } = message;
    const { orderId, reservationId, items } = payload;

    this.logger.log(
      `Handling stock.reserved message ${messageId} for order ${orderId} with reservation ${reservationId}`,
    );

    // 1. Load order aggregate
    const order = await this.orderRepository.findById(
      OrderId.fromString(orderId),
    );

    if (!order) {
      this.logger.warn(
        `Order ${orderId} not found, ignoring stock.reserved message ${messageId}`,
      );
      return;
    }

    // 2. Check idempotency - if this reservation has already been processed, log and return
    if (order.hasProcessedReservation(reservationId)) {
      this.logger.log(
        `Reservation ${reservationId} already processed for order ${orderId}, ignoring duplicate message ${messageId}`,
      );
      return;
    }

    // 3. Reserve stock (idempotent operation)
    try {
      order.reserveStock(reservationId);
      this.logger.log(
        `Stock reserved for order ${orderId} with reservation ${reservationId} (${items.length} items)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to reserve stock for order ${orderId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }

    // 4. Persist updated order
    await this.orderRepository.save(order);

    this.logger.log(
      `Order ${orderId} stock reservation complete, order now in StockReserved state`,
    );
  }
}
