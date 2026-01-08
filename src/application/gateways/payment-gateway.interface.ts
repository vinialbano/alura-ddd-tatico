import { OrderId } from '../../shared/value-objects/order-id';
import { Money } from '../../shared/value-objects/money';
import { PaymentResult } from './payment-result';

/**
 * Payment Gateway Interface (Anti-Corruption Layer)
 *
 * Defines the contract for external payment processing systems.
 * Implementations handle communication with payment providers (Stripe, PayPal, etc.)
 * while isolating the domain from external API changes.
 *
 * This interface belongs in the Application layer because it defines a use case
 * boundary, not domain logic. The gateway translates between domain types
 * (OrderId, Money) and external payment provider APIs.
 */
export interface IPaymentGateway {
  /**
   * Process a payment for an order
   *
   * @param orderId - Order identifier for tracking
   * @param amount - Payment amount with currency
   * @returns Promise resolving to payment result (success with ID or failure with reason)
   */
  processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult>;
}
