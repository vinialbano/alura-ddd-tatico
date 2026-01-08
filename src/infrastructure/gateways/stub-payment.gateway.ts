import { Injectable } from '@nestjs/common';
import { IPaymentGateway } from '../../application/gateways/payment-gateway.interface';
import { PaymentResult } from '../../application/gateways/payment-result';
import { Money } from '../../domain/order/value-objects/money';
import { OrderId } from '../../domain/order/value-objects/order-id';

/**
 * Stubbed Payment Gateway Implementation
 *
 * Simulates external payment processing for educational/testing purposes.
 * Uses deterministic patterns based on order ID and amount for predictable testing.
 *
 * **Test Patterns (based on orderId last character)**:
 * - Ending in "0": ✅ Approval with paymentId "PAY-{orderId}"
 * - Ending in "5": ❌ Rejection "Insufficient funds"
 * - Ending in "9": ❌ Rejection "Card declined"
 *
 * **Amount-based Patterns**:
 * - Amount < $0.01: ❌ Rejection "Invalid amount"
 * - Amount > $10,000: ❌ Rejection "Fraud check failed"
 *
 * **Latency Simulation**: 500ms-2s random delay
 *
 * @example
 * ```typescript
 * // Order ID ending in "0" will be approved
 * const result = await gateway.processPayment(
 *   new OrderId('550e8400-e29b-41d4-a716-446655440000'),
 *   new Money(100, 'USD')
 * );
 * // result = { success: true, paymentId: 'PAY-550e8400-e29b-41d4-a716-446655440000' }
 * ```
 */
@Injectable()
export class StubPaymentGateway implements IPaymentGateway {
  async processPayment(
    orderId: OrderId,
    amount: Money,
  ): Promise<PaymentResult> {
    // Simulate network latency (500ms to 2000ms)
    await this.simulateLatency();

    const orderIdString = orderId.getValue();
    const amountValue = amount.amount;

    // Amount-based rejection patterns
    if (amountValue < 0.01) {
      return {
        success: false,
        reason: 'Invalid amount',
      };
    }

    if (amountValue > 10000) {
      return {
        success: false,
        reason: 'Fraud check failed',
      };
    }

    // Order ID-based patterns (last character)
    const lastChar = orderIdString.charAt(orderIdString.length - 1);

    if (lastChar === '5') {
      return {
        success: false,
        reason: 'Insufficient funds',
      };
    }

    if (lastChar === '9') {
      return {
        success: false,
        reason: 'Card declined',
      };
    }

    // Default: approval (including orderId ending in "0")
    return {
      success: true,
      paymentId: `PAY-${orderIdString}`,
    };
  }

  /**
   * Simulate network latency for realistic testing
   * Random delay between 500ms and 2000ms
   */
  private async simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 1500) + 500; // 500-2000ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
