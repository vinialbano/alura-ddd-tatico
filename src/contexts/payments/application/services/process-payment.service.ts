import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../../../shared/value-objects/money';
import type { IOrderGateway } from '../gateways/order-gateway.interface';
import { ORDER_GATEWAY } from '../gateways/order-gateway.interface';
import { PaymentResult } from './payment-result';

@Injectable()
export class ProcessPaymentService {
  constructor(
    @Inject(ORDER_GATEWAY)
    private readonly orderGateway: IOrderGateway,
  ) {}

  async execute(orderId: string, amount: Money): Promise<PaymentResult> {
    await this.simulateLatency();

    const validation = this.validatePayment(orderId, amount);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const paymentId = this.generatePaymentId(orderId);

    await this.orderGateway.markOrderAsPaid(orderId, paymentId);

    return { success: true, paymentId };
  }

  private simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 1500) + 500;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generatePaymentId(orderId: string): string {
    return `PAY-${orderId}`;
  }

  private validatePayment(
    orderId: string,
    amount: Money,
  ): { valid: boolean; reason: string } {
    if (amount.amount < 0.01) {
      return { valid: false, reason: 'Invalid amount' };
    }

    if (amount.amount > 10000) {
      return { valid: false, reason: 'Fraud check failed' };
    }

    const lastChar = orderId.charAt(orderId.length - 1);

    if (lastChar === '5') {
      return { valid: false, reason: 'Insufficient funds' };
    }

    if (lastChar === '9') {
      return { valid: false, reason: 'Card declined' };
    }

    return { valid: true, reason: '' };
  }
}
