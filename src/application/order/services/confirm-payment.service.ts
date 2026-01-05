import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { OrderRepository } from '../../../domain/order/order.repository';
import type { IPaymentGateway } from '../gateways/payment-gateway.interface';
import { OrderResponseDTO } from '../../dtos/order-response.dto';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { OrderMapper } from '../../mappers/order.mapper';
import { PAYMENT_GATEWAY } from '../../../infrastructure/modules/order.module';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';

/**
 * PaymentDeclinedError
 *
 * Thrown when the payment gateway declines a payment attempt
 */
export class PaymentDeclinedError extends Error {
  constructor(public readonly reason: string) {
    super(`Payment declined: ${reason}`);
    this.name = 'PaymentDeclinedError';
  }
}

/**
 * ConfirmPaymentService
 *
 * Application service for payment confirmation use case.
 * Orchestrates the payment flow without containing business logic.
 *
 * Flow:
 * 1. Load order from repository
 * 2. Call payment gateway
 * 3. If declined, throw PaymentDeclinedError
 * 4. If approved, mark order as paid (domain logic)
 * 5. Save order
 * 6. Publish domain events (future: will use event bus)
 * 7. Return DTO
 */
@Injectable()
export class ConfirmPaymentService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  /**
   * Execute payment confirmation
   *
   * @param orderId - Order ID to process payment for
   * @returns Order response DTO with updated payment status
   * @throws NotFoundException if order doesn't exist
   * @throws PaymentDeclinedError if payment gateway declines
   * @throws InvalidOrderStateTransitionError if order not in correct state
   */
  async execute(orderId: string): Promise<OrderResponseDTO> {
    // 1. Load order
    const order = await this.orderRepository.findById(
      OrderId.fromString(orderId),
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // 2. Process payment through gateway
    const paymentResult = await this.paymentGateway.processPayment(
      order.id,
      order.totalAmount,
    );

    // 3. Handle payment declined
    if (!paymentResult.success) {
      throw new PaymentDeclinedError(paymentResult.reason);
    }

    // 4. Mark order as paid (domain logic enforces state machine rules)
    order.markAsPaid(paymentResult.paymentId);

    // 5. Persist order
    await this.orderRepository.save(order);

    // 6. Publish domain events (TODO: implement when event bus is available in Stage 4)
    // For now, events are collected but not published
    // this.eventPublisher.publishAll(order.getDomainEvents());
    order.clearDomainEvents();

    // 7. Return DTO
    return OrderMapper.toResponseDTO(order);
  }
}
