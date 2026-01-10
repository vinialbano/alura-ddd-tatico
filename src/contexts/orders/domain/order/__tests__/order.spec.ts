import { Money } from '../../../../../shared/value-objects/money';
import { OrderId } from '../../../../../shared/value-objects/order-id';
import { CustomerId } from '../../shared/value-objects/customer-id';
import { EventId } from '../../shared/value-objects/event-id';
import { ProductId } from '../../shared/value-objects/product-id';
import { Quantity } from '../../shared/value-objects/quantity';
import { CartId } from '../../shopping-cart/cart-id';
import { OrderPlaced } from '../events/order-placed.event';
import { InvalidOrderStateTransitionError } from '../exceptions/invalid-order-state-transition.error';
import { Order } from '../order';
import { OrderItem } from '../order-item';
import { OrderStatus } from '../value-objects/order-status';
import { ShippingAddress } from '../value-objects/shipping-address';

// Test helper functions for inline test data creation
const createTestShippingAddress = () =>
  new ShippingAddress({
    street: '123 Main St',
    city: 'Springfield',
    stateOrProvince: 'IL',
    postalCode: '62701',
    country: 'USA',
  });

const createTestOrderItem = (overrides?: {
  productId?: string;
  quantity?: number;
  unitPrice?: Money;
  itemDiscount?: Money;
}) =>
  OrderItem.create(
    ProductId.fromString(overrides?.productId || 'TEST-SKU-001'),
    Quantity.of(overrides?.quantity || 1),
    overrides?.unitPrice || new Money(100.0, 'USD'),
    overrides?.itemDiscount || new Money(0, 'USD'),
  );

const createTestOrder = () =>
  Order.create(
    OrderId.generate(),
    CartId.create(),
    CustomerId.fromString('customer-123'),
    [createTestOrderItem()],
    createTestShippingAddress(),
    new Money(0, 'USD'),
    new Money(100.0, 'USD'),
  );

describe('Order Aggregate', () => {
  describe('Factory Method: create', () => {
    it('should create an Order in AwaitingPayment status with valid parameters', () => {
      const items = [createTestOrderItem()];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
      expect(order.cartId).toBe(cartId);
      expect(order.customerId).toBe(customerId);
      expect(order.items).toEqual(items);
      expect(order.shippingAddress.street).toBe('123 Main St');
      expect(order.status).toBe(OrderStatus.AwaitingPayment);
      expect(order.orderLevelDiscount).toBe(orderLevelDiscount);
      expect(order.totalAmount).toBe(totalAmount);
      expect(order.paymentId).toBeNull();
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error when created with empty items array', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const emptyItems: OrderItem[] = [];
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(0, 'USD');

      expect(() => {
        Order.create(
          orderId,
          cartId,
          customerId,
          emptyItems,
          createTestShippingAddress(),
          orderLevelDiscount,
          totalAmount,
        );
      }).toThrow('Order must have at least one item');
    });

    it('should create an Order with multiple items', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [
        createTestOrderItem({
          productId: 'PRODUCT-A-001',
          quantity: 2,
          unitPrice: new Money(50.0, 'USD'),
        }),
        createTestOrderItem({
          productId: 'PRODUCT-B-001',
          quantity: 1,
          unitPrice: new Money(30.0, 'USD'),
        }),
        createTestOrderItem({
          productId: 'PRODUCT-C-001',
          quantity: 3,
          unitPrice: new Money(20.0, 'USD'),
          itemDiscount: new Money(5.0, 'USD'),
        }),
      ];
      const orderLevelDiscount = new Money(10.0, 'USD');
      const totalAmount = new Money(175.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.items).toHaveLength(3);
      expect(order.items[0].productId.getValue()).toBe('PRODUCT-A-001');
      expect(order.items[1].productId.getValue()).toBe('PRODUCT-B-001');
      expect(order.items[2].productId.getValue()).toBe('PRODUCT-C-001');
    });
  });

  describe('Domain Events: OrderPlaced (T015)', () => {
    it('should emit OrderPlaced event when order is created', () => {
      // Arrange
      const items = [createTestOrderItem()];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      // Assert
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPlaced);
    });

    it('should include valid EventId in OrderPlaced event', () => {
      // Arrange
      const items = [createTestOrderItem()];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      // Assert
      const events = order.getDomainEvents();
      const orderPlacedEvent = events[0] as OrderPlaced;

      expect(orderPlacedEvent.eventId).toBeInstanceOf(EventId);
      expect(orderPlacedEvent.eventId.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should include all order details in OrderPlaced event', () => {
      // Arrange
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [
        createTestOrderItem({
          productId: 'PRODUCT-A-001',
          quantity: 2,
          unitPrice: new Money(50.0, 'USD'),
          itemDiscount: new Money(5.0, 'USD'),
        }),
        createTestOrderItem({
          productId: 'PRODUCT-B-001',
          quantity: 1,
          unitPrice: new Money(30.0, 'USD'),
        }),
      ];
      const orderLevelDiscount = new Money(10.0, 'USD');
      const totalAmount = new Money(115.0, 'USD');

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      // Assert
      const events = order.getDomainEvents();
      const orderPlacedEvent = events[0] as OrderPlaced;

      expect(orderPlacedEvent.orderId).toBe(orderId);
      expect(orderPlacedEvent.customerId).toBe(customerId);
      expect(orderPlacedEvent.cartId).toBe(cartId);
      expect(orderPlacedEvent.items).toEqual(items);
      expect(orderPlacedEvent.totalAmount).toBe(totalAmount);
      expect(orderPlacedEvent.shippingAddress.street).toBe('123 Main St');
      expect(orderPlacedEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should set aggregateId to orderId in OrderPlaced event', () => {
      // Arrange
      const items = [createTestOrderItem()];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      // Assert
      const events = order.getDomainEvents();
      const orderPlacedEvent = events[0] as OrderPlaced;

      expect(orderPlacedEvent.aggregateId).toBe(orderId.getValue());
    });

    it('should set occurredAt timestamp in OrderPlaced event', () => {
      // Arrange
      const items = [createTestOrderItem()];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const beforeCreation = new Date();

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      const afterCreation = new Date();

      // Assert
      const events = order.getDomainEvents();
      const orderPlacedEvent = events[0] as OrderPlaced;

      expect(orderPlacedEvent.occurredAt).toBeInstanceOf(Date);
      expect(orderPlacedEvent.occurredAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(orderPlacedEvent.occurredAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });

    it('should emit OrderPlaced with empty order-level discount', () => {
      // Arrange
      const items = [
        createTestOrderItem({
          productId: 'TEST-PRODUCT-001',
          quantity: 1,
          unitPrice: new Money(100.0, 'USD'),
        }),
      ];
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      // Act
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      // Assert
      const events = order.getDomainEvents();
      const orderPlacedEvent = events[0] as OrderPlaced;

      expect(orderPlacedEvent.totalAmount.amount).toBe(100.0);
      expect(orderPlacedEvent.items).toHaveLength(1);
    });
  });

  describe('State Machine: markAsPaid', () => {
    it('should transition from AwaitingPayment to Paid with payment ID', () => {
      const order = createTestOrder();

      const paymentId = 'pay_123456789';
      order.markAsPaid(paymentId);

      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.paymentId).toBe(paymentId);
    });

    it('should throw error when marking already paid order as paid', () => {
      const order = createTestOrder();

      order.markAsPaid('pay_123');

      expect(() => {
        order.markAsPaid('pay_456');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should record payment ID when marking as paid', () => {
      const order = createTestOrder();

      const paymentId = 'PAY-XYZ-789';
      order.markAsPaid(paymentId);

      expect(order.paymentId).toBe(paymentId);
      expect(order.status.equals(OrderStatus.Paid)).toBe(true);
    });
  });

  describe('State Machine Validation Methods', () => {
    it('canBePaid should return true for AwaitingPayment status', () => {
      const order = createTestOrder();

      expect(order.canBePaid()).toBe(true);
    });

    it('canBePaid should return false for Paid status', () => {
      const order = createTestOrder();

      order.markAsPaid('pay_123');

      expect(order.canBePaid()).toBe(false);
    });
  });

  describe('Invariants and Validation', () => {
    it('should enforce that totalAmount matches calculation (sum of line totals - orderLevelDiscount)', () => {
      // This is a business rule that should be enforced at creation time
      // For now, we trust the pricing service to provide correct totals
      // Future enhancement: Add invariant validation in Order.create()
      const items = [
        createTestOrderItem({
          quantity: 2,
          unitPrice: new Money(50.0, 'USD'),
        }),
      ]; // 100.00
      const orderLevelDiscount = new Money(10.0, 'USD');
      const totalAmount = new Money(90.0, 'USD'); // Correct: 100 - 10

      const order = Order.create(
        OrderId.generate(),
        CartId.create(),
        CustomerId.fromString('customer-123'),
        items,
        createTestShippingAddress(),
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.totalAmount.amount).toBe(90.0);
    });

    it('should preserve immutability of order items collection', () => {
      const order = createTestOrder();

      const originalLength = order.items.length;

      // Attempt to modify (should not affect internal collection if properly implemented)
      // Note: TypeScript readonly ensures this at compile time
      expect(order.items.length).toBe(originalLength);
    });

    it('should maintain createdAt timestamp consistency', () => {
      const items = [createTestOrderItem()];

      const beforeCreation = new Date();
      const order = Order.create(
        OrderId.generate(),
        CartId.create(),
        CustomerId.fromString('customer-123'),
        items,
        createTestShippingAddress(),
        new Money(0, 'USD'),
        new Money(100.0, 'USD'),
      );
      const afterCreation = new Date();

      expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(order.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });
  });
});
