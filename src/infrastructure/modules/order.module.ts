import { Module } from '@nestjs/common';
import { OrderController } from '../controllers/order.controller';
import { CheckoutService } from '../../application/services/checkout.service';
import { OrderPricingService } from '../../domain/order/services/order-pricing.service';
import { InMemoryOrderRepository } from '../repositories/in-memory-order.repository';
import { StubCatalogGateway } from '../gateways/stub-catalog.gateway';
import { StubPricingGateway } from '../gateways/stub-pricing.gateway';
import { CartModule } from './cart.module';

// Injection tokens for interfaces
export const ORDER_REPOSITORY = 'OrderRepository';
export const CATALOG_GATEWAY = 'CatalogGateway';
export const PRICING_GATEWAY = 'PricingGateway';

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

    // Domain Services (using factory to avoid NestJS decorators in domain layer)
    {
      provide: OrderPricingService,
      useFactory: (catalogGateway, pricingGateway) => {
        return new OrderPricingService(catalogGateway, pricingGateway);
      },
      inject: [CATALOG_GATEWAY, PRICING_GATEWAY],
    },

    // Application Services (using factory)
    {
      provide: CheckoutService,
      useFactory: (cartRepository, orderRepository, pricingService) => {
        return new CheckoutService(
          cartRepository,
          orderRepository,
          pricingService,
        );
      },
      inject: ['ShoppingCartRepository', ORDER_REPOSITORY, OrderPricingService],
    },
  ],
  exports: [
    ORDER_REPOSITORY, // Export for potential use in other modules
  ],
})
export class OrderModule {}
