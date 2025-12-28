/**
 * Entity Contracts for Shopping Cart Domain
 *
 * Entities have identity and lifecycle within their aggregate.
 * Location: src/domain/entities/
 */

import { ProductId, Quantity } from './value-objects';

/**
 * CartItem - Line item within shopping cart
 *
 * Identity: ProductId (unique within cart)
 * Lifecycle: Managed by ShoppingCart aggregate
 */
export interface CartItem {
  getProductId(): ProductId;
  getQuantity(): Quantity;
  updateQuantity(newQuantity: Quantity): void;
  addQuantity(additionalQuantity: Quantity): void;
}

export interface CartItemStatic {
  create(productId: ProductId, quantity: Quantity): CartItem;
}
