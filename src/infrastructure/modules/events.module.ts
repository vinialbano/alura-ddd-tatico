import { Module, Global } from '@nestjs/common';
import { MESSAGE_BUS } from '../../shared/message-bus/message-bus.interface';
import { InMemoryMessageBus } from '../events/in-memory-message-bus';
import { DomainEventPublisher } from '../events/domain-event-publisher';

/**
 * EventsModule
 *
 * Global module providing event infrastructure:
 * - Message Bus (IMessageBus implementation)
 * - Domain Event Publisher
 *
 * @Global decorator makes these providers available throughout the application
 * without needing to import EventsModule in every module.
 */
@Global()
@Module({
  providers: [
    {
      provide: MESSAGE_BUS,
      useClass: InMemoryMessageBus,
    },
    DomainEventPublisher,
  ],
  exports: [MESSAGE_BUS, DomainEventPublisher],
})
export class EventsModule {}
