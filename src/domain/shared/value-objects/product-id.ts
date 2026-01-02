/**
 * ProductId Value Object
 *
 * Represents a product identifier from the Catalog bounded context.
 * Accepts any non-empty string as a valid product ID.
 * Product existence validation is deferred to cart-to-order conversion.
 */
export class ProductId {
  private readonly value: string;

  private constructor(value: string) {
    this.validateNonEmpty(value);
    this.value = value.trim();
  }

  /**
   * Creates a ProductId from a string
   * @param value - Product identifier string
   * @throws Error if value is empty or whitespace-only
   */
  static fromString(value: string): ProductId {
    return new ProductId(value);
  }

  /**
   * Returns the underlying product identifier value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks equality with another ProductId by value
   * @param other - Another ProductId to compare
   */
  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  private validateNonEmpty(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductId cannot be empty');
    }
  }
}
