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

  /**
   * Factory method for creating a cart item
   * @param productId - Product identifier
   * @param quantity - Item quantity
   */
  static create(productId: ProductId, quantity: Quantity): CartItem {
    return new CartItem(productId, quantity);
  }

  /**
   * Returns the product identifier (entity identity)
   */
  getProductId(): ProductId {
    return this.productId;
  }

  /**
   * Returns current quantity
   */
  getQuantity(): Quantity {
    return this.quantity;
  }

  /**
   * Replaces quantity with new value
   * @param newQuantity - New quantity to set
   */
  updateQuantity(newQuantity: Quantity): void {
    this.quantity = newQuantity;
  }

  /**
   * Adds to existing quantity
   * @param additionalQuantity - Quantity to add
   * @throws InvalidCartOperationError if result exceeds maximum quantity (10)
   */
  addQuantity(additionalQuantity: Quantity): void {
    this.quantity = this.quantity.add(additionalQuantity);
  }
}
