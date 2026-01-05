import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../../domain/order/order';
import type { OrderRepository } from '../../domain/order/order.repository';
import { OrderCreationService } from '../../domain/order/services/order-creation.service';
import { OrderPricingService } from '../../domain/order/services/order-pricing.service';
import { ShippingAddress } from '../../domain/order/value-objects/shipping-address';
import type { ShoppingCartRepository } from '../../domain/shopping-cart/shopping-cart.repository';
import { CartId } from '../../domain/shopping-cart/value-objects/cart-id';
import { SHOPPING_CART_REPOSITORY } from '../../infrastructure/modules/cart.module';
import { ORDER_REPOSITORY } from '../../infrastructure/modules/order.module';
import { CheckoutDTO, ShippingAddressDTO } from '../dtos/checkout.dto';
import { DomainEventPublisher } from '../../infrastructure/events/domain-event-publisher';
import {
  MoneyDTO,
  OrderItemDTO,
  OrderResponseDTO,
  ProductSnapshotDTO,
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
   * @throws ProductDataUnavailableError if product data unavailable
   * @throws ProductPricingFailedError if pricing calculation fails
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

    // 2. Check if already converted (idempotent behavior - application concern)
    if (cart.isConverted()) {
      const existingOrder = await this.orderRepository.findByCartId(cartId);
      if (existingOrder) {
        return this.mapToDto(existingOrder);
      }
    }

    // 3. Price cart items (domain service)
    const pricedData = await this.pricingService.price(cart.getItems());

    // 4. Create order (domain service - enforces business rules like empty cart validation)
    const order = this.orderCreationService.createFromCart(
      cart,
      pricedData,
      shippingAddress,
    );

    // 5. Persist order and update cart (infrastructure coordination)
    await this.orderRepository.save(order);
    cart.markAsConverted();
    await this.cartRepository.save(cart);

    // 6. Publish domain events (OrderPlaced) to message bus
    await this.eventPublisher.publishDomainEvents([
      ...order.getDomainEvents(),
    ]);

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
