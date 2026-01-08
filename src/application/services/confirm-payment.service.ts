import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from 'src/domain/order/order';
import type { OrderRepository } from '../../domain/order/order.repository';
import { OrderId } from '../../domain/order/value-objects/order-id';
import {
  ORDER_REPOSITORY,
  PAYMENT_GATEWAY,
} from '../../infrastructure/modules/order.module';
import {
  MoneyDTO,
  OrderItemDTO,
  OrderResponseDTO,
  ProductSnapshotDTO,
  ShippingAddressResponseDTO,
} from '../dtos/order-response.dto';
import type { IPaymentGateway } from '../gateways/payment-gateway.interface';

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
    return this.toResponseDTO(order);
  }

  /**
   * Map Order aggregate to OrderResponseDTO
   *
   * @param order - Order aggregate to map
   * @returns OrderResponseDTO for HTTP responses
   */
  private toResponseDTO(order: Order): OrderResponseDTO {
    const items: OrderItemDTO[] = order.items.map((item) => {
      const lineTotal = item.getLineTotal();
      return new OrderItemDTO(
        new ProductSnapshotDTO(
          item.productSnapshot.name,
          item.productSnapshot.description,
          item.productSnapshot.sku,
        ),
        item.quantity.getValue(),
        new MoneyDTO(item.unitPrice.amount, item.unitPrice.currency),
        new MoneyDTO(item.itemDiscount.amount, item.itemDiscount.currency),
        new MoneyDTO(lineTotal.amount, lineTotal.currency),
      );
    });

    const shippingAddress = new ShippingAddressResponseDTO({
      street: order.shippingAddress.street,
      addressLine2: order.shippingAddress.addressLine2,
      city: order.shippingAddress.city,
      stateOrProvince: order.shippingAddress.stateOrProvince,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      deliveryInstructions: order.shippingAddress.deliveryInstructions,
    });

    return new OrderResponseDTO({
      id: order.id.getValue(),
      cartId: order.cartId.getValue(),
      customerId: order.customerId.getValue(),
      items,
      shippingAddress,
      status: order.status.toString(),
      orderLevelDiscount: new MoneyDTO(
        order.orderLevelDiscount.amount,
        order.orderLevelDiscount.currency,
      ),
      totalAmount: new MoneyDTO(
        order.totalAmount.amount,
        order.totalAmount.currency,
      ),
      paymentId: order.paymentId,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
    });
  }
}
