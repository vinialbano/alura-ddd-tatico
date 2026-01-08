export type PaymentResult =
  | { success: true; paymentId: string }
  | { success: false; reason: string };
