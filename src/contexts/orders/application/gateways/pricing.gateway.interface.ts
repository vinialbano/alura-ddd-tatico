import { Money } from '../../../../shared/value-objects/money';
import { ProductId } from '../../domain/shared/value-objects/product-id';
import { Quantity } from '../../domain/shared/value-objects/quantity';

export interface PricingInput {
  productId: ProductId;
  quantity: Quantity;
}

export interface ItemPricing {
  productId: ProductId;
  unitPrice: Money;
  itemDiscount: Money;
  lineTotal: Money;
}

/**
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
  calculatePricing(items: PricingInput[]): Promise<PricingResult>;
}
