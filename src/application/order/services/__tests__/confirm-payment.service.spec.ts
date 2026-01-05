import { ConfirmPaymentService, PaymentDeclinedError } from '../confirm-payment.service';
import { OrderRepository } from '../../../../domain/order/order.repository';
import { IPaymentGateway } from '../../gateways/payment-gateway.interface';
import { Order } from '../../../../domain/order/order';
import { OrderId } from '../../../../domain/order/value-objects/order-id';
import { CartId } from '../../../../domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../../../domain/shared/value-objects/customer-id';
import { Money } from '../../../../domain/order/value-objects/money';
import { ShippingAddress } from '../../../../domain/order/value-objects/shipping-address';
import { OrderItem } from '../../../../domain/order/order-item';
import { ProductSnapshot } from '../../../../domain/order/value-objects/product-snapshot';
import { Quantity } from '../../../../domain/shared/value-objects/quantity';
import { OrderStatus } from '../../../../domain/order/value-objects/order-status';

describe('ConfirmPaymentService', () => {
  let service: ConfirmPaymentService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;

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
      new Money(100.0, 'USD'),
      new Money(0, 'USD'),
    );

    const order = Order.create(
      testOrderId,
      testCartId,
      testCustomerId,
      [orderItem],
      shippingAddress,
      new Money(0, 'USD'),
      new Money(100.0, 'USD'),
    );

    // Set status if different from default
    if (status === OrderStatus.Paid) {
      order.markAsPaid('TEST-PAYMENT-ID');
    } else if (status === OrderStatus.Cancelled) {
      order.cancel('Test cancellation');
    }

    return order;
  };

  beforeEach(() => {
    // Create mock repository
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    // Create mock payment gateway
    mockPaymentGateway = {
      processPayment: jest.fn(),
    } as jest.Mocked<IPaymentGateway>;

    // Create service with mocks
    service = new ConfirmPaymentService(
      mockOrderRepository,
      mockPaymentGateway,
    );
  });

  describe('execute', () => {
    it('should successfully confirm payment when gateway approves (T015)', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.AwaitingPayment);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'PAY-123',
      });

      // Act
      const result = await service.execute(orderId);

      // Assert - Verify gateway was called
      expect(mockPaymentGateway.processPayment).toHaveBeenCalledWith(
        order.id,
        order.totalAmount,
      );

      // Assert - Verify order was marked as paid
      expect(order.status.equals(OrderStatus.Paid)).toBe(true);
      expect(order.paymentId).toBe('PAY-123');

      // Assert - Verify order was saved
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);

      // Assert - Verify response DTO
      expect(result).toHaveProperty('id', orderId);
      expect(result).toHaveProperty('status', 'PAID');
      expect(result).toHaveProperty('paymentId', 'PAY-123');
    });

    it('should throw PaymentDeclinedError when gateway declines payment (T023)', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.AwaitingPayment);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: false,
        reason: 'Insufficient funds',
      });

      // Act & Assert
      await expect(service.execute(orderId)).rejects.toThrow(
        PaymentDeclinedError,
      );
      await expect(service.execute(orderId)).rejects.toThrow(
        'Payment declined: Insufficient funds',
      );

      // Assert - Verify order was NOT saved (remains in AwaitingPayment)
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(order.status.equals(OrderStatus.AwaitingPayment)).toBe(true);
    });

    it('should throw PaymentDeclinedError with correct reason for card declined', async () => {
      // Arrange
      const order = createTestOrder(OrderStatus.AwaitingPayment);
      const orderId = order.id.getValue();

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: false,
        reason: 'Card declined',
      });

      // Act & Assert
      await expect(service.execute(orderId)).rejects.toThrow(
        'Payment declined: Card declined',
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      mockOrderRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(nonExistentId)).rejects.toThrow(
        `Order with ID ${nonExistentId} not found`,
      );
    });
  });
});
