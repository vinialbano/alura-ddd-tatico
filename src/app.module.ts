import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CartModule } from './contexts/orders/infrastructure/modules/cart.module';
import { OrderModule } from './contexts/orders/infrastructure/modules/order.module';
import { PaymentModule } from './contexts/payments/infrastructure/modules/payment.module';
import { DomainExceptionFilter } from './contexts/orders/infrastructure/filters/domain-exception.filter';
import { SharedModule } from './shared/shared.module';
import { PaymentsConsumer } from './contexts/payments/infrastructure/events/consumers/payments-consumer';
import { PaymentApprovedHandler } from './contexts/orders/application/events/handlers/payment-approved.handler';
import type { IMessageBus } from './shared/message-bus/message-bus.interface';
import { MESSAGE_BUS } from './shared/message-bus/message-bus.interface';
import { PaymentApprovedPayload } from './shared/events/integration-message';

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
