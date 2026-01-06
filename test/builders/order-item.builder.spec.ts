import { OrderItemBuilder } from './order-item.builder';
import { Money } from '../../src/domain/order/value-objects/money';
import { Quantity } from '../../src/domain/shared/value-objects/quantity';
import { ProductSnapshot } from '../../src/domain/order/value-objects/product-snapshot';

describe('OrderItemBuilder', () => {
  describe('create with defaults', () => {
    it('should create a valid OrderItem with default values', () => {
      const item = OrderItemBuilder.create().build();

      expect(item).toBeDefined();
      expect(item.productSnapshot).toBeInstanceOf(ProductSnapshot);
      expect(item.productSnapshot.name).toBe('Test Product');
      expect(item.quantity.getValue()).toBe(1);
      expect(item.unitPrice.amount).toBe(10.0);
      expect(item.unitPrice.currency).toBe('USD');
      expect(item.itemDiscount.amount).toBe(0);
    });
  });

  describe('customization', () => {
    it('should allow customizing quantity', () => {
      const item = OrderItemBuilder.create()
        .withQuantity(5)
        .build();

      expect(item.quantity.getValue()).toBe(5);
    });

    it('should allow customizing unit price', () => {
      const customPrice = new Money(99.99, 'USD');
      const item = OrderItemBuilder.create()
        .withUnitPrice(customPrice)
        .build();

      expect(item.unitPrice).toBe(customPrice);
    });

    it('should allow customizing item discount', () => {
      const discount = new Money(5.0, 'USD');
      const item = OrderItemBuilder.create()
        .withItemDiscount(discount)
        .build();

      expect(item.itemDiscount).toBe(discount);
    });

    it('should allow customizing product name', () => {
      const item = OrderItemBuilder.create()
        .withProductName('Custom Product')
        .build();

      expect(item.productSnapshot.name).toBe('Custom Product');
    });

    it('should allow chaining multiple customizations', () => {
      const item = OrderItemBuilder.create()
        .withProductName('Premium Coffee')
        .withQuantity(3)
        .withUnitPrice(new Money(25.50, 'USD'))
        .withItemDiscount(new Money(2.50, 'USD'))
        .build();

      expect(item.productSnapshot.name).toBe('Premium Coffee');
      expect(item.quantity.getValue()).toBe(3);
      expect(item.unitPrice.amount).toBe(25.50);
      expect(item.itemDiscount.amount).toBe(2.50);
    });
  });

  describe('currency consistency', () => {
    it('should create items with consistent USD currency by default', () => {
      const item = OrderItemBuilder.create().build();

      expect(item.unitPrice.currency).toBe('USD');
      expect(item.itemDiscount.currency).toBe('USD');
    });
  });
});
