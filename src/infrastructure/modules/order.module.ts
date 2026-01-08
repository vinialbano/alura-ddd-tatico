import { Module } from '@nestjs/common';
import { CatalogGateway } from 'src/application/gateways/catalog.gateway.interface';
import { IPaymentGateway } from 'src/application/gateways/payment-gateway.interface';
import { PricingGateway } from 'src/application/gateways/pricing.gateway.interface';
import { OrderRepository } from 'src/domain/order/order.repository';
import { ShoppingCartRepository } from 'src/domain/shopping-cart/shopping-cart.repository';
import { CheckoutService } from '../../application/services/checkout.service';
import { ConfirmPaymentService } from '../../application/services/confirm-payment.service';
import { OrderService } from '../../application/services/order.service';
import { OrderCreationService } from '../../domain/order/services/order-creation.service';
import { OrderPricingService } from '../../domain/order/services/order-pricing.service';
import { OrderController } from '../controllers/order.controller';
import { DomainEventPublisher } from '../events/domain-event-publisher';
import { StubCatalogGateway } from '../gateways/stub-catalog.gateway';
import { StubPaymentGateway } from '../gateways/stub-payment.gateway';
import { StubPricingGateway } from '../gateways/stub-pricing.gateway';
import { InMemoryOrderRepository } from '../repositories/in-memory-order.repository';
import { CartModule, SHOPPING_CART_REPOSITORY } from './cart.module';

// Injection tokens for interfaces
export const ORDER_REPOSITORY = 'OrderRepository';
export const CATALOG_GATEWAY = 'CatalogGateway';
export const PRICING_GATEWAY = 'PricingGateway';
export const PAYMENT_GATEWAY = 'PaymentGateway';

/**
 * OrderModule
 *
 * NestJS module for order bounded context
 * Wires all dependencies via dependency injection
 */
@Module({
  imports: [
    CartModule, // Import CartModule for ShoppingCartRepository
  ],
  controllers: [OrderController],
  providers: [
    // Repositories (Infrastructure → Domain Interface)
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },

    // Gateways (Infrastructure → Application Interface)
    {
      provide: CATALOG_GATEWAY,
      useClass: StubCatalogGateway,
    },
    {
      provide: PRICING_GATEWAY,
      useClass: StubPricingGateway,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: StubPaymentGateway,
    },

    // Domain Services (using factory to avoid NestJS decorators in domain layer)
    {
      provide: OrderPricingService,
      useFactory: (
        catalogGateway: CatalogGateway,
        pricingGateway: PricingGateway,
      ) => {
        return new OrderPricingService(catalogGateway, pricingGateway);
      },
      inject: [CATALOG_GATEWAY, PRICING_GATEWAY],
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
    {
      provide: ConfirmPaymentService,
      useFactory: (
        orderRepository: OrderRepository,
        paymentGateway: IPaymentGateway,
      ) => {
        return new ConfirmPaymentService(orderRepository, paymentGateway);
      },
      inject: [ORDER_REPOSITORY, PAYMENT_GATEWAY],
    },
  ],
  exports: [
    ORDER_REPOSITORY, // Export for potential use in other modules
  ],
})
export class OrderModule {}
