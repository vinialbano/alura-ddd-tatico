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
   * @param cartId - Cart identifier to checkout
   * @param shippingAddress - Delivery address
   * @returns Created order or existing order if cart already converted
   * @throws CartNotFoundException if cart does not exist
   * @throws Error if cart is empty
   * @throws ProductDataUnavailableError if product data cannot be fetched
   * @throws ProductPricingFailedError if pricing calculation fails
   */
  async checkout(
    cartId: CartId,
    shippingAddress: ShippingAddress,
  ): Promise<Order> {
    // 1. Load cart
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    // 2. Check if already converted (idempotent behavior)
    if (cart.isConverted()) {
      const existingOrder = await this.orderRepository.findByCartId(cartId);
      if (existingOrder) {
        return existingOrder;
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

    return order;
  }
}
