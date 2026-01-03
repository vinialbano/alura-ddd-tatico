import { CatalogGateway } from '../../../application/gateways/catalog.gateway.interface';
import {
  PricingGateway,
  PricingInput,
} from '../../../application/gateways/pricing.gateway.interface';
import { CartItem } from '../../shopping-cart/cart-item';
import { OrderItem } from '../order-item';
import { ProductSnapshot } from '../value-objects/product-snapshot';
import { Money } from '../value-objects/money';

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
 * Coordinates with external contexts (Catalog, Pricing) to produce
 * fully priced OrderItems with product snapshots.
 *
 * Responsibilities:
 * 1. Retrieve product data from Catalog context for snapshots
 * 2. Calculate pricing via Pricing context
 * 3. Combine catalog data + pricing data into OrderItems
 * 4. Validate currency consistency
 * 5. Return complete PricedOrderData for Order creation
 *
 * Error Handling:
 * - Throws ProductDataUnavailableError if catalog lookup fails
 * - Throws ProductPricingFailedError if pricing calculation fails
 * - Enforces 2-second timeout on external calls (via gateway implementations)
 */
export class OrderPricingService {
  constructor(
    private readonly catalogGateway: CatalogGateway,
    private readonly pricingGateway: PricingGateway,
  ) {}

  /**
   * Price cart items to produce fully priced order data
   *
   * Process:
   * 1. For each CartItem, retrieve product data from catalog → create ProductSnapshot
   * 2. Send all CartItems to pricing gateway → receive unit prices, line totals, discounts
   * 3. Combine snapshot + pricing data → create OrderItems
   * 4. Return PricedOrderData with items + order totals
   *
   * @param cartItems - Array of cart items to price
   * @returns PricedOrderData ready for Order.create()
   * @throws ProductDataUnavailableError if catalog lookup fails
   * @throws ProductPricingFailedError if pricing calculation fails
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

    // Step 1: Retrieve product snapshots from catalog
    const productSnapshots = await this.retrieveProductSnapshots(cartItems);

    // Step 2: Calculate pricing for all items
    const pricingInputs: PricingInput[] = cartItems.map((item) => ({
      productId: item.getProductId(),
      quantity: item.getQuantity(),
    }));

    const pricingResult =
      await this.pricingGateway.calculatePricing(pricingInputs);

    // Step 3: Combine snapshots + pricing → OrderItems
    const orderItems = cartItems.map((cartItem) => {
      const snapshot = productSnapshots.get(cartItem.getProductId().getValue());
      const pricing = pricingResult.items.find((p) =>
        p.productId.equals(cartItem.getProductId()),
      );

      if (!snapshot) {
        throw new Error(
          `Product snapshot not found for productId: ${cartItem.getProductId().getValue()}`,
        );
      }

      if (!pricing) {
        throw new Error(
          `Pricing not found for productId: ${cartItem.getProductId().getValue()}`,
        );
      }

      return OrderItem.create(
        snapshot,
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

  /**
   * Retrieve product data from catalog and create snapshots
   *
   * @param cartItems - Cart items to fetch product data for
   * @returns Map of productId -> ProductSnapshot
   * @throws ProductDataUnavailableError if any product lookup fails
   */
  private async retrieveProductSnapshots(
    cartItems: CartItem[],
  ): Promise<Map<string, ProductSnapshot>> {
    const snapshotMap = new Map<string, ProductSnapshot>();

    // Fetch product data for all items (in sequence)
    for (const cartItem of cartItems) {
      const productData = await this.catalogGateway.getProductData(
        cartItem.getProductId(),
      );

      const snapshot = new ProductSnapshot({
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
      });

      snapshotMap.set(cartItem.getProductId().getValue(), snapshot);
    }

    return snapshotMap;
  }
}
