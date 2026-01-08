import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CartModule } from './contexts/orders/infrastructure/modules/cart.module';
import { OrderModule } from './contexts/orders/infrastructure/modules/order.module';
import { PaymentModule } from './contexts/payments/infrastructure/modules/payment.module';
import { DomainExceptionFilter } from './contexts/orders/infrastructure/filters/domain-exception.filter';
import { SharedModule } from './shared/shared.module';
import { PaymentsConsumer } from './contexts/payments/infrastructure/events/consumers/payments-consumer';
import { OrdersConsumer } from './contexts/orders/infrastructure/events/consumers/orders-consumer';

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
    private readonly paymentsConsumer: PaymentsConsumer,
    private readonly ordersConsumer: OrdersConsumer,
  ) {}

  /**
   * Initialize message bus subscriptions during application startup
   * This wires up the event-driven integration flow:
   *
   * 1. PaymentsConsumer subscribes to order.placed events
   * 2. OrdersConsumer subscribes to payment.approved events
   */
  onModuleInit(): void {
    this.logger.log('Initializing bounded context consumers...');

    // Initialize Payments BC consumer (subscribes to order.placed)
    this.paymentsConsumer.initialize();

    // Initialize Orders BC consumer (subscribes to payment.approved)
    this.ordersConsumer.initialize();

    this.logger.log('All bounded context consumers initialized');
  }
}
