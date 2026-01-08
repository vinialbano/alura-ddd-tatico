import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OrderRepository } from '../../../domain/order/order.repository';
import { OrderId } from '../../../shared/value-objects/order-id';
import { DomainEventPublisher } from '../../../infrastructure/events/domain-event-publisher';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';
import { PaymentApprovedPayload } from '../../../shared/events/integration-message';

/**
 * PaymentApprovedHandler
 *
 * Application service that handles payment.approved integration messages
 * from the Payments bounded context.
 *
 * Responsibilities:
 * 1. Receive payment.approved message from message bus
 * 2. Load Order aggregate by orderId
 * 3. Call Order.markAsPaid() with paymentId (idempotent operation)
 * 4. Persist updated Order
 * 5. Publish OrderPaid domain event (via DomainEventPublisher)
 *
 * This handler bridges the integration layer (message bus) with the domain layer,
 * translating external payment events into domain commands.
 */
@Injectable()
export class PaymentApprovedHandler {
  private readonly logger = new Logger(PaymentApprovedHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  /**
   * Handle payment.approved payload
   *
   * @param payload - payment approval details
   */
  async handle(payload: PaymentApprovedPayload): Promise<void> {
    const { orderId, paymentId, approvedAmount, currency } = payload;

    // 1. Load order aggregate
    const order = await this.orderRepository.findById(
      OrderId.fromString(orderId),
    );

    if (!order) {
      this.logger.warn(
        `Order ${orderId} not found, ignoring payment.approved message for payment ${paymentId}`,
      );
      return;
    }

    // 2. Check idempotency - if this payment has already been processed, log and return
    if (order.hasProcessedPayment(paymentId)) {
      this.logger.log(
        `Payment ${paymentId} already processed for order ${orderId}, ignoring duplicate message`,
      );
      return;
    }

    // 3. Mark order as paid (idempotent operation)
    try {
      order.markAsPaid(paymentId);
      this.logger.log(
        `Order ${orderId} marked as paid with payment ${paymentId} (amount: ${approvedAmount} ${currency})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to mark order ${orderId} as paid: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }

    // 4. Persist updated order
    await this.orderRepository.save(order);

    // 5. Publish OrderPaid domain event to message bus
    await this.eventPublisher.publishDomainEvents([...order.getDomainEvents()]);

    this.logger.log(
      `Order ${orderId} payment processing complete, OrderPaid event emitted`,
    );
  }
}
