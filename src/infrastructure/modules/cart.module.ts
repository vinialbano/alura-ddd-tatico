import { Module } from '@nestjs/common';
import { CartController } from '../controllers/cart.controller';
import { CartService } from '../../application/services/cart.service';
import { InMemoryShoppingCartRepository } from '../repositories/in-memory-shopping-cart.repository';

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
      provide: 'ShoppingCartRepository',
      useClass: InMemoryShoppingCartRepository,
    },
    {
      provide: CartService,
      useFactory: (repository: InMemoryShoppingCartRepository) => {
        return new CartService(repository);
      },
      inject: ['ShoppingCartRepository'],
    },
  ],
  exports: [CartService, 'ShoppingCartRepository'],
})
export class CartModule {}
