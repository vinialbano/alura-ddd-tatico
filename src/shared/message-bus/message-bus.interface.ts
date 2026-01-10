import type { IntegrationMessage } from '../events/integration-message';

// Re-export for convenience
export type { IntegrationMessage };

/**
 * Message Bus Interface (Anti-Corruption Layer)
 * Pub/sub abstraction for cross-bounded-context communication
 */
export interface IMessageBus {
  publish<T>(topic: string, payload: T): Promise<void>;

  /**
   * Multiple subscribers per topic are supported
   */
  subscribe<T>(
    topic: string,
    handler: (message: IntegrationMessage<T>) => Promise<void>,
  ): void;
}

// Provider token for dependency injection
export const MESSAGE_BUS = Symbol('IMessageBus');
