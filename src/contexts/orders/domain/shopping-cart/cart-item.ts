import { ProductId } from '../shared/value-objects/product-id';
import { Quantity } from '../shared/value-objects/quantity';

/**
 * CartItem Entity
 *
 * Represents a line item within a shopping cart aggregate.
 * Identity is based on ProductId (unique within a cart).
 * Lifecycle is managed exclusively by the ShoppingCart aggregate.
 */
export class CartItem {
  private readonly productId: ProductId;
  private quantity: Quantity;

  private constructor(productId: ProductId, quantity: Quantity) {
    this.productId = productId;
    this.quantity = quantity;
  }

  static create(productId: ProductId, quantity: Quantity): CartItem {
    return new CartItem(productId, quantity);
  }

  getProductId(): ProductId {
    return this.productId;
  }

  getQuantity(): Quantity {
    return this.quantity;
  }

  updateQuantity(newQuantity: Quantity): void {
    this.quantity = newQuantity;
  }

  addQuantity(additionalQuantity: Quantity): void {
    this.quantity = this.quantity.add(additionalQuantity);
  }
}
