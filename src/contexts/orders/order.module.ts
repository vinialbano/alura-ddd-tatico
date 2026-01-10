import { Module } from '@nestjs/common';
import { DomainEventPublisher } from '../../shared/events/domain-event-publisher';
import { ORDER_PAYMENT_CONTRACT } from '../shared-kernel/integration-contracts/order-payment.contract';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { PaymentApprovedHandler } from './application/events/payment-approved.handler';
import { PricingGateway } from './application/gateways/pricing.gateway.interface';
import { OrderPaymentAdapter } from './application/integration/order-payment.adapter';
import { CheckoutService } from './application/services/checkout.service';
import { OrderService } from './application/services/order.service';
import { CartModule, SHOPPING_CART_REPOSITORY } from './cart.module';
import { OrderRepository } from './domain/order/order.repository';
import { OrderCreationService } from './domain/order/services/order-creation.service';
import { OrderPricingService } from './domain/order/services/order-pricing.service';
import { ShoppingCartRepository } from './domain/shopping-cart/shopping-cart.repository';
import { OrderController } from './infrastructure/controllers/order.controller';
import { PaymentsConsumer } from './infrastructure/events/consumers/payments-consumer';
import { StubPricingGateway } from './infrastructure/gateways/stub-pricing.gateway';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order.repository';
import { ORDER_REPOSITORY, PRICING_GATEWAY } from './order.tokens';

// Re-export tokens for backward compatibility
export { ORDER_REPOSITORY, PRICING_GATEWAY };

/**
 * OrderModule
 *
 * NestJS module for order bounded context
 * Wires all dependencies via dependency injection
 */
@Module({
  imports: [
    SharedKernelModule, // Import SharedKernelModule for contract definitions
    CartModule, // Import CartModule for ShoppingCartRepository
  ],
  controllers: [OrderController],
  providers: [
    // Infrastructure services
    DomainEventPublisher,

    // Repositories (Infrastructure → Domain Interface)
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },

    // Gateways (Infrastructure → Application Interface)
    {
      provide: PRICING_GATEWAY,
      useClass: StubPricingGateway,
    },

    // Domain Services (using factory to avoid NestJS decorators in domain layer)
    {
      provide: OrderPricingService,
      useFactory: (pricingGateway: PricingGateway) => {
        return new OrderPricingService(pricingGateway);
      },
      inject: [PRICING_GATEWAY],
    },
    {
      provide: OrderCreationService,
      useClass: OrderCreationService,
    },

    // Application Services (using factory)
    {
      provide: CheckoutService,
      useFactory: (
        cartRepository: ShoppingCartRepository,
        orderRepository: OrderRepository,
        pricingService: OrderPricingService,
        orderCreationService: OrderCreationService,
        eventPublisher: DomainEventPublisher,
      ) => {
        return new CheckoutService(
          cartRepository,
          orderRepository,
          pricingService,
          orderCreationService,
          eventPublisher,
        );
      },
      inject: [
        SHOPPING_CART_REPOSITORY,
        ORDER_REPOSITORY,
        OrderPricingService,
        OrderCreationService,
        DomainEventPublisher,
      ],
    },
    {
      provide: OrderService,
      useFactory: (orderRepository: OrderRepository) => {
        return new OrderService(orderRepository);
      },
      inject: [ORDER_REPOSITORY],
    },

    // Event Handlers (using NestJS automatic DI since they're @Injectable)
    PaymentApprovedHandler,

    // Event Consumers
    PaymentsConsumer,

    // Shared Kernel Contract Implementation
    // Provides synchronous integration API for Payments BC
    OrderPaymentAdapter,
    {
      provide: ORDER_PAYMENT_CONTRACT,
      useExisting: OrderPaymentAdapter,
    },
  ],
  exports: [
    ORDER_REPOSITORY, // Export for potential use in other modules
    ORDER_PAYMENT_CONTRACT, // Export Shared Kernel contract for Payments BC (sync integration)
    PaymentsConsumer, // Export for AppModule initialization
  ],
})
export class OrderModule {}
