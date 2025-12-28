import { Module } from '@nestjs/common';
import { CartModule } from './infrastructure/modules/cart.module';

@Module({
  imports: [CartModule],
})
export class AppModule {}
