import { Injectable } from '@nestjs/common';
import {
  IOrderPaymentContract,
  MarkOrderAsPaidRequest,
} from './order-payment.contract';
import { OrderService } from '../services/order.service';

/**
 * OrderPaymentAdapter
 *
 * Adapter that implements the Shared Kernel contract for order-payment integration.
 *
 * This adapter provides a synchronous API for Payments BC to mark orders as paid,
 * using the OrderService application service.
 *
 * Pattern: Adapter Pattern
 * - Adapts internal application service to external contract
 * - Allows Orders BC to control how the contract is fulfilled
 * - Isolates internal implementation details
 */
@Injectable()
export class OrderPaymentAdapter implements IOrderPaymentContract {
  constructor(private readonly orderService: OrderService) {}

  async markOrderAsPaid(request: MarkOrderAsPaidRequest): Promise<void> {
    // Delegate to OrderService
    // This uses the synchronous application service flow
    // For async event-driven flow, see PaymentApprovedHandler
    await this.orderService.markAsPaid(request.orderId, request.paymentId);
  }
}
