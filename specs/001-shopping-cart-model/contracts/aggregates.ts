/**
 * Aggregate Root Contracts for Shopping Cart Domain
 *
 * Aggregate roots are transaction boundaries and enforce invariants.
 * Location: src/domain/aggregates/
 */

import { CartId, CustomerId, ProductId, Quantity } from './value-objects';
import { CartItem } from './entities';

/**
 * ShoppingCart - Aggregate root managing cart lifecycle
 *
 * Transaction Boundary: All cart item operations
 * Invariants:
 * - Max 20 unique products
 * - Each item quantity 1-10
 * - Cannot modify after conversion
 * - Cannot convert empty cart
 * - Must have CustomerId at creation
 */
export interface ShoppingCart {
  // Queries
  getCartId(): CartId;
  getCustomerId(): CustomerId;
  getItems(): CartItem[];
  isConverted(): boolean;
  getItemCount(): number;

  // Commands
  addItem(productId: ProductId, quantity: Quantity): void;
  updateItemQuantity(productId: ProductId, newQuantity: Quantity): void;
  removeItem(productId: ProductId): void;
  markAsConverted(): void;
}

export interface ShoppingCartStatic {
  create(cartId: CartId, customerId: CustomerId): ShoppingCart;
}
