import { ShoppingCart } from '../../shopping-cart/shopping-cart';
import { Order } from '../order';
import { OrderId } from '../value-objects/order-id';
import { ShippingAddress } from '../value-objects/shipping-address';
import { OrderItem } from '../order-item';
import { Money } from '../../../shared/value-objects/money';
import { EmptyCartError } from '../../shopping-cart/exceptions/empty-cart.error';

/**
 * PricedOrderData
 *
 * Result from OrderPricingService containing priced items and totals
 */
export interface PricedOrderData {
  items: OrderItem[];
  orderLevelDiscount: Money;
  orderTotal: Money;
}

/**
 * OrderCreationService
 *
 * Domain service responsible for the business logic of creating orders from shopping carts.
 * Encapsulates the domain rules for order creation.
 *
 * Domain Rules:
 * - Cart must not be empty
 * - Order inherits cart's customer and items
 * - Order is created in AwaitingPayment state
 */
export class OrderCreationService {
  /**
   * Create an order from a shopping cart
   *
   * Business Rule: Cart must not be empty
   *
   * @param cart - The shopping cart to convert
   * @param pricedData - Priced order data from OrderPricingService
   * @param shippingAddress - Delivery address for the order
   * @returns Newly created Order aggregate
   * @throws EmptyCartError if cart has no items
   */
  createFromCart(
    cart: ShoppingCart,
    pricedData: PricedOrderData,
    shippingAddress: ShippingAddress,
  ): Order {
    // Business rule: Cart must not be empty
    if (cart.isEmpty()) {
      throw new EmptyCartError();
    }

    // Create order with data from cart and pricing service
    return Order.create(
      OrderId.generate(),
      cart.getCartId(),
      cart.getCustomerId(),
      pricedData.items,
      shippingAddress,
      pricedData.orderLevelDiscount,
      pricedData.orderTotal,
    );
  }

  /**
   * Check if cart can be converted to order
   *
   * Business rule: Cart must have items and not be already converted
   *
   * @param cart - The shopping cart to check
   * @returns true if cart can be converted, false otherwise
   */
  canConvertCart(cart: ShoppingCart): boolean {
    return !cart.isEmpty() && !cart.isConverted();
  }
}
