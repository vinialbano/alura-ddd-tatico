/**
 * StringId Base Class
 *
 * Abstract base class for string-based identifier value objects.
 * Provides common validation, equality, and accessor methods.
 *
 * Subclasses should extend this to create specific ID types:
 * - ProductId extends StringId
 * - CustomerId extends StringId
 *
 * @abstract
 */
export abstract class StringId {
  public readonly value: string;

  protected constructor(value: string) {
    this.validateNonEmpty(value);
    this.value = value.trim();
  }

  /**
   * Returns the underlying string value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks equality with another StringId by value
   * @param other - Another StringId instance to compare
   */
  equals(other: StringId): boolean {
    return this.value === other.value;
  }

  /**
   * Returns the string representation of the ID
   */
  toString(): string {
    return this.value;
  }

  /**
   * Validates that the value is not null, undefined, empty, or whitespace-only
   * @param value - The value to validate
   * @throws Error if validation fails
   */
  private validateNonEmpty(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ID cannot be empty');
    }
  }
}
