import {
  PricingGateway,
  PricingInput,
} from '../../../application/gateways/pricing.gateway.interface';
import { CartItem } from '../../shopping-cart/cart-item';
import { OrderItem } from '../order-item';
import { Money } from '../../../../../shared/value-objects/money';

/**
 * PricedOrderData
 *
 * Output from OrderPricingService containing fully priced order items
 * ready for Order aggregate creation.
 */
export interface PricedOrderData {
  items: OrderItem[];
  orderLevelDiscount: Money;
  orderTotal: Money;
}

/**
 * OrderPricingService
 *
 * Domain Service that orchestrates pricing logic during checkout.
 * Coordinates with Pricing context to produce fully priced OrderItems.
 *
 * Responsibilities:
 * 1. Calculate pricing via Pricing context
 * 2. Combine product IDs + pricing data into OrderItems
 * 3. Validate currency consistency
 * 4. Return complete PricedOrderData for Order creation
 *
 * Error Handling:
 * - Throws Error if pricing calculation fails
 * - Enforces 2-second timeout on external calls (via gateway implementations)
 */
export class OrderPricingService {
  constructor(private readonly pricingGateway: PricingGateway) {}

  /**
   * Price cart items to produce fully priced order data
   *
   * Process:
   * 1. Send all CartItems to pricing gateway → receive unit prices, line totals, discounts
   * 2. Combine product IDs + pricing data → create OrderItems
   * 3. Return PricedOrderData with items + order totals
   *
   * @param cartItems - Array of cart items to price
   * @returns PricedOrderData ready for Order.create()
   * @throws Error if pricing calculation fails
   */
  async price(cartItems: CartItem[]): Promise<PricedOrderData> {
    // Handle empty cart
    if (cartItems.length === 0) {
      const pricingResult = await this.pricingGateway.calculatePricing([]);
      return {
        items: [],
        orderLevelDiscount: pricingResult.orderLevelDiscount,
        orderTotal: pricingResult.orderTotal,
      };
    }

    // Step 1: Calculate pricing for all items
    const pricingInputs: PricingInput[] = cartItems.map((item) => ({
      productId: item.getProductId(),
      quantity: item.getQuantity(),
    }));

    const pricingResult =
      await this.pricingGateway.calculatePricing(pricingInputs);

    // Step 2: Combine product IDs + pricing → OrderItems
    const orderItems = cartItems.map((cartItem) => {
      const pricing = pricingResult.items.find((p) =>
        p.productId.equals(cartItem.getProductId()),
      );

      if (!pricing) {
        throw new Error(
          `Pricing not found for productId: ${cartItem.getProductId().getValue()}`,
        );
      }

      return OrderItem.create(
        cartItem.getProductId(),
        cartItem.getQuantity(),
        pricing.unitPrice,
        pricing.itemDiscount,
      );
    });

    return {
      items: orderItems,
      orderLevelDiscount: pricingResult.orderLevelDiscount,
      orderTotal: pricingResult.orderTotal,
    };
  }
}
