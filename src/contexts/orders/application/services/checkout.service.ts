import { Inject, Injectable } from '@nestjs/common';
import { DomainEventPublisher } from '../../../../shared/events/domain-event-publisher';
import { SHOPPING_CART_REPOSITORY, ORDER_REPOSITORY } from '../../orders.tokens';
import { Order } from '../../domain/order/order';
import type { OrderRepository } from '../../domain/order/order.repository';
import { OrderCreationService } from '../../domain/order/services/order-creation.service';
import { OrderPricingService } from '../../domain/order/services/order-pricing.service';
import { ShippingAddress } from '../../domain/order/value-objects/shipping-address';
import { CartId } from '../../domain/shopping-cart/cart-id';
import { EmptyCartError } from '../../domain/shopping-cart/exceptions/empty-cart.error';
import type { ShoppingCartRepository } from '../../domain/shopping-cart/shopping-cart.repository';
import { CheckoutDTO, ShippingAddressDTO } from '../dtos/checkout.dto';
import {
  OrderItemDTO,
  OrderResponseDTO,
  ShippingAddressResponseDTO,
} from '../dtos/order-response.dto';
import { CartNotFoundException } from '../exceptions/cart-not-found.exception';

/**
 * CheckoutService
 *
 * Application service orchestrating the checkout use case:
 * 1. Load cart and validate existence
 * 2. Check if cart already converted (idempotent behavior)
 * 3. Price cart items via OrderPricingService (domain service)
 * 4. Create Order via OrderCreationService (domain service - contains business rules)
 * 5. Persist order and mark cart as converted
 */
@Injectable()
export class CheckoutService {
  constructor(
    @Inject(SHOPPING_CART_REPOSITORY)
    private readonly cartRepository: ShoppingCartRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingService,
    private readonly orderCreationService: OrderCreationService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  /**
   * Checkout a shopping cart to create an order
   *
   * @param dto - CheckoutDTO with cart ID and shipping address
   * @returns OrderResponseDTO with created order details
   * @throws CartNotFoundException if cart does not exist
   * @throws EmptyCartError if cart is empty (thrown by OrderCreationService)
   * @throws Error if product data unavailable or pricing calculation fails
   */
  async checkout(dto: CheckoutDTO): Promise<OrderResponseDTO> {
    // Convert DTO to domain value objects
    const cartId = CartId.fromString(dto.cartId);
    const shippingAddress = this.mapShippingAddressFromDto(dto.shippingAddress);

    // 1. Load cart (repository interaction)
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    // 2. Validate cart is not empty (fail fast before external calls)
    if (cart.isEmpty()) {
      throw new EmptyCartError();
    }

    // 3. Check if already converted (idempotent behavior - application concern)
    if (cart.isConverted()) {
      const existingOrder = await this.orderRepository.findByCartId(cartId);
      if (existingOrder) {
        return this.mapToDto(existingOrder);
      }
    }

    // 4. Price cart items (domain service)
    const pricedData = await this.pricingService.price(cart.getItems());

    // 5. Create order (domain service)
    const order = this.orderCreationService.createFromCart(
      cart,
      pricedData,
      shippingAddress,
    );

    // 6. Persist order and update cart (infrastructure coordination)
    await this.orderRepository.save(order);
    cart.markAsConverted();
    await this.cartRepository.save(cart);

    // 7. Publish domain events (OrderPlaced) to message bus
    await this.eventPublisher.publishDomainEvents([...order.getDomainEvents()]);

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
   * Maps Order aggregate to flattened OrderResponseDTO
   */
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
