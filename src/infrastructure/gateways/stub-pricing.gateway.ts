import { Injectable } from '@nestjs/common';
import {
  PricingGateway,
  PricingInput,
  PricingResult,
  ItemPricing,
} from '../../application/gateways/pricing.gateway.interface';
import { Money } from '../../domain/order/value-objects/money';
import { ProductPricingFailedError } from '../../domain/order/exceptions/product-pricing-failed.error';

/**
 * StubPricingGateway
 *
 * Stubbed implementation of PricingGateway for testing and demonstration
 * Simulates external Pricing context with hardcoded pricing rules
 *
 * Pricing logic:
 * - Base unit prices per product
 * - 10% discount on items with quantity >= 3
 * - $10 order-level discount if order total > $100
 *
 * In production, this would be replaced with:
 * - HTTP REST client calling Pricing microservice
 * - Complex pricing engine with promotions, coupons, customer segments
 */
@Injectable()
export class StubPricingGateway implements PricingGateway {
  private readonly unitPrices = new Map<string, number>([
    ['COFFEE-COL-001', 24.99],
    ['TEA-EARL-001', 12.99],
    ['MUG-CERAMIC-001', 15.99],
    ['GRINDER-BURR-001', 89.99],
  ]);

  private readonly currency = 'USD';

  /**
   * Calculate pricing for cart items
   *
   * Simulates 150ms network latency
   * Applies hardcoded discount rules
   */
  async calculatePricing(items: PricingInput[]): Promise<PricingResult> {
    // Simulate network latency
    await this.delay(150);

    if (items.length === 0) {
      throw new ProductPricingFailedError('Cannot price empty cart');
    }

    // Calculate pricing for each item
    const itemPricings: ItemPricing[] = items.map((item) => {
      const unitPriceAmount = this.unitPrices.get(item.productId.getValue());
      if (unitPriceAmount === undefined) {
        throw new ProductPricingFailedError(
          `No price found for product ${item.productId.getValue()}`,
        );
      }

      const unitPrice = new Money(unitPriceAmount, this.currency);
      const quantity = item.quantity.getValue();

      // Apply item-level discount: 10% off if quantity >= 3
      let itemDiscountAmount = 0;
      if (quantity >= 3) {
        itemDiscountAmount = unitPriceAmount * quantity * 0.1;
      }
      const itemDiscount = new Money(itemDiscountAmount, this.currency);

      // Calculate line total
      const lineTotal = unitPrice
        .multiply(quantity)
        .subtract(itemDiscount);

      return {
        productId: item.productId,
        unitPrice,
        itemDiscount,
        lineTotal,
      };
    });

    // Calculate order total before order-level discount
    const subtotal = itemPricings.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Money(0, this.currency),
    );

    // Apply order-level discount: $10 off if subtotal > $100
    let orderLevelDiscountAmount = 0;
    if (subtotal.amount > 100) {
      orderLevelDiscountAmount = 10.0;
    }
    const orderLevelDiscount = new Money(
      orderLevelDiscountAmount,
      this.currency,
    );

    // Calculate final order total
    const orderTotal = subtotal.subtract(orderLevelDiscount);

    return {
      items: itemPricings,
      orderLevelDiscount,
      orderTotal,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
