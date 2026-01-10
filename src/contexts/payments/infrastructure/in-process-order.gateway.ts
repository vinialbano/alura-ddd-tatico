import { Inject, Injectable } from '@nestjs/common';
import { ORDER_PAYMENT_CONTRACT } from '../../shared-kernel/integration-contracts/order-payment.contract';
import type { IOrderPaymentContract } from '../../shared-kernel/integration-contracts/order-payment.contract';
import { OrderGateway } from '../application/order-gateway.interface';

/**
 * InProcessOrderGateway
 *
 * Gateway for synchronous communication with the Orders bounded context.
 * Uses the Shared Kernel contract (ORDER_PAYMENT_CONTRACT) to interact
 * with Orders BC without direct coupling to its internal implementations.
 *
 * This demonstrates:
 * - Shared Kernel pattern (strategic DDD)
 * - Synchronous cross-context integration
 * - Dependency on contract, not implementation
 */
@Injectable()
export class InProcessOrderGateway implements OrderGateway {
  constructor(
    @Inject(ORDER_PAYMENT_CONTRACT)
    private readonly orderPaymentContract: IOrderPaymentContract,
  ) {}

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    // Delegate to the contract implementation provided by Orders BC
    await this.orderPaymentContract.markOrderAsPaid({
      orderId,
      paymentId,
      approvedAmount: 0, // Stub value for educational purposes
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }
}
