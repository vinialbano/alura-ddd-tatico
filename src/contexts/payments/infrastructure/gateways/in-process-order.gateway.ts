import { Injectable } from '@nestjs/common';
import { IOrderGateway } from '../../application/gateways/order-gateway.interface';

@Injectable()
export class InProcessOrderGateway implements IOrderGateway {
  // Will inject PaymentApprovedHandler after Orders BC is set up
  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    // TODO: Wire to PaymentApprovedHandler
    throw new Error('Not yet implemented - will be wired in Phase 4');
  }
}
