import { randomUUID } from 'crypto';

/**
 * CartId Value Object
 *
 * Represents a unique identifier for a shopping cart.
 * Uses UUID format for uniqueness guarantees.
 */
export class CartId {
  private readonly value: string;

  private constructor(value: string) {
    this.validateUUID(value);
    this.value = value.toLowerCase();
  }

  /**
   * Creates a new CartId with a generated UUID
   */
  static create(): CartId {
    return new CartId(randomUUID());
  }

  /**
   * Creates a CartId from an existing UUID string
   * @param value - UUID string
   * @throws Error if value is empty or not a valid UUID
   */
  static fromString(value: string): CartId {
    return new CartId(value);
  }

  /**
   * Returns the underlying UUID value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks equality with another CartId by value
   * @param other - Another CartId to compare
   */
  equals(other: CartId): boolean {
    return this.value === other.value;
  }

  private validateUUID(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('CartId cannot be empty');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('CartId must be a valid UUID format');
    }
  }
}
