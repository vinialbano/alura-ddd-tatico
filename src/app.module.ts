import { Module } from '@nestjs/common';
import { CartModule } from './infrastructure/modules/cart.module';
import { OrderModule } from './infrastructure/modules/order.module';

@Module({
  imports: [CartModule, OrderModule],
})
export class AppModule {}
