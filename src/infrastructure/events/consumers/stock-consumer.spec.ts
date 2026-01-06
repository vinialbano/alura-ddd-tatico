import { StockConsumer } from './stock-consumer';
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderCancelledPayload,
  OrderPaidPayload,
} from '../../../application/events/integration-message';

describe('StockConsumer', () => {
  let consumer: StockConsumer;
  let mockMessageBus: jest.Mocked<IMessageBus>;
  let orderPaidHandler: (
    message: IntegrationMessage<OrderPaidPayload>,
  ) => Promise<void>;
  let orderCancelledHandler: (
    message: IntegrationMessage<OrderCancelledPayload>,
  ) => Promise<void>;

  beforeEach(() => {
    mockMessageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn((topic, handler) => {
        if (topic === 'order.paid') {
          orderPaidHandler = handler;
        } else if (topic === 'order.cancelled') {
          orderCancelledHandler = handler;
        }
      }),
    } as any;

    consumer = new StockConsumer(mockMessageBus);
    consumer.initialize();
  });

  describe('order.paid subscription (T032)', () => {
    it('should subscribe to order.paid topic on initialization', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        'order.paid',
        expect.any(Function),
      );
    });

    it('should publish stock.reserved message after processing order.paid', async () => {
      // Arrange
      const orderPaidMessage: IntegrationMessage<OrderPaidPayload> = {
        messageId: 'msg-paid-001',
        topic: 'order.paid',
        timestamp: new Date(),
        correlationId: 'order-123',
        payload: {
          orderId: 'order-123',
          paymentId: 'payment-456',
          amount: 49.98,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await orderPaidHandler(orderPaidMessage);

      // Wait for async setTimeout to complete
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        'stock.reserved',
        expect.objectContaining({
          orderId: 'order-123',
          reservationId: expect.stringMatching(/^reservation-/),
          items: expect.any(Array),
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('order.cancelled subscription (T039)', () => {
    it('should subscribe to order.cancelled topic on initialization', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        'order.cancelled',
        expect.any(Function),
      );
    });

    it('should log stock release when order.cancelled is received', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      const orderCancelledMessage: IntegrationMessage<OrderCancelledPayload> = {
        messageId: 'msg-cancel-001',
        topic: 'order.cancelled',
        timestamp: new Date(),
        correlationId: 'order-123',
        payload: {
          orderId: 'order-123',
          reason: 'Customer requested cancellation',
          previousStatus: 'AWAITING_PAYMENT',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await orderCancelledHandler(orderCancelledMessage);

      // Assert - verify cancellation is logged (no stock to release for AWAITING_PAYMENT)
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INVENTORY BC]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('order-123'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No stock to release'),
      );
    });

    it('should handle order.cancelled for STOCK_RESERVED orders (release scenario)', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      const orderCancelledMessage: IntegrationMessage<OrderCancelledPayload> = {
        messageId: 'msg-cancel-002',
        topic: 'order.cancelled',
        timestamp: new Date(),
        correlationId: 'order-456',
        payload: {
          orderId: 'order-456',
          reason: 'Customer changed mind',
          previousStatus: 'STOCK_RESERVED',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await orderCancelledHandler(orderCancelledMessage);

      // Assert - verify stock is released for reserved order
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INVENTORY BC]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE'),
      );
    });
  });
});
