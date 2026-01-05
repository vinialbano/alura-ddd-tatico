import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IMessageBus,
  IntegrationMessage,
} from '../../application/events/message-bus.interface';

type MessageHandler<T = any> = (
  message: IntegrationMessage<T>,
) => Promise<void>;

/**
 * In-Memory Message Bus Implementation
 * Simple topic-based pub/sub for educational DDD demonstration
 * Uses Map for topic routing and setTimeout for async delivery
 */
@Injectable()
export class InMemoryMessageBus implements IMessageBus {
  private readonly subscribers = new Map<string, Set<MessageHandler>>();

  publish<T>(topic: string, payload: T): Promise<void> {
    const handlers = this.subscribers.get(topic);
    if (!handlers || handlers.size === 0) {
      // No subscribers, message is dropped (fire-and-forget)
      return Promise.resolve();
    }

    const message = this.createEnvelope(topic, payload);

    // Simulate async processing with setTimeout to preserve call stack for errors
    handlers.forEach((handler) => {
      setTimeout(() => {
        handler(message).catch((error) => {
          console.error(
            `[MessageBus] Error in handler for topic '${topic}':`,
            error,
          );
        });
      }, 0);
    });

    return Promise.resolve();
  }

  subscribe<T>(
    topic: string,
    handler: (message: IntegrationMessage<T>) => Promise<void>,
  ): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler as MessageHandler);
  }

  private createEnvelope<T>(topic: string, payload: T): IntegrationMessage<T> {
    return {
      messageId: randomUUID(),
      topic,
      timestamp: new Date(),
      payload,
      correlationId: this.extractCorrelationId(payload),
    };
  }

  private extractCorrelationId(payload: unknown): string {
    // Extract orderId from payload if present, otherwise generate UUID
    if (
      payload &&
      typeof payload === 'object' &&
      'orderId' in payload &&
      typeof payload.orderId === 'string'
    ) {
      return payload.orderId;
    }
    return randomUUID();
  }
}
