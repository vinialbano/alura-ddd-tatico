import { StringId } from '../../domain/shared/base/string-id.base';

/**
 * Value Object: PaymentId
 * External payment transaction identifier from Payments bounded context.
 * Format: PAY-{timestamp}-{random} (e.g., "PAY-20260105-ABC123")
 */
export class PaymentId extends StringId {
  constructor(value: string) {
    super(value);
    if (!value.startsWith('PAY-')) {
      throw new Error(`PaymentId must start with 'PAY-': ${value}`);
    }
  }

  static fromString(value: string): PaymentId {
    return new PaymentId(value);
  }
}
