import { Injectable } from '@nestjs/common';
import {
  CatalogGateway,
  ProductData,
} from '../../application/gateways/catalog.gateway.interface';
import { ProductId } from '../../domain/shared/value-objects/product-id';
import { ProductDataUnavailableError } from '../../domain/order/exceptions/product-data-unavailable.error';

/**
 * StubCatalogGateway
 *
 * Stubbed implementation of CatalogGateway for testing and demonstration
 * Simulates external Product Catalog context with hardcoded product data
 *
 * In production, this would be replaced with:
 * - HTTP REST client calling Catalog microservice
 * - gRPC client
 * - Message queue consumer
 */
@Injectable()
export class StubCatalogGateway implements CatalogGateway {
  private readonly products = new Map<string, ProductData>([
    [
      'COFFEE-COL-001',
      {
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      },
    ],
    [
      'TEA-EARL-001',
      {
        name: 'Earl Grey Tea',
        description: 'Classic black tea with bergamot oil, 20 tea bags',
        sku: 'TEA-EARL-001',
      },
    ],
    [
      'MUG-CERAMIC-001',
      {
        name: 'Ceramic Coffee Mug',
        description: 'Handcrafted ceramic mug, 12oz capacity',
        sku: 'MUG-CERAMIC-001',
      },
    ],
    [
      'GRINDER-BURR-001',
      {
        name: 'Burr Coffee Grinder',
        description: 'Professional burr grinder with 15 grind settings',
        sku: 'GRINDER-BURR-001',
      },
    ],
  ]);

  /**
   * Retrieve product data from catalog
   *
   * Simulates 100ms network latency
   * Throws ProductDataUnavailableError if product not found
   */
  async getProductData(productId: ProductId): Promise<ProductData> {
    // Simulate network latency
    await this.delay(100);

    const product = this.products.get(productId.getValue());
    if (!product) {
      throw new ProductDataUnavailableError(
        `Product with ID ${productId.getValue()} not found in catalog`,
      );
    }

    return product;
  }

  /**
   * Batch retrieve product data for multiple products
   *
   * More efficient than multiple individual calls
   */
  async getProductDataBatch(productIds: ProductId[]): Promise<ProductData[]> {
    // Simulate network latency (batch call is faster than N individual calls)
    await this.delay(150);

    const results: ProductData[] = [];
    for (const productId of productIds) {
      const product = this.products.get(productId.getValue());
      if (!product) {
        throw new ProductDataUnavailableError(
          `Product with ID ${productId.getValue()} not found in catalog`,
        );
      }
      results.push(product);
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
