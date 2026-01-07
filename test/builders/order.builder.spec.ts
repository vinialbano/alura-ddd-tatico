import { OrderBuilder } from './order.builder';
import { Order } from '../../src/domain/order/order';
import { OrderStatus } from '../../src/domain/order/value-objects/order-status';
import { OrderId } from '../../src/domain/order/value-objects/order-id';
import { CartId } from '../../src/domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../src/domain/shared/value-objects/customer-id';
import { Money } from '../../src/domain/order/value-objects/money';
import { OrderItem } from '../../src/domain/order/order-item';
import { TEST_ADDRESS_US, TEST_ADDRESS_INTL } from '../fixtures/common-values';

describe('OrderBuilder', () => {
  describe('create with defaults', () => {
    it('should create a valid Order with default values', () => {
      const order = OrderBuilder.create().build();

      expect(order).toBeInstanceOf(Order);
      expect(order.id).toBeInstanceOf(OrderId);
      expect(order.cartId).toBeInstanceOf(CartId);
      expect(order.customerId).toBeInstanceOf(CustomerId);
      expect(order.status).toBe(OrderStatus.AwaitingPayment);
      expect(order.shippingAddress).toBe(TEST_ADDRESS_US);
      expect(order.items).toHaveLength(2);
      expect(order.orderLevelDiscount.amount).toBe(0);
    });

    it('should create two default items: Colombian Coffee and Green Tea', () => {
      const order = OrderBuilder.create().build();
      const items = order.items;

      expect(items).toHaveLength(2);

      // First item: Colombian Coffee $12.99 x1
      expect(items[0].productSnapshot.name).toBe('Colombian Coffee');
      expect(items[0].quantity.getValue()).toBe(1);
      expect(items[0].unitPrice.amount).toBe(12.99);

      // Second item: Green Tea $8.99 x2
      expect(items[1].productSnapshot.name).toBe('Green Tea');
      expect(items[1].quantity.getValue()).toBe(2);
      expect(items[1].unitPrice.amount).toBe(8.99);
    });

    it('should calculate total amount correctly with default items and no discount', () => {
      const order = OrderBuilder.create().build();

      // (12.99 * 1) + (8.99 * 2) - 0 = 30.97
      expect(order.totalAmount.amount).toBe(30.97);
      expect(order.totalAmount.currency).toBe('USD');
    });
  });

  describe('customization', () => {
    it('should allow customizing status', () => {
      const order = OrderBuilder.create().withStatus(OrderStatus.Paid).build();

      expect(order.status).toBe(OrderStatus.Paid);
    });

    it('should allow customizing customer ID', () => {
      const customerId = CustomerId.fromString('customer-jane-456');
      const order = OrderBuilder.create().withCustomerId(customerId).build();

      expect(order.customerId).toBe(customerId);
    });

    it('should allow customizing shipping address', () => {
      const order = OrderBuilder.create()
        .withShippingAddress(TEST_ADDRESS_INTL)
        .build();

      expect(order.shippingAddress).toBe(TEST_ADDRESS_INTL);
    });

    it('should allow customizing items', () => {
      const customItems: OrderItem[] = [
        OrderItem.create(
          { name: 'Custom Product', description: 'Test', sku: 'SKU-001' },
          { getValue: () => 1 } as any,
          new Money(50.0, 'USD'),
          new Money(0, 'USD'),
        ),
      ];

      const order = OrderBuilder.create().withItems(customItems).build();

      expect(order.items).toHaveLength(1);
      expect(order.items[0].productSnapshot.name).toBe('Custom Product');
    });

    it('should allow customizing order-level discount', () => {
      const discount = new Money(5.0, 'USD');
      const order = OrderBuilder.create()
        .withOrderLevelDiscount(discount)
        .build();

      expect(order.orderLevelDiscount).toBe(discount);
      // Total should be recalculated: 30.97 - 5.0 = 25.97
      expect(order.totalAmount.amount).toBe(25.97);
    });
  });

  describe('method chaining', () => {
    it('should support chaining multiple customizations', () => {
      const customerId = CustomerId.fromString('customer-test-999');
      const discount = new Money(10.0, 'USD');

      const order = OrderBuilder.create()
        .withStatus(OrderStatus.Paid)
        .withCustomerId(customerId)
        .withShippingAddress(TEST_ADDRESS_INTL)
        .withOrderLevelDiscount(discount)
        .build();

      expect(order.status).toBe(OrderStatus.Paid);
      expect(order.customerId).toBe(customerId);
      expect(order.shippingAddress).toBe(TEST_ADDRESS_INTL);
      expect(order.orderLevelDiscount.amount).toBe(10.0);
      // Total: 30.97 - 10.0 = 20.97
      expect(order.totalAmount.amount).toBe(20.97);
    });
  });

  describe('total amount calculation', () => {
    it('should recalculate total when items change', () => {
      const customItems: OrderItem[] = [
        OrderItem.create(
          { name: 'Expensive Item', description: 'Test', sku: 'SKU-EXP' },
          { getValue: () => 1 } as any,
          new Money(100.0, 'USD'),
          new Money(0, 'USD'),
        ),
      ];

      const order = OrderBuilder.create().withItems(customItems).build();

      expect(order.totalAmount.amount).toBe(100.0);
    });

    it('should apply order-level discount to calculated total', () => {
      const customItems: OrderItem[] = [
        OrderItem.create(
          { name: 'Item 1', description: 'Test', sku: 'SKU-1' },
          { getValue: () => 2 } as any,
          new Money(20.0, 'USD'),
          new Money(0, 'USD'),
        ),
        OrderItem.create(
          { name: 'Item 2', description: 'Test', sku: 'SKU-2' },
          { getValue: () => 1 } as any,
          new Money(15.0, 'USD'),
          new Money(0, 'USD'),
        ),
      ];

      const discount = new Money(5.0, 'USD');

      const order = OrderBuilder.create()
        .withItems(customItems)
        .withOrderLevelDiscount(discount)
        .build();

      // (20 * 2) + (15 * 1) - 5 = 40 + 15 - 5 = 50
      expect(order.totalAmount.amount).toBe(50.0);
    });
  });
});
