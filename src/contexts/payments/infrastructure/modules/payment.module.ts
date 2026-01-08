import { Module } from '@nestjs/common';
import { ProcessPaymentService } from '../../application/services/process-payment.service';
import { PaymentController } from '../controllers/payment.controller';
import { InProcessOrderGateway } from '../gateways/in-process-order.gateway';
import { PaymentsConsumer } from '../events/consumers/payments-consumer';
import { ORDER_GATEWAY } from '../../application/gateways/order-gateway.interface';

@Module({
  imports: [], // Will import OrderModule later
  controllers: [PaymentController],
  providers: [
    ProcessPaymentService,
    PaymentsConsumer,
    {
      provide: ORDER_GATEWAY,
      useClass: InProcessOrderGateway,
    },
  ],
  exports: [PaymentsConsumer],
})
export class PaymentModule {}
