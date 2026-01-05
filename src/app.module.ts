import { Module } from '@nestjs/common';
import { CartModule } from './infrastructure/modules/cart.module';
import { OrderModule } from './infrastructure/modules/order.module';
import { InMemoryMessageBus } from './infrastructure/events/in-memory-message-bus';
import { DomainEventPublisher } from './infrastructure/events/domain-event-publisher';
import { MESSAGE_BUS } from './application/events/message-bus.interface';

@Module({
  imports: [CartModule, OrderModule],
  providers: [
    {
      provide: MESSAGE_BUS,
      useClass: InMemoryMessageBus,
    },
    DomainEventPublisher,
  ],
  exports: [MESSAGE_BUS, DomainEventPublisher],
})
export class AppModule {}
