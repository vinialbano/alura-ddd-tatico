/**
 * CustomerId Value Object
 *
 * Represents a customer identifier in the system.
 * Accepts any non-empty string as a valid customer ID.
 */
export class CustomerId {
  private readonly value: string;

  private constructor(value: string) {
    this.validateNonEmpty(value);
    this.value = value.trim();
  }

  /**
   * Creates a CustomerId from a string
   * @param value - Customer identifier string
   * @throws Error if value is empty or whitespace-only
   */
  static fromString(value: string): CustomerId {
    return new CustomerId(value);
  }

  /**
   * Returns the underlying customer identifier value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks equality with another CustomerId by value
   * @param other - Another CustomerId to compare
   */
  equals(other: CustomerId): boolean {
    return this.value === other.value;
  }

  private validateNonEmpty(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('CustomerId cannot be empty');
    }
  }
}
