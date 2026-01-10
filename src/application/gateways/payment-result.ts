/**
 * Result type for payment processing operations
 *
 * Represents the outcome of a payment attempt through the payment gateway.
 * Uses a discriminated union to ensure type-safe handling of success/failure cases.
 */
export type PaymentResult =
  | {
      success: true;
      paymentId: string;
    }
  | {
      success: false;
      reason: string;
    };
