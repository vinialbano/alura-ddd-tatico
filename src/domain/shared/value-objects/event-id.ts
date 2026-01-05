import { randomUUID } from 'crypto';

/**
 * Value Object: EventId
 * Unique identifier for domain events to support idempotency checks and event tracing
 */
export class EventId {
  private readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value.toLowerCase();
  }

  static generate(): EventId {
    return new EventId(randomUUID());
  }

  static fromString(value: string): EventId {
    return new EventId(value);
  }

  getValue(): string {
    return this.value;
  }

  private validate(value: string): void {
    // UUID v4 regex pattern
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Invalid UUID format for EventId');
    }
  }

  equals(other: EventId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
