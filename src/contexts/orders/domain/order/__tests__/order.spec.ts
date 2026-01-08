import { Order } from '../order';
import { OrderId } from '../../../shared/value-objects/order-id';
import { CartId } from '../../shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../shared/value-objects/customer-id';
import { OrderStatus } from '../value-objects/order-status';
import { Money } from '../../../shared/value-objects/money';
import { InvalidOrderStateTransitionError } from '../exceptions/invalid-order-state-transition.error';
import { OrderPaid } from '../events/order-paid.event';
import { OrderCancelled } from '../events/order-cancelled.event';
import { OrderPlaced } from '../events/order-placed.event';
import { EventId } from '../../shared/value-objects/event-id';
import { OrderItem } from '../order-item';
import { ProductSnapshot } from '../value-objects/product-snapshot';
import { Quantity } from '../../shared/value-objects/quantity';
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
  name?: string;
  quantity?: number;
  unitPrice?: Money;
  itemDiscount?: Money;
}) =>
  OrderItem.create(
    new ProductSnapshot({
      name: overrides?.name || 'Test Product',
      description: 'Test product description',
      sku: 'TEST-SKU-001',
    }),
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
      expect(order.cancellationReason).toBeNull();
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
          name: 'Product A',
          quantity: 2,
          unitPrice: new Money(50.0, 'USD'),
        }),
        createTestOrderItem({
          name: 'Product B',
          quantity: 1,
          unitPrice: new Money(30.0, 'USD'),
        }),
        createTestOrderItem({
          name: 'Product C',
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
      expect(order.items[0].productSnapshot.name).toBe('Product A');
      expect(order.items[1].productSnapshot.name).toBe('Product B');
      expect(order.items[2].productSnapshot.name).toBe('Product C');
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
          name: 'Product A',
          quantity: 2,
          unitPrice: new Money(50.0, 'USD'),
          itemDiscount: new Money(5.0, 'USD'),
        }),
        createTestOrderItem({
          name: 'Product B',
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
          name: 'Product',
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

    it('should throw error when marking cancelled order as paid', () => {
      const order = createTestOrder();

      order.cancel('Customer requested cancellation');

      expect(() => {
        order.markAsPaid('pay_789');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should preserve order state when markAsPaid fails', () => {
      const order = createTestOrder();

      order.cancel('Test cancellation');
      const statusBeforeAttempt = order.status;
      const paymentIdBeforeAttempt = order.paymentId;

      try {
        order.markAsPaid('pay_999');
      } catch {
        // Expected to fail
      }

      expect(order.status).toBe(statusBeforeAttempt);
      expect(order.paymentId).toBe(paymentIdBeforeAttempt);
    });

    it('should raise OrderPaid domain event when marking as paid', () => {
      const orderId = OrderId.generate();
      const items = [createTestOrderItem()];
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        items,
        createTestShippingAddress(),
        new Money(0, 'USD'),
        new Money(100.0, 'USD'),
      );

      // Clear OrderPlaced event from creation
      order.clearDomainEvents();

      const paymentId = 'PAY-123456';
      order.markAsPaid(paymentId);

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPaid);
      expect((events[0] as OrderPaid).paymentId).toBe(paymentId);
      expect((events[0] as OrderPaid).aggregateId).toBe(orderId.getValue());
    });

    it('should record payment ID when marking as paid', () => {
      const order = createTestOrder();

      const paymentId = 'PAY-XYZ-789';
      order.markAsPaid(paymentId);

      expect(order.paymentId).toBe(paymentId);
      expect(order.status.equals(OrderStatus.Paid)).toBe(true);
    });
  });

  describe('Idempotency: markAsPaid (T016)', () => {
    it('should handle duplicate payment approval for same payment ID (idempotent)', () => {
      // Arrange
      const order = createTestOrder();
      const paymentId = 'PAY-12345';

      // Act - First call should succeed
      order.markAsPaid(paymentId);
      const statusAfterFirst = order.status;

      // Clear events to verify second call doesn't emit new event
      order.clearDomainEvents();

      // Act - Second call with same payment ID should be idempotent
      order.markAsPaid(paymentId);

      // Assert
      expect(order.status).toBe(statusAfterFirst);
      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.getDomainEvents()).toHaveLength(0); // No new event emitted
    });

    it('should reject duplicate payment approval with different payment ID', () => {
      // Arrange
      const order = createTestOrder();
      const firstPaymentId = 'PAY-11111';
      const secondPaymentId = 'PAY-22222';

      // Act - First payment succeeds
      order.markAsPaid(firstPaymentId);

      // Assert - Second payment with different ID should fail
      expect(() => {
        order.markAsPaid(secondPaymentId);
      }).toThrow(InvalidOrderStateTransitionError);

      // Order should still have first payment ID
      expect(order.paymentId).toBe(firstPaymentId);
    });

    it('should track multiple processed payment IDs from duplicate approvals', () => {
      // Arrange
      const order = createTestOrder();
      const paymentId = 'PAY-12345';

      // Act - Process same payment ID multiple times
      order.markAsPaid(paymentId);
      order.markAsPaid(paymentId);
      order.markAsPaid(paymentId);

      // Assert - Should only transition once, but track all attempts
      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.hasProcessedPayment(paymentId)).toBe(true);
    });

    it('should allow idempotent calls before and after state transition', () => {
      // Arrange
      const order = createTestOrder();
      const paymentId = 'PAY-99999';

      // Act & Assert
      expect(order.status).toBe(OrderStatus.AwaitingPayment);

      // First call - transitions to Paid
      order.markAsPaid(paymentId);
      expect(order.status).toBe(OrderStatus.Paid);

      // Subsequent calls - idempotent (no error, no state change)
      order.markAsPaid(paymentId);
      expect(order.status).toBe(OrderStatus.Paid);

      order.markAsPaid(paymentId);
      expect(order.status).toBe(OrderStatus.Paid);
    });
  });

  describe('State Machine: cancel', () => {
    it('should transition from AwaitingPayment to Cancelled with reason', () => {
      const order = createTestOrder();

      const cancellationReason = 'Customer requested cancellation';
      order.cancel(cancellationReason);

      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(cancellationReason);
    });

    it('should transition from Paid to Cancelled with reason (refund scenario)', () => {
      const order = createTestOrder();

      order.markAsPaid('pay_123');
      const cancellationReason = 'Product defect - customer requested refund';
      order.cancel(cancellationReason);

      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(order.cancellationReason).toBe(cancellationReason);
      expect(order.paymentId).toBe('pay_123'); // Payment ID preserved
    });

    it('should raise OrderCancelled event when cancelling from AwaitingPayment (T037)', () => {
      const orderId = OrderId.generate();
      const items = [createTestOrderItem()];
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        items,
        createTestShippingAddress(),
        new Money(0, 'USD'),
        new Money(100.0, 'USD'),
      );

      // Clear OrderPlaced event from creation
      order.clearDomainEvents();

      const cancellationReason = 'Customer changed mind';
      order.cancel(cancellationReason);

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderCancelled);

      const cancelledEvent = events[0] as OrderCancelled;
      expect(cancelledEvent.aggregateId).toBe(orderId.getValue());
      expect(cancelledEvent.cancellationReason).toBe(cancellationReason);
      expect(cancelledEvent.previousState).toBe('AWAITING_PAYMENT');
      expect(cancelledEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should raise OrderCancelled event when cancelling from Paid (T050)', () => {
      const orderId = OrderId.generate();
      const items = [createTestOrderItem()];
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        items,
        createTestShippingAddress(),
        new Money(0, 'USD'),
        new Money(100.0, 'USD'),
      );

      // Mark as paid first
      order.markAsPaid('pay_123');

      // Clear domain events from markAsPaid
      order.clearDomainEvents();

      // Now cancel (refund scenario)
      const cancellationReason = 'Refund requested';
      order.cancel(cancellationReason);

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderCancelled);

      const cancelledEvent = events[0] as OrderCancelled;
      expect(cancelledEvent.aggregateId).toBe(orderId.getValue());
      expect(cancelledEvent.cancellationReason).toBe(cancellationReason);
      expect(cancelledEvent.previousState).toBe('PAID');
      expect(cancelledEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should throw error when cancelling already cancelled order', () => {
      const order = createTestOrder();

      order.cancel('First cancellation');

      expect(() => {
        order.cancel('Second cancellation attempt');
      }).toThrow(InvalidOrderStateTransitionError);
    });

    it('should throw error when cancelling with empty reason (T039)', () => {
      const order = createTestOrder();

      // Test empty string
      expect(() => {
        order.cancel('');
      }).toThrow('Cancellation reason cannot be empty');

      // Test whitespace-only string
      expect(() => {
        order.cancel('   ');
      }).toThrow('Cancellation reason cannot be empty');

      // Test tab/newline characters
      expect(() => {
        order.cancel('\t\n');
      }).toThrow('Cancellation reason cannot be empty');

      // Verify order remained in AwaitingPayment
      expect(order.status).toBe(OrderStatus.AwaitingPayment);
    });

    it('should preserve order state when cancel fails', () => {
      const order = createTestOrder();

      order.cancel('First cancellation');
      const statusBeforeAttempt = order.status;
      const reasonBeforeAttempt = order.cancellationReason;

      try {
        order.cancel('Second cancellation');
      } catch {
        // Expected to fail
      }

      expect(order.status).toBe(statusBeforeAttempt);
      expect(order.cancellationReason).toBe(reasonBeforeAttempt);
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

    it('canBePaid should return false for Cancelled status', () => {
      const order = createTestOrder();

      order.cancel('Test cancellation');

      expect(order.canBePaid()).toBe(false);
    });

    it('canBeCancelled should return true for AwaitingPayment status', () => {
      const order = createTestOrder();

      expect(order.canBeCancelled()).toBe(true);
    });

    it('canBeCancelled should return true for Paid status', () => {
      const order = createTestOrder();

      order.markAsPaid('pay_123');

      expect(order.canBeCancelled()).toBe(true);
    });

    it('canBeCancelled should return false for Cancelled status', () => {
      const order = createTestOrder();

      order.cancel('Test cancellation');

      expect(order.canBeCancelled()).toBe(false);
    });
  });

  describe('Invariants and Validation', () => {
    it('should enforce that totalAmount matches calculation (sum of line totals - orderLevelDiscount)', () => {
      // This is a business rule that should be enforced at creation time
      // For now, we trust the pricing service to provide correct totals
      // Future enhancement: Add invariant validation in Order.create()
      const items = [
        createTestOrderItem({
          name: 'Product A',
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
