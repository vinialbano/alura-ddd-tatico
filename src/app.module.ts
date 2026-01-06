import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { EventsModule } from './infrastructure/modules/events.module';
import { CartModule } from './infrastructure/modules/cart.module';
import { OrderModule } from './infrastructure/modules/order.module';
import type { IMessageBus } from './application/events/message-bus.interface';
import { MESSAGE_BUS } from './application/events/message-bus.interface';
import { PaymentsConsumer } from './infrastructure/events/consumers/payments-consumer';
import { StockConsumer } from './infrastructure/events/consumers/stock-consumer';
import { PaymentApprovedHandler } from './application/events/handlers/payment-approved.handler';
import { StockReservedHandler } from './application/events/handlers/stock-reserved.handler';
import { PaymentApprovedInfrastructureHandler } from './infrastructure/order/event-handlers/payment-approved.handler';
import { StockReservedInfrastructureHandler } from './infrastructure/order/event-handlers/stock-reserved.handler';

@Module({
  imports: [
    EventsModule, // Global module providing MESSAGE_BUS and DomainEventPublisher
    CartModule,
    OrderModule,
  ],
  providers: [
    // Consumers (simulate external bounded contexts)
    PaymentsConsumer,
    StockConsumer,
    // Application handlers
    PaymentApprovedHandler,
    StockReservedHandler,
    // Infrastructure handler adapters
    PaymentApprovedInfrastructureHandler,
    StockReservedInfrastructureHandler,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
    private readonly paymentsConsumer: PaymentsConsumer,
    private readonly stockConsumer: StockConsumer,
    private readonly paymentApprovedInfraHandler: PaymentApprovedInfrastructureHandler,
    private readonly stockReservedInfraHandler: StockReservedInfrastructureHandler,
  ) {}

  /**
   * Initialize message bus subscriptions during application startup
   * This wires up the event-driven integration flow:
   *
   * 1. Consumers subscribe to external events (order.placed → order.paid)
   * 2. Handlers subscribe to integration events (payment.approved, stock.reserved)
   */
  async onModuleInit(): Promise<void> {
    // Initialize external bounded context consumers
    this.paymentsConsumer.initialize();
    this.stockConsumer.initialize();

    // Subscribe infrastructure handlers to integration events
    this.messageBus.subscribe(
      'payment.approved',
      this.paymentApprovedInfraHandler.handle.bind(
        this.paymentApprovedInfraHandler,
      ),
    );

    this.messageBus.subscribe(
      'stock.reserved',
      this.stockReservedInfraHandler.handle.bind(
        this.stockReservedInfraHandler,
      ),
    );
  }
}
