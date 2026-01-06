/**
 * Value Object: ReservationId
 * External stock reservation identifier from Stock bounded context
 * Format: RSV-{timestamp}-{random} (e.g., "RSV-20260105-XYZ789")
 */
export class ReservationId {
  private readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  static fromString(value: string): ReservationId {
    return new ReservationId(value);
  }

  getValue(): string {
    return this.value;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ReservationId cannot be empty');
    }

    // Validate format (flexible to support various stock systems)
    if (!value.startsWith('RSV-')) {
      throw new Error(`ReservationId must start with 'RSV-': ${value}`);
    }
  }

  equals(other: ReservationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
