import { InMemoryMessageBus } from './in-memory-message-bus';
import { IntegrationMessage } from '../../application/events/integration-message';

describe('InMemoryMessageBus', () => {
  let messageBus: InMemoryMessageBus;

  beforeEach(() => {
    messageBus = new InMemoryMessageBus();
  });

  describe('publish and subscribe', () => {
    it('should deliver message to a single subscriber', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { data: 'test' };
      const handler = jest.fn().mockResolvedValue(undefined);

      messageBus.subscribe(topic, handler);

      // Act
      await messageBus.publish(topic, payload);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          payload,
          messageId: expect.any(String) as string,
          timestamp: expect.any(Date) as Date,
          correlationId: expect.any(String) as string,
        }),
      );
    });

    it('should deliver message to multiple subscribers on same topic', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { data: 'test' };
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      messageBus.subscribe(topic, handler1);
      messageBus.subscribe(topic, handler2);

      // Act
      await messageBus.publish(topic, payload);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not deliver message to subscribers of different topics', async () => {
      // Arrange
      const topic1 = 'topic.one';
      const topic2 = 'topic.two';
      const payload = { data: 'test' };
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      messageBus.subscribe(topic1, handler1);
      messageBus.subscribe(topic2, handler2);

      // Act
      await messageBus.publish(topic1, payload);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle publishing to topic with no subscribers', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { data: 'test' };

      // Act & Assert - should not throw
      await expect(messageBus.publish(topic, payload)).resolves.toBeUndefined();
    });

    it('should generate unique messageId for each publish', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { data: 'test' };
      const messages: IntegrationMessage<typeof payload>[] = [];
      const handler = jest
        .fn()
        .mockImplementation((msg: IntegrationMessage<typeof payload>) => {
          messages.push(msg);
          return Promise.resolve();
        });

      messageBus.subscribe(topic, handler);

      // Act
      await messageBus.publish(topic, payload);
      await messageBus.publish(topic, payload);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(messages).toHaveLength(2);
      expect(messages[0].messageId).not.toBe(messages[1].messageId);
    });

    it('should deliver messages asynchronously', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { data: 'test' };
      let handlerCalled = false;
      const handler = jest.fn().mockImplementation(() => {
        handlerCalled = true;
        return Promise.resolve();
      });

      messageBus.subscribe(topic, handler);

      // Act
      await messageBus.publish(topic, payload);

      // Assert - handler should not be called synchronously
      expect(handlerCalled).toBe(false);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - handler should now be called
      expect(handlerCalled).toBe(true);
    });

    it('should extract correlationId from payload if present', async () => {
      // Arrange
      const topic = 'test.topic';
      const payload = { orderId: 'ORD-123', data: 'test' };
      const handler = jest.fn().mockResolvedValue(undefined);

      messageBus.subscribe(topic, handler);

      // Act
      await messageBus.publish(topic, payload);

      // Wait for async delivery (setTimeout 0 + extra tick)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'ORD-123',
        }),
      );
    });
  });
});
