import { Module } from '@nestjs/common';
import { CartController } from '../controllers/cart.controller';
import { CartService } from '../../application/services/cart.service';
import { InMemoryShoppingCartRepository } from '../repositories/in-memory-shopping-cart.repository';

// Injection token for ShoppingCartRepository interface
export const SHOPPING_CART_REPOSITORY = 'ShoppingCartRepository';

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
