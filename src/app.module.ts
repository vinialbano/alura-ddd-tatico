import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';

import { PaymentApprovedHandler } from './application/events/handlers/payment-approved.handler';
import { PaymentApprovedPayload } from './application/events/integration-message';
import type { IMessageBus } from './application/events/message-bus.interface';
import { MESSAGE_BUS } from './application/events/message-bus.interface';
import { PaymentsConsumer } from './infrastructure/events/consumers/payments-consumer';
import { CartModule } from './infrastructure/modules/cart.module';
import { EventsModule } from './infrastructure/modules/events.module';
import { OrderModule } from './infrastructure/modules/order.module';

@Module({
  imports: [
    EventsModule, // Global module providing MESSAGE_BUS and DomainEventPublisher
    CartModule,
    OrderModule,
  ],
  providers: [
    // Consumers (simulate external bounded contexts)
    PaymentsConsumer,
    // Application handlers
    PaymentApprovedHandler,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @Inject(MESSAGE_BUS)
    private readonly messageBus: IMessageBus,
    private readonly paymentsConsumer: PaymentsConsumer,
    private readonly paymentApprovedHandler: PaymentApprovedHandler,
  ) {}

  /**
   * Initialize message bus subscriptions during application startup
   * This wires up the event-driven integration flow:
   *
   * 1. Consumers subscribe to external events (order.placed)
   * 2. Handlers subscribe to integration events (payment.approved)
   */
  onModuleInit(): void {
    // Initialize external bounded context consumers
    this.paymentsConsumer.initialize();

    // Subscribe application handlers to integration events
    this.messageBus.subscribe<PaymentApprovedPayload>(
      'payment.approved',
      async (message) => {
        const { messageId, payload } = message;
        const { orderId, paymentId } = payload;

        this.logger.debug(
          `[Infrastructure] Routing payment.approved message ${messageId} to application handler (order: ${orderId}, payment: ${paymentId})`,
        );

        try {
          await this.paymentApprovedHandler.handle(message.payload);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `[Infrastructure] Failed to handle payment.approved message ${messageId}: ${errorMessage}`,
            errorStack,
          );
          // In production, this might publish to a dead-letter queue
          throw error;
        }
      },
    );
  }
}
