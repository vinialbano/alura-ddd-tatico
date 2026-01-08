import { ProductId } from '../../domain/shared/value-objects/product-id';
import { Quantity } from '../../domain/shared/value-objects/quantity';
import { Money } from '../../shared/value-objects/money';

/**
 * PricingInput
 *
 * Input for pricing calculation - identifies product and quantity to be priced.
 */
export interface PricingInput {
  productId: ProductId;
  quantity: Quantity;
}

/**
 * ItemPricing
 *
 * Pricing result for a single item, including unit price, discount, and line total.
 */
export interface ItemPricing {
  productId: ProductId;
  unitPrice: Money;
  itemDiscount: Money;
  lineTotal: Money;
}

/**
 * PricingResult
 *
 * Complete pricing calculation result for an order.
 * Includes per-item pricing and order-level totals.
 *
 * Business Rule: orderTotal = sum(items.lineTotal) - orderLevelDiscount
 */
export interface PricingResult {
  items: ItemPricing[];
  orderLevelDiscount: Money;
  orderTotal: Money;
}

/**
 * PricingGateway Interface
 *
 * Anti-Corruption Layer for Pricing bounded context.
 * Isolates Order domain from external pricing service data structures.
 *
 * Contract Requirements:
 * - Must complete within 2-second timeout
 * - Must throw Error on failure or timeout
 * - Must return pricing for all input items
 * - All Money values must use consistent currency
 * - Must calculate: lineTotal = (unitPrice × quantity) - itemDiscount
 * - Must calculate: orderTotal = sum(lineTotals) - orderLevelDiscount
 */
export interface PricingGateway {
  /**
   * Calculate pricing for multiple cart items
   *
   * @param items - Array of products with quantities to price
   * @returns PricingResult with per-item and order-level pricing
   * @throws Error if pricing fails, timeout, or service unavailable
   */
  calculatePricing(items: PricingInput[]): Promise<PricingResult>;
}
