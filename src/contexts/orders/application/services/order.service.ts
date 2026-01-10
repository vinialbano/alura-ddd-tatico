import { Inject, Injectable } from '@nestjs/common';
import { OrderId } from '../../../../shared/value-objects/order-id';
import { Order } from '../../domain/order/order';
import type { OrderRepository } from '../../domain/order/order.repository';
import { ORDER_REPOSITORY } from '../../orders.tokens';
import {
  OrderItemDTO,
  OrderResponseDTO,
  ShippingAddressResponseDTO,
} from '../dtos/order-response.dto';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';

/**
 * OrderService
 *
 * Application service for order operations:
 * - Mark order as paid
 * - Find order by ID
 */
@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

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

  async findById(orderId: string): Promise<OrderResponseDTO> {
    const orderIdVO = OrderId.fromString(orderId);
    const order = await this.orderRepository.findById(orderIdVO);

    if (!order) {
      throw new OrderNotFoundException(orderIdVO);
    }

    return this.mapToDto(order);
  }

  private mapToDto(order: Order): OrderResponseDTO {
    const items: OrderItemDTO[] = order.items.map((item) => {
      const lineTotal = item.getLineTotal();
      return new OrderItemDTO(
        item.productId.getValue(),
        item.quantity.getValue(),
        item.unitPrice.amount,
        item.itemDiscount.amount,
        lineTotal.amount,
      );
    });

    return new OrderResponseDTO({
      id: order.id.getValue(),
      cartId: order.cartId.getValue(),
      customerId: order.customerId.getValue(),
      status: order.status.toString(),
      items,
      shippingAddress: new ShippingAddressResponseDTO({
        street: order.shippingAddress.street,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        stateOrProvince: order.shippingAddress.stateOrProvince,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
        deliveryInstructions: order.shippingAddress.deliveryInstructions,
      }),
      currency: order.totalAmount.currency,
      orderLevelDiscount: order.orderLevelDiscount.amount,
      totalAmount: order.totalAmount.amount,
      paymentId: order.paymentId,
      createdAt: order.createdAt,
    });
  }
}
