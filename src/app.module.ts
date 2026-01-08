import { Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CartModule } from './contexts/orders/infrastructure/modules/cart.module';
import { OrderModule } from './contexts/orders/infrastructure/modules/order.module';
import { PaymentModule } from './contexts/payments/infrastructure/modules/payment.module';
import { DomainExceptionFilter } from './contexts/orders/infrastructure/filters/domain-exception.filter';
import { SharedModule } from './shared/shared.module';
import { PaymentsConsumer } from './contexts/payments/infrastructure/events/consumers/payments-consumer';

@Module({
  imports: [SharedModule, CartModule, OrderModule, PaymentModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly paymentsConsumer: PaymentsConsumer) {}

  onModuleInit() {
    this.paymentsConsumer.initialize();
  }
}
