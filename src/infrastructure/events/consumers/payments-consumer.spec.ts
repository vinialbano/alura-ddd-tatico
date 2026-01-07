import { PaymentsConsumer } from './payments-consumer';
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderCancelledPayload,
  OrderPlacedPayload,
} from '../../../application/events/integration-message';

describe('PaymentsConsumer', () => {
  let consumer: PaymentsConsumer;
  let mockMessageBus: jest.Mocked<IMessageBus>;
  let orderPlacedHandler: (
    message: IntegrationMessage<OrderPlacedPayload>,
  ) => Promise<void>;
  let orderCancelledHandler: (
    message: IntegrationMessage<OrderCancelledPayload>,
  ) => Promise<void>;

  beforeEach(() => {
    mockMessageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn((topic: string, handler: any) => {
        if (topic === 'order.placed') {
          orderPlacedHandler = handler as (
            message: IntegrationMessage<OrderPlacedPayload>,
          ) => Promise<void>;
        } else if (topic === 'order.cancelled') {
          orderCancelledHandler = handler as (
            message: IntegrationMessage<OrderCancelledPayload>,
          ) => Promise<void>;
        }
      }),
    } as IMessageBus;

    consumer = new PaymentsConsumer(mockMessageBus);
    consumer.initialize();
  });

  describe('order.placed subscription (T031)', () => {
    it('should subscribe to order.placed topic on initialization', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        'order.placed',
        expect.any(Function),
      );
    });

    it('should publish payment.approved message after processing order.placed', async () => {
      // Arrange
      const orderPlacedMessage: IntegrationMessage<OrderPlacedPayload> = {
        messageId: 'msg-001',
        topic: 'order.placed',
        timestamp: new Date(),
        correlationId: 'order-123',
        payload: {
          orderId: 'order-123',
          customerId: 'customer-456',
          cartId: 'cart-789',
          items: [
            {
              productId: 'COFFEE-COL-001',
              productName: 'Premium Coffee',
              quantity: 2,
              unitPrice: 24.99,
            },
          ],
          totalAmount: 49.98,
          currency: 'USD',
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701',
            country: 'USA',
          },
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await orderPlacedHandler(orderPlacedMessage);

      // Wait for async setTimeout to complete
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        'payment.approved',
        expect.objectContaining({
          orderId: 'order-123',
          approvedAmount: 49.98,
          currency: 'USD',
          paymentId: expect.stringMatching(/^payment-/) as string,
          timestamp: expect.any(String) as string,
        }),
      );
    });
  });

  describe('order.cancelled subscription (T038)', () => {
    it('should subscribe to order.cancelled topic on initialization', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        'order.cancelled',
        expect.any(Function),
      );
    });

    it('should log refund trigger when order.cancelled is received', async () => {
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

      // Assert - verify cancellation is logged (no refund needed for AWAITING_PAYMENT)
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PAYMENTS BC]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('order-123'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No refund needed'),
      );
    });

    it('should handle order.cancelled for PAID orders (refund scenario)', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      const orderCancelledMessage: IntegrationMessage<OrderCancelledPayload> = {
        messageId: 'msg-cancel-002',
        topic: 'order.cancelled',
        timestamp: new Date(),
        correlationId: 'order-456',
        payload: {
          orderId: 'order-456',
          reason: 'Product out of stock',
          previousStatus: 'PAID',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await orderCancelledHandler(orderCancelledMessage);

      // Assert - verify refund is triggered for paid order
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PAYMENTS BC]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('REFUND'));
    });
  });
});
