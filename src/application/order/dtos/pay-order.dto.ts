/**
 * DTO for payment request
 *
 * Currently empty because payment details are abstracted by the stubbed gateway.
 * In a real implementation, this would include:
 * - Payment method details (credit card, bank account, etc.)
 * - Billing address
 * - Payment provider-specific fields
 *
 * For this educational project, the gateway determines payment success/failure
 * based on order ID patterns.
 */
export class PayOrderDto {
  // Empty body for now - payment details abstracted by stubbed gateway
}
