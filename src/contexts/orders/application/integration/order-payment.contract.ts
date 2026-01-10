/**
 * Order-Payment Integration Contract
 *
 * Shared Kernel contract defining synchronous communication
 * between Orders and Payments bounded contexts.
 *
 * This interface lives in the Shared Kernel - a strategic DDD pattern
 * where both contexts agree on common contracts for direct integration.
 *
 * Use cases:
 * - Synchronous payment approval notification (direct call)
 * - Complements the async event-driven integration via message bus
 */

export interface MarkOrderAsPaidRequest {
  orderId: string;
  paymentId: string;
  approvedAmount: number;
  currency: string;
  timestamp: string;
}

/**
 * Contract for synchronous order-payment integration
 *
 * Implementation: Provided by Orders BC
 * Consumer: Used by Payments BC for direct calls
 *
 * This is a direct call integration pattern, different from
 * the async event-driven pattern using the message bus.
 */
export interface IOrderPaymentContract {
  markOrderAsPaid(request: MarkOrderAsPaidRequest): Promise<void>;
}

/**
 * Injection token for the contract
 */
export const ORDER_PAYMENT_CONTRACT = 'IOrderPaymentContract';
