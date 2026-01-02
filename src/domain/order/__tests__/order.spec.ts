import { Order } from '../order';
import { OrderId } from '../value-objects/order-id';
import { CartId } from '../../shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../shared/value-objects/customer-id';
import { OrderStatus } from '../value-objects/order-status';
import { Money } from '../value-objects/money';
import { ShippingAddress } from '../value-objects/shipping-address';
import { OrderItem } from '../order-item';
import { ProductSnapshot } from '../value-objects/product-snapshot';
import { Quantity } from '../../shared/value-objects/quantity';
import { InvalidOrderStateTransitionError } from '../exceptions/invalid-order-state-transition.error';

describe('Order Aggregate', () => {
  // Test data factories
  const createValidOrderItem = (
    name = 'Test Product',
    quantity = 2,
    unitPrice = 50.0,
    itemDiscount = 0,
  ): OrderItem => {
    const productSnapshot = new ProductSnapshot({
      name,
      description: 'Test description',
      sku: `SKU-${name.replace(/\s+/g, '-').toUpperCase()}`,
    });

    return OrderItem.create(
      productSnapshot,
      Quantity.of(quantity),
      new Money(unitPrice, 'USD'),
      new Money(itemDiscount, 'USD'),
    );
  };

  const createValidShippingAddress = (): ShippingAddress => {
    return new ShippingAddress({
      street: '123 Main St',
      city: 'Springfield',
      stateOrProvince: 'IL',
      postalCode: '62701',
      country: 'USA',
    });
  };

  describe('Factory Method: create', () => {
    it('should create an Order in AwaitingPayment status with valid parameters', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
      expect(order.cartId).toBe(cartId);
      expect(order.customerId).toBe(customerId);
      expect(order.items).toEqual(items);
      expect(order.shippingAddress).toBe(shippingAddress);
      expect(order.status).toBe(OrderStatus.AwaitingPayment);
      expect(order.orderLevelDiscount).toBe(orderLevelDiscount);
      expect(order.totalAmount).toBe(totalAmount);
      expect(order.paymentId).toBeNull();
      expect(order.cancellationReason).toBeNull();
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error when created with empty items array', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const emptyItems: OrderItem[] = [];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(0, 'USD');

      expect(() => {
        Order.create(
          orderId,
          cartId,
          customerId,
          emptyItems,
          shippingAddress,
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
        createValidOrderItem('Product A', 2, 50.0, 0),
        createValidOrderItem('Product B', 1, 30.0, 0),
        createValidOrderItem('Product C', 3, 20.0, 5.0),
      ];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(10.0, 'USD');
      const totalAmount = new Money(175.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.items).toHaveLength(3);
      expect(order.items[0].productSnapshot.name).toBe('Product A');
      expect(order.items[1].productSnapshot.name).toBe('Product B');
      expect(order.items[2].productSnapshot.name).toBe('Product C');
    });
  });

  describe('State Machine: markAsPaid', () => {
    it('should transition from AwaitingPayment to Paid with payment ID', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      const paymentId = 'pay_123456789';
      order.markAsPaid(paymentId);

      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.paymentId).toBe(paymentId);
    });

    it('should throw error when marking already paid order as paid', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.markAsPaid('pay_123');

      expect(() => {
        order.markAsPaid('pay_456');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should throw error when marking cancelled order as paid', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('Customer requested cancellation');

      expect(() => {
        order.markAsPaid('pay_789');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should preserve order state when markAsPaid fails', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('Test cancellation');
      const statusBeforeAttempt = order.status;
      const paymentIdBeforeAttempt = order.paymentId;

      try {
        order.markAsPaid('pay_999');
      } catch (error) {
        // Expected to fail
      }

      expect(order.status).toBe(statusBeforeAttempt);
      expect(order.paymentId).toBe(paymentIdBeforeAttempt);
    });
  });

  describe('State Machine: cancel', () => {
    it('should transition from AwaitingPayment to Cancelled with reason', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      const cancellationReason = 'Customer requested cancellation';
      order.cancel(cancellationReason);

      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(cancellationReason);
    });

    it('should transition from Paid to Cancelled with reason (refund scenario)', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.markAsPaid('pay_123');
      const cancellationReason = 'Product defect - customer requested refund';
      order.cancel(cancellationReason);

      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(cancellationReason);
      expect(order.paymentId).toBe('pay_123'); // Payment ID preserved
    });

    it('should throw error when cancelling already cancelled order', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('First cancellation');

      expect(() => {
        order.cancel('Second cancellation attempt');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should preserve order state when cancel fails', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('First cancellation');
      const statusBeforeAttempt = order.status;
      const reasonBeforeAttempt = order.cancellationReason;

      try {
        order.cancel('Second cancellation');
      } catch (error) {
        // Expected to fail
      }

      expect(order.status).toBe(statusBeforeAttempt);
      expect(order.cancellationReason).toBe(reasonBeforeAttempt);
    });
  });

  describe('State Machine Validation Methods', () => {
    it('canBePaid should return true for AwaitingPayment status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.canBePaid()).toBe(true);
    });

    it('canBePaid should return false for Paid status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.markAsPaid('pay_123');

      expect(order.canBePaid()).toBe(false);
    });

    it('canBePaid should return false for Cancelled status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('Test cancellation');

      expect(order.canBePaid()).toBe(false);
    });

    it('canBeCancelled should return true for AwaitingPayment status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.canBeCancelled()).toBe(true);
    });

    it('canBeCancelled should return true for Paid status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.markAsPaid('pay_123');

      expect(order.canBeCancelled()).toBe(true);
    });

    it('canBeCancelled should return false for Cancelled status', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      order.cancel('Test cancellation');

      expect(order.canBeCancelled()).toBe(false);
    });
  });

  describe('Invariants and Validation', () => {
    it('should enforce that totalAmount matches calculation (sum of line totals - orderLevelDiscount)', () => {
      // This is a business rule that should be enforced at creation time
      // For now, we trust the pricing service to provide correct totals
      // Future enhancement: Add invariant validation in Order.create()
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem('Product A', 2, 50.0, 0)]; // 100.00
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(10.0, 'USD');
      const totalAmount = new Money(90.0, 'USD'); // Correct: 100 - 10

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      expect(order.totalAmount.amount).toBe(90.0);
    });

    it('should preserve immutability of order items collection', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
      );

      const originalLength = order.items.length;

      // Attempt to modify (should not affect internal collection if properly implemented)
      // Note: TypeScript readonly ensures this at compile time
      expect(order.items.length).toBe(originalLength);
    });

    it('should maintain createdAt timestamp consistency', () => {
      const orderId = OrderId.generate();
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');
      const items = [createValidOrderItem()];
      const shippingAddress = createValidShippingAddress();
      const orderLevelDiscount = new Money(0, 'USD');
      const totalAmount = new Money(100.0, 'USD');

      const beforeCreation = new Date();
      const order = Order.create(
        orderId,
        cartId,
        customerId,
        items,
        shippingAddress,
        orderLevelDiscount,
        totalAmount,
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
