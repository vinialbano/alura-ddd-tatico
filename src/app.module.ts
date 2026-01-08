import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CartModule } from './contexts/orders/infrastructure/modules/cart.module';
import { OrderModule } from './contexts/orders/infrastructure/modules/order.module';
import { PaymentModule } from './contexts/payments/infrastructure/modules/payment.module';
import { DomainExceptionFilter } from './contexts/orders/infrastructure/filters/domain-exception.filter';
import { SharedModule } from './shared/shared.module';
import { OrdersConsumer } from './contexts/payments/infrastructure/events/consumers/orders-consumer';
import { PaymentsConsumer } from './contexts/orders/infrastructure/events/consumers/payments-consumer';

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
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly ordersConsumer: OrdersConsumer,
    private readonly paymentsConsumer: PaymentsConsumer,
  ) {}

  /**
   * Initialize message bus subscriptions during application startup
   * This wires up the event-driven integration flow:
   *
   * 1. OrdersConsumer (in Payments BC) subscribes to order.placed events
   * 2. PaymentsConsumer (in Orders BC) subscribes to payment.approved events
   */
  onModuleInit(): void {
    this.logger.log('Initializing bounded context consumers...');

    // Initialize OrdersConsumer in Payments BC (subscribes to order.placed)
    this.ordersConsumer.initialize();

    // Initialize PaymentsConsumer in Orders BC (subscribes to payment.approved)
    this.paymentsConsumer.initialize();

    this.logger.log('All bounded context consumers initialized');
  }
}
