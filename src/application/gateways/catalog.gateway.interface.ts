import { ProductId } from '../../domain/shared/value-objects/product-id';

/**
 * ProductData
 *
 * Data transfer object for product information from Product Catalog context.
 * Contains the essential product attributes needed to create a ProductSnapshot.
 */
export interface ProductData {
  name: string;
  description: string;
  sku: string;
}

/**
 * CatalogGateway Interface
 *
 * Anti-Corruption Layer for Product Catalog bounded context.
 * Isolates Order domain from external catalog service data structures.
 *
 * Contract Requirements:
 * - Must complete within 2-second timeout
 * - Must throw Error on failure or timeout
 * - Must translate external catalog structure to ProductData DTO
 */
export interface CatalogGateway {
  /**
   * Retrieve product data for creating a ProductSnapshot
   *
   * @param productId - Product identifier
   * @returns ProductData containing name, description, and SKU
   * @throws Error if product not found, timeout, or service unavailable
   */
  getProductData(productId: ProductId): Promise<ProductData>;
}
