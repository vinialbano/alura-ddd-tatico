import { Module } from '@nestjs/common';
import { OrderModule } from '../../../orders/infrastructure/modules/order.module';
import { ProcessPaymentService } from '../../application/services/process-payment.service';
import { PaymentController } from '../controllers/payment.controller';
import { InProcessOrderGateway } from '../gateways/in-process-order.gateway';
import { OrdersConsumer } from '../events/consumers/orders-consumer';
import { ORDER_GATEWAY } from '../../application/gateways/order-gateway.interface';

@Module({
  imports: [OrderModule],
  controllers: [PaymentController],
  providers: [
    ProcessPaymentService,
    OrdersConsumer,
    {
      provide: ORDER_GATEWAY,
      useClass: InProcessOrderGateway,
    },
  ],
  exports: [OrdersConsumer],
})
export class PaymentModule {}
