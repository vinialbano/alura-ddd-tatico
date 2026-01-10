import { Global, Module } from '@nestjs/common';
import { InMemoryMessageBus } from './message-bus/in-memory-message-bus';
import { MESSAGE_BUS } from './message-bus/message-bus.interface';

/**
 * SharedModule
 *
 * Global module providing shared infrastructure services
 * like the message bus for cross-context communication
 */
@Global()
@Module({
  providers: [
    {
      provide: MESSAGE_BUS,
      useClass: InMemoryMessageBus,
    },
  ],
  exports: [MESSAGE_BUS],
})
export class SharedModule {}
