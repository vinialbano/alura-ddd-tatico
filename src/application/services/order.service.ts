import { Injectable, Inject } from '@nestjs/common';
import type { OrderRepository } from '../../domain/order/order.repository';
import { OrderId } from '../../shared/value-objects/order-id';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';
import { ORDER_REPOSITORY } from '../../infrastructure/modules/order.module';
import {
  OrderResponseDTO,
  OrderItemDTO,
  ProductSnapshotDTO,
  MoneyDTO,
  ShippingAddressResponseDTO,
} from '../dtos/order-response.dto';
import { Order } from '../../domain/order/order';

/**
 * OrderService
 *
 * Application service for order operations:
 * - Mark order as paid
 * - Cancel order
 * - Find order by ID
 */
@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * Mark an order as paid
   *
   * @param orderId - Order ID
   * @param paymentId - Payment transaction identifier
   * @returns OrderResponseDTO
   * @throws OrderNotFoundException if order does not exist
   * @throws InvalidOrderStateTransitionError if order cannot be marked as paid
   */
  async markAsPaid(
    orderId: string,
    paymentId: string,
  ): Promise<OrderResponseDTO> {
    const orderIdVO = OrderId.fromString(orderId);
    const order = await this.orderRepository.findById(orderIdVO);

    if (!order) {
      throw new OrderNotFoundException(orderIdVO);
    }

    order.markAsPaid(paymentId);
    await this.orderRepository.save(order);

    return this.mapToDto(order);
  }

  /**
   * Cancel an order
   *
   * @param orderId - Order ID
   * @param reason - Cancellation reason
   * @returns OrderResponseDTO
   * @throws OrderNotFoundException if order does not exist
   * @throws InvalidOrderStateTransitionError if order cannot be cancelled
   */
  async cancel(orderId: string, reason: string): Promise<OrderResponseDTO> {
    const orderIdVO = OrderId.fromString(orderId);
    const order = await this.orderRepository.findById(orderIdVO);

    if (!order) {
      throw new OrderNotFoundException(orderIdVO);
    }

    order.cancel(reason);
    await this.orderRepository.save(order);

    return this.mapToDto(order);
  }

  /**
   * Find an order by ID
   *
   * @param orderId - Order ID
   * @returns OrderResponseDTO
   * @throws OrderNotFoundException if order does not exist
   */
  async findById(orderId: string): Promise<OrderResponseDTO> {
    const orderIdVO = OrderId.fromString(orderId);
    const order = await this.orderRepository.findById(orderIdVO);

    if (!order) {
      throw new OrderNotFoundException(orderIdVO);
    }

    return this.mapToDto(order);
  }

  /**
   * Maps Order aggregate to OrderResponseDTO
   */
  private mapToDto(order: Order): OrderResponseDTO {
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
