import { randomUUID } from 'crypto';
import { StringId } from './string-id.base';

/**
 * UuidId Base Class
 *
 * Abstract base class for UUID-based identifier value objects.
 * Extends StringId and adds UUID format validation and generation.
 *
 * Subclasses should extend this to create specific UUID-based ID types:
 * - OrderId extends UuidId
 * - CartId extends UuidId
 * - EventId extends UuidId
 *
 * @abstract
 */
export abstract class UuidId extends StringId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  protected constructor(value: string) {
    super(value); // Validates non-empty via StringId
    this.validateUuidFormat(value);
    // Override value with lowercase normalized version
    (this as { value: string }).value = value.toLowerCase();
  }

  /**
   * Generates a new UUID string using crypto.randomUUID()
   * Protected static method for use by subclasses
   */
  protected static generateUuid(): string {
    return randomUUID();
  }

  /**
   * Validates that the value matches UUID v4 format
   * @param value - The value to validate
   * @throws Error if value is not a valid UUID format
   */
  private validateUuidFormat(value: string): void {
    if (!UuidId.UUID_REGEX.test(value)) {
      throw new Error('Invalid UUID format');
    }
  }
}
