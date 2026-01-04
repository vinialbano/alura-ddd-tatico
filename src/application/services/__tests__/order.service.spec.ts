import { OrderService } from '../order.service';
import { OrderRepository } from '../../../domain/order/order.repository';
import { Order } from '../../../domain/order/order';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { Money } from '../../../domain/order/value-objects/money';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';
import { OrderItem } from '../../../domain/order/order-item';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { Quantity } from '../../../domain/shared/value-objects/quantity';
import { OrderNotFoundException } from '../../exceptions/order-not-found.exception';
import { InvalidOrderStateTransitionError } from '../../../domain/order/exceptions/invalid-order-state-transition.error';
import { OrderStatus } from '../../../domain/order/value-objects/order-status';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  const createTestOrder = (
    status: OrderStatus = OrderStatus.AwaitingPayment,
  ): Order => {
    const testOrderId = OrderId.generate();
    const testCartId = CartId.create();
    const testCustomerId = CustomerId.fromString('customer-123');
    const shippingAddress = new ShippingAddress({
      street: '123 Main St',
      city: 'Springfield',
      stateOrProvince: 'IL',
      postalCode: '62701',
      country: 'USA',
    });

    const orderItem = OrderItem.create(
      new ProductSnapshot({
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
      }),
      Quantity.of(1),
      new Money(10.0, 'USD'),
      new Money(0, 'USD'),
    );

    const order = Order.create(
      testOrderId,
      testCartId,
      testCustomerId,
      [orderItem],
      shippingAddress,
      new Money(0, 'USD'),
      new Money(10.0, 'USD'),
    );

    // Manually set status if needed (for testing different states)
    if (status !== OrderStatus.AwaitingPayment) {
      if (status === OrderStatus.Paid) {
        order.markAsPaid('test-payment-id');
      } else if (status === OrderStatus.Cancelled) {
        order.cancel('Test cancellation');
      }
    }

    return order;
  };

  beforeEach(() => {
    mockOrderRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCartId: jest.fn(),
    } as any;

    service = new OrderService(mockOrderRepository);
  });

  describe('markAsPaid', () => {
    it('should mark order as paid when order is in AwaitingPayment state', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.AwaitingPayment);
      const orderId = order.id.getValue();
      const paymentId = 'payment-123';

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act
      const response = await service.markAsPaid(orderId, paymentId);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(order.id);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);
      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.paymentId).toBe(paymentId);
      expect(response.status).toBe('PAID');
      expect(response.paymentId).toBe(paymentId);
    });

    it('should throw OrderNotFoundException when order does not exist', async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().getValue();
      mockOrderRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.markAsPaid(nonExistentOrderId, 'payment-123'),
      ).rejects.toThrow(OrderNotFoundException);

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidOrderStateTransitionError when order is already paid', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.Paid);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act & Assert
      await expect(service.markAsPaid(orderId, 'payment-456')).rejects.toThrow(
        InvalidOrderStateTransitionError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidOrderStateTransitionError when order is cancelled', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.Cancelled);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act & Assert
      await expect(service.markAsPaid(orderId, 'payment-789')).rejects.toThrow(
        InvalidOrderStateTransitionError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel order when order is in AwaitingPayment state', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.AwaitingPayment);
      const orderId = order.id.getValue();
      const reason = 'Customer requested cancellation';

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act
      const response = await service.cancel(orderId, reason);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(order.id);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);
      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(reason);
      expect(response.status).toBe('CANCELLED');
      expect(response.cancellationReason).toBe(reason);
    });

    it('should cancel order when order is in Paid state', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.Paid);
      const orderId = order.id.getValue();
      const reason = 'Refund requested';

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act
      const response = await service.cancel(orderId, reason);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(order.id);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);
      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(reason);
      expect(response.status).toBe('CANCELLED');
      expect(response.cancellationReason).toBe(reason);
    });

    it('should throw OrderNotFoundException when order does not exist', async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().getValue();
      mockOrderRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancel(nonExistentOrderId, 'Some reason'),
      ).rejects.toThrow(OrderNotFoundException);

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidOrderStateTransitionError when order is already cancelled', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.Cancelled);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act & Assert
      await expect(service.cancel(orderId, 'Another reason')).rejects.toThrow(
        InvalidOrderStateTransitionError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      // Arrange
      const order = createTestOrder();
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);

      // Act
      const response = await service.findById(orderId);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(order.id);
      expect(response.id).toBe(orderId);
      expect(response.status).toBe('AWAITING_PAYMENT');
    });

    it('should throw OrderNotFoundException when order does not exist', async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().getValue();
      mockOrderRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(nonExistentOrderId)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });
});
