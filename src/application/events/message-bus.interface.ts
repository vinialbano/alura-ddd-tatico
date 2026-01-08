import type { IntegrationMessage } from '../../shared/events/integration-message';

// Re-export for convenience
export type { IntegrationMessage };

/**
 * Message Bus Interface (Anti-Corruption Layer)
 * Pub/sub abstraction for cross-bounded-context communication
 */
export interface IMessageBus {
  /**
   * Publish a message to a topic
   * @param topic Message topic (e.g., "order.placed", "payment.approved")
   * @param payload Domain-specific message payload (JSON-serializable)
   */
  publish<T>(topic: string, payload: T): Promise<void>;

  /**
   * Subscribe a handler to a topic
   * Multiple subscribers per topic are supported
   * @param topic Message topic to subscribe to
   * @param handler Async handler function to process messages
   */
  subscribe<T>(
    topic: string,
    handler: (message: IntegrationMessage<T>) => Promise<void>,
  ): void;
}

// Provider token for dependency injection
export const MESSAGE_BUS = Symbol('IMessageBus');
