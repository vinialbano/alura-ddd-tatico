import { Injectable } from '@nestjs/common';
import {
  IOrderPaymentContract,
  MarkOrderAsPaidRequest,
} from '../../../shared-kernel/integration-contracts/order-payment.contract';
import { PaymentApprovedHandler } from '../events/payment-approved.handler';

/**
 * OrderPaymentAdapter
 *
 * Adapter that implements the Shared Kernel contract for order-payment integration.
 *
 * This adapter provides a synchronous API for Payments BC to mark orders as paid,
 * wrapping the existing PaymentApprovedHandler from the event-driven architecture.
 *
 * Pattern: Adapter Pattern
 * - Adapts internal handler to external contract
 * - Allows Orders BC to control how the contract is fulfilled
 * - Isolates internal implementation details
 */
@Injectable()
export class OrderPaymentAdapter implements IOrderPaymentContract {
  constructor(private readonly paymentApprovedHandler: PaymentApprovedHandler) {}

  async markOrderAsPaid(request: MarkOrderAsPaidRequest): Promise<void> {
    // Delegate to existing handler
    // This reuses the same business logic whether called:
    // 1. Synchronously via this adapter (direct call)
    // 2. Asynchronously via PaymentsConsumer (message bus)
    await this.paymentApprovedHandler.handle({
      orderId: request.orderId,
      paymentId: request.paymentId,
      approvedAmount: request.approvedAmount,
      currency: request.currency,
      timestamp: request.timestamp,
    });
  }
}
