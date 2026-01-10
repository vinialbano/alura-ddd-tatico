import { Module } from '@nestjs/common';
import { OrderModule } from '../orders/order.module';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { ORDER_GATEWAY } from './application/order-gateway.interface';
import { ProcessPaymentService } from './application/process-payment.service';
import { InProcessOrderGateway } from './infrastructure/in-process-order.gateway';
import { OrdersConsumer } from './infrastructure/orders-consumer';
import { PaymentController } from './infrastructure/payment.controller';

@Module({
  imports: [
    SharedKernelModule, // Import SharedKernelModule for contract definitions
    OrderModule, // Import OrderModule for ORDER_PAYMENT_CONTRACT implementation (no forwardRef needed)
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
