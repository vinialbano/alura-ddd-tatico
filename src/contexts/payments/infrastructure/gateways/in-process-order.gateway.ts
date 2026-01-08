import { Injectable } from '@nestjs/common';
import { PaymentApprovedHandler } from '../../../orders/application/events/handlers/payment-approved.handler';
import { IOrderGateway } from '../../application/gateways/order-gateway.interface';

@Injectable()
export class InProcessOrderGateway implements IOrderGateway {
  constructor(
    private readonly paymentApprovedHandler: PaymentApprovedHandler,
  ) {}

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    await this.paymentApprovedHandler.handle({
      orderId,
      paymentId,
      approvedAmount: 0,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }
}
