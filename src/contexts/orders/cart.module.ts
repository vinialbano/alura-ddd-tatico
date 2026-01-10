import { Module } from '@nestjs/common';
import { CartService } from './application/services/cart.service';
import { SHOPPING_CART_REPOSITORY } from './cart.tokens';
import { CartController } from './infrastructure/controllers/cart.controller';
import { InMemoryShoppingCartRepository } from './infrastructure/repositories/in-memory-shopping-cart.repository';

// Re-export token for backward compatibility
export { SHOPPING_CART_REPOSITORY };

/**
 * CartModule
 *
 * NestJS module that wires together the cart feature
 * Controller → Service → Repository
 */
@Module({
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: SHOPPING_CART_REPOSITORY,
      useClass: InMemoryShoppingCartRepository,
    },
    {
      provide: CartService,
      useFactory: (repository: InMemoryShoppingCartRepository) => {
        return new CartService(repository);
      },
      inject: [SHOPPING_CART_REPOSITORY],
    },
  ],
  exports: [CartService, SHOPPING_CART_REPOSITORY],
})
export class CartModule {}
