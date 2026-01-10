import { InvalidCartOperationError } from '../../shopping-cart/exceptions/invalid-cart-operation.error';

/**
 * Quantity Value Object
 *
 * Represents an item quantity with domain-specific constraints.
 * Enforces business rules: quantity must be an integer between 1 and 10 (inclusive).
 */
export class Quantity {
  private static readonly MIN_VALUE = 1;
  private static readonly MAX_VALUE = 10;

  private readonly value: number;

  private constructor(value: number) {
    this.validateQuantity(value);
    this.value = value;
  }

  /**
   * Creates a Quantity with validation
   * @param value - Numeric quantity value
   * @throws InvalidCartOperationError if value is < 1, > 10, or not an integer
   */
  static of(value: number): Quantity {
    return new Quantity(value);
  }

  /**
   * Returns the numeric quantity value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Adds another quantity and returns a new Quantity
   * @param other - Quantity to add
   * @throws InvalidCartOperationError if the sum exceeds MAX_VALUE (10)
   */
  add(other: Quantity): Quantity {
    const sum = this.value + other.value;
    return Quantity.of(sum);
  }

  /**
   * Checks equality with another Quantity by value
   * @param other - Another Quantity to compare
   */
  equals(other: Quantity): boolean {
    return this.value === other.value;
  }

  private validateQuantity(value: number): void {
    if (!Number.isInteger(value)) {
      throw new InvalidCartOperationError(
        'Quantity must be an integer between 1 and 10',
      );
    }

    if (value < Quantity.MIN_VALUE || value > Quantity.MAX_VALUE) {
      throw new InvalidCartOperationError(
        'Quantity must be an integer between 1 and 10',
      );
    }
  }
}
