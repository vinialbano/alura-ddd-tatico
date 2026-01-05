import { DomainEventPublisher } from './domain-event-publisher';
import { IMessageBus } from '../../application/events/message-bus.interface';
import { OrderPlaced } from '../../domain/order/events/order-placed.event';
import { OrderPaid } from '../../domain/order/events/order-paid.event';
import { OrderCancelled } from '../../domain/order/events/order-cancelled.event';
import { EventId } from '../../domain/shared/value-objects/event-id';
import { OrderId } from '../../domain/order/value-objects/order-id';
import { CustomerId } from '../../domain/shared/value-objects/customer-id';
import { CartId } from '../../domain/shopping-cart/value-objects/cart-id';
import { Money } from '../../domain/order/value-objects/money';
import { ShippingAddress } from '../../domain/order/value-objects/shipping-address';

describe('DomainEventPublisher', () => {
  let publisher: DomainEventPublisher;
  let messageBus: jest.Mocked<IMessageBus>;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
    };
    publisher = new DomainEventPublisher(messageBus);
  });

  describe('publishDomainEvents', () => {
    it('should map OrderPlaced to order.placed topic', async () => {
      // Arrange
      const event = new OrderPlaced(
        EventId.generate(),
        OrderId.generate(),
        CustomerId.fromString('CUST-123'),
        CartId.create(),
        [],
        new Money(100, 'BRL'),
        new ShippingAddress({
          street: 'Rua Test',
          city: 'São Paulo',
          stateOrProvince: 'SP',
          postalCode: '01234-567',
          country: 'BR',
        }),
        new Date(),
      );

      // Act
      await publisher.publishDomainEvents([event]);

      // Assert
      expect(messageBus.publish).toHaveBeenCalledTimes(1);
      expect(messageBus.publish).toHaveBeenCalledWith(
        'order.placed',
        expect.objectContaining({
          orderId: event.orderId.getValue(),
          customerId: event.customerId.getValue(),
          cartId: event.cartId.getValue(),
          totalAmount: 100,
          currency: 'BRL',
        }),
      );
    });

    it('should map OrderPaid to order.paid topic', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const event = new OrderPaid(
        EventId.generate(),
        orderId.getValue(),
        new Date(),
        'PAY-123',
      );

      // Act
      await publisher.publishDomainEvents([event]);

      // Assert
      expect(messageBus.publish).toHaveBeenCalledTimes(1);
      expect(messageBus.publish).toHaveBeenCalledWith(
        'order.paid',
        expect.objectContaining({
          orderId: orderId.getValue(),
          paymentId: 'PAY-123',
        }),
      );
    });

    it('should map OrderCancelled to order.cancelled topic', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const event = new OrderCancelled(
        EventId.generate(),
        orderId.getValue(),
        new Date(),
        'Customer requested',
        'AwaitingPayment',
      );

      // Act
      await publisher.publishDomainEvents([event]);

      // Assert
      expect(messageBus.publish).toHaveBeenCalledTimes(1);
      expect(messageBus.publish).toHaveBeenCalledWith(
        'order.cancelled',
        expect.objectContaining({
          orderId: orderId.getValue(),
          reason: 'Customer requested',
          previousStatus: 'AwaitingPayment',
        }),
      );
    });

    it('should publish multiple events in sequence', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const event1 = new OrderPaid(
        EventId.generate(),
        orderId.getValue(),
        new Date(),
        'PAY-123',
      );
      const event2 = new OrderCancelled(
        EventId.generate(),
        orderId.getValue(),
        new Date(),
        'Customer requested',
        'Paid',
      );

      // Act
      await publisher.publishDomainEvents([event1, event2]);

      // Assert
      expect(messageBus.publish).toHaveBeenCalledTimes(2);
      expect(messageBus.publish).toHaveBeenNthCalledWith(
        1,
        'order.paid',
        expect.any(Object),
      );
      expect(messageBus.publish).toHaveBeenNthCalledWith(
        2,
        'order.cancelled',
        expect.any(Object),
      );
    });

    it('should handle empty event array', async () => {
      // Act
      await publisher.publishDomainEvents([]);

      // Assert
      expect(messageBus.publish).not.toHaveBeenCalled();
    });

    it('should ignore unknown event types', async () => {
      // Arrange
      class UnknownEvent {
        aggregateId = 'test';
        occurredAt = new Date();
      }
      const event = new UnknownEvent();

      // Act - should not throw
      await publisher.publishDomainEvents([event as any]);

      // Assert
      expect(messageBus.publish).not.toHaveBeenCalled();
    });
  });
});
