import { Injectable, Inject } from '@nestjs/common';
import type { ShoppingCartRepository } from '../../domain/shopping-cart/shopping-cart.repository';
import type { OrderRepository } from '../../domain/order/order.repository';
import { OrderPricingService } from '../../domain/order/services/order-pricing.service';
import { CartId } from '../../domain/shopping-cart/value-objects/cart-id';
import { ShippingAddress } from '../../domain/order/value-objects/shipping-address';
import { Order } from '../../domain/order/order';
import { OrderId } from '../../domain/order/value-objects/order-id';
import { CartNotFoundException } from '../exceptions/cart-not-found.exception';
import { ORDER_REPOSITORY } from '../../infrastructure/modules/order.module';
import { CheckoutDTO, ShippingAddressDTO } from '../dtos/checkout.dto';
import {
  OrderResponseDTO,
  OrderItemDTO,
  ProductSnapshotDTO,
  MoneyDTO,
  ShippingAddressResponseDTO,
} from '../dtos/order-response.dto';

/**
 * CheckoutService
 *
 * Application service orchestrating the checkout use case:
 * 1. Validate cart exists and is not empty
 * 2. Check if cart already converted (idempotent behavior)
 * 3. Price cart items via OrderPricingService
 * 4. Create Order aggregate
 * 5. Persist order and mark cart as converted
 */
@Injectable()
export class CheckoutService {
  constructor(
    @Inject('ShoppingCartRepository')
    private readonly cartRepository: ShoppingCartRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingService,
  ) {}

  /**
   * Checkout a shopping cart to create an order
   *
   * @param dto - CheckoutDTO with cart ID and shipping address
   * @returns OrderResponseDTO with created order details
   * @throws CartNotFoundException if cart does not exist
   * @throws EmptyCartError if cart is empty
   * @throws ProductDataUnavailableError if product data unavailable
   * @throws ProductPricingFailedError if pricing calculation fails
   */
  async checkout(dto: CheckoutDTO): Promise<OrderResponseDTO> {
    // Convert DTO to domain value objects
    const cartId = CartId.fromString(dto.cartId);
    const shippingAddress = this.mapShippingAddressFromDto(dto.shippingAddress);

    // 1. Load cart
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    // 2. Check if already converted (idempotent behavior)
    if (cart.isConverted()) {
      const existingOrder = await this.orderRepository.findByCartId(cartId);
      if (existingOrder) {
        return this.mapToDto(existingOrder);
      }
    }

    // 3. Validate cart is not empty
    if (cart.isEmpty()) {
      throw new Error('Cannot checkout empty cart');
    }

    // 4. Price cart items (domain service orchestrates external calls)
    const pricedData = await this.pricingService.price(cart.getItems());

    // 5. Create order (aggregate)
    const order = Order.create(
      OrderId.generate(),
      cart.getCartId(),
      cart.getCustomerId(),
      pricedData.items,
      shippingAddress,
      pricedData.orderLevelDiscount,
      pricedData.orderTotal,
    );

    // 6. Persist order and update cart
    await this.orderRepository.save(order);
    cart.markAsConverted();
    await this.cartRepository.save(cart);

    return this.mapToDto(order);
  }

  /**
   * Maps ShippingAddressDTO to domain value object
   */
  private mapShippingAddressFromDto(dto: ShippingAddressDTO): ShippingAddress {
    return new ShippingAddress({
      street: dto.street,
      addressLine2: dto.addressLine2,
      city: dto.city,
      stateOrProvince: dto.stateOrProvince,
      postalCode: dto.postalCode,
      country: dto.country,
      deliveryInstructions: dto.deliveryInstructions,
    });
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
