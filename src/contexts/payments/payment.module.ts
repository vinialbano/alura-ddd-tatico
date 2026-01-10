import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ORDER_GATEWAY } from './application/order-gateway.interface';
import { ProcessPaymentService } from './application/process-payment.service';
import { InProcessOrderGateway } from './infrastructure/in-process-order.gateway';
import { OrdersConsumer } from './infrastructure/orders-consumer';
import { PaymentController } from './infrastructure/payment.controller';

@Module({
  imports: [
    OrdersModule, // Import OrdersModule for ORDER_PAYMENT_CONTRACT implementation
  ],
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
