/**
 * Value Object: PaymentId
 * External payment transaction identifier from Payments bounded context
 * Format: PAY-{timestamp}-{random} (e.g., "PAY-20260105-ABC123")
 */
export class PaymentId {
  private readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  static fromString(value: string): PaymentId {
    return new PaymentId(value);
  }

  getValue(): string {
    return this.value;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('PaymentId cannot be empty');
    }

    // Validate format (flexible to support various payment systems)
    if (!value.startsWith('PAY-')) {
      throw new Error(`PaymentId must start with 'PAY-': ${value}`);
    }
  }

  equals(other: PaymentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
