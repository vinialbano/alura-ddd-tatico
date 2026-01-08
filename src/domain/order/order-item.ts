import { ProductSnapshot } from './value-objects/product-snapshot';
import { Quantity } from '../shared/value-objects/quantity';
import { Money } from '../../shared/value-objects/money';

/**
 * OrderItem Entity
 *
 * Represents a single line item within an Order aggregate.
 * Lifecycle is completely managed by the parent Order aggregate.
 *
 * The OrderItem captures:
 * - Product snapshot (immutable product data at checkout time)
 * - Quantity ordered
 * - Unit price at time of order
 * - Item-level discount applied
 * - Calculated line total
 *
 * Invariants:
 * - Line total must equal (unitPrice × quantity) - itemDiscount
 * - All Money values must share the same currency
 * - Quantity must be at least 1
 * - OrderItem is immutable after creation
 */
export class OrderItem {
  private constructor(
    public readonly productSnapshot: ProductSnapshot,
    public readonly quantity: Quantity,
    public readonly unitPrice: Money,
    public readonly itemDiscount: Money,
  ) {
    this.validateCurrencyConsistency();
    this.validateDiscount();
  }

  /**
   * Factory method to create an OrderItem
   *
   * @param productSnapshot - Captured product information
   * @param quantity - Number of units ordered
   * @param unitPrice - Price per unit at time of order
   * @param itemDiscount - Product-level discount applied
   * @returns New OrderItem instance
   * @throws Error if currencies are inconsistent or discount is excessive
   */
  static create(
    productSnapshot: ProductSnapshot,
    quantity: Quantity,
    unitPrice: Money,
    itemDiscount: Money,
  ): OrderItem {
    return new OrderItem(productSnapshot, quantity, unitPrice, itemDiscount);
  }

  /**
   * Calculate the line total for this order item
   *
   * Formula: (unitPrice × quantity) - itemDiscount
   *
   * @returns Money representing the total for this line item
   */
  getLineTotal(): Money {
    const quantityValue = this.quantity.getValue();
    const subtotal = this.unitPrice.multiply(quantityValue);
    return subtotal.subtract(this.itemDiscount);
  }

  /**
   * Validate that unitPrice and itemDiscount use the same currency
   *
   * @throws Error if currencies differ
   */
  private validateCurrencyConsistency(): void {
    if (this.unitPrice.currency !== this.itemDiscount.currency) {
      throw new Error(
        `Cannot perform operation with different currencies: ${this.unitPrice.currency} and ${this.itemDiscount.currency}`,
      );
    }
  }

  /**
   * Validate that discount doesn't exceed the total price (unitPrice × quantity)
   *
   * This validation is enforced by Money.subtract() which throws if result would be negative
   */
  private validateDiscount(): void {
    // Validation happens in getLineTotal() via Money.subtract()
    // If discount > (unitPrice × quantity), Money.subtract() will throw
    this.getLineTotal();
  }
}
