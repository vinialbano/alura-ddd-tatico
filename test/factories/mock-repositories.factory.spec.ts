import { Order } from '../../src/domain/order/order';
import { OrderId } from '../../src/domain/order/value-objects/order-id';
import { CustomerId } from '../../src/domain/shared/value-objects/customer-id';
import { ShoppingCart } from '../../src/domain/shopping-cart/shopping-cart';
import { CartId } from '../../src/domain/shopping-cart/value-objects/cart-id';
import {
  createMockCartRepository,
  createMockOrderRepository,
} from './mock-repositories.factory';

describe('Mock Repository Factories', () => {
  describe('createMockOrderRepository', () => {
    it('should return properly typed OrderRepository mock', () => {
      const mock = createMockOrderRepository();

      expect(mock).toBeDefined();
      expect(mock.save).toBeDefined();
      expect(mock.findById).toBeDefined();
      expect(mock.findByCartId).toBeDefined();
      expect(typeof mock.save).toBe('function');
      expect(typeof mock.findById).toBe('function');
      expect(typeof mock.findByCartId).toBe('function');
    });

    it('should have save method that resolves to undefined by default', async () => {
      const mock = createMockOrderRepository();
      const order = {} as Order; // Dummy order for test

      await expect(mock.save(order)).resolves.toBeUndefined();
    });

    it('should have findById that resolves to null by default', async () => {
      const mock = createMockOrderRepository();
      const orderId = OrderId.generate();

      await expect(mock.findById(orderId)).resolves.toBeNull();
    });

    it('should have findByCartId that resolves to null by default', async () => {
      const mock = createMockOrderRepository();
      const cartId = CartId.create();

      await expect(mock.findByCartId(cartId)).resolves.toBeNull();
    });

    it('should allow overriding specific methods', async () => {
      const testOrder = {} as Order;
      const mock = createMockOrderRepository({
        findById: jest.fn().mockResolvedValue(testOrder),
      });

      const orderId = OrderId.generate();
      const result = await mock.findById(orderId);

      expect(result).toBe(testOrder);
      expect(mock.findById).toHaveBeenCalledWith(orderId);
    });

    it('should maintain default behavior for non-overridden methods', async () => {
      const testOrder = {} as Order;
      const mock = createMockOrderRepository({
        findById: jest.fn().mockResolvedValue(testOrder),
      });

      // findById is overridden, but save should still have default behavior
      await expect(mock.save({} as Order)).resolves.toBeUndefined();

      // findByCartId should still have default behavior
      const cartId = CartId.create();
      await expect(mock.findByCartId(cartId)).resolves.toBeNull();
    });
  });

  describe('createMockCartRepository', () => {
    it('should return properly typed ShoppingCartRepository mock', () => {
      const mock = createMockCartRepository();

      expect(mock).toBeDefined();
      expect(mock.save).toBeDefined();
      expect(mock.findById).toBeDefined();
      expect(mock.findByCustomerId).toBeDefined();
      expect(mock.delete).toBeDefined();
      expect(typeof mock.save).toBe('function');
      expect(typeof mock.findById).toBe('function');
      expect(typeof mock.findByCustomerId).toBe('function');
      expect(typeof mock.delete).toBe('function');
    });

    it('should have save method that resolves to undefined by default', async () => {
      const mock = createMockCartRepository();
      const cart = {} as ShoppingCart;

      await expect(mock.save(cart)).resolves.toBeUndefined();
    });

    it('should have findById that resolves to null by default', async () => {
      const mock = createMockCartRepository();
      const cartId = CartId.create();

      await expect(mock.findById(cartId)).resolves.toBeNull();
    });

    it('should have findByCustomerId that resolves to empty array by default', async () => {
      const mock = createMockCartRepository();
      const customerId = CustomerId.fromString('customer-123');

      await expect(mock.findByCustomerId(customerId)).resolves.toEqual([]);
    });

    it('should have delete method that resolves to undefined by default', async () => {
      const mock = createMockCartRepository();
      const cartId = CartId.create();

      await expect(mock.delete(cartId)).resolves.toBeUndefined();
    });

    it('should allow overriding specific methods', async () => {
      const testCart = {} as ShoppingCart;
      const mock = createMockCartRepository({
        findById: jest.fn().mockResolvedValue(testCart),
      });

      const cartId = CartId.create();
      const result = await mock.findById(cartId);

      expect(result).toBe(testCart);
      expect(mock.findById).toHaveBeenCalledWith(cartId);
    });

    it('should maintain default behavior for non-overridden methods', async () => {
      const testCart = {} as ShoppingCart;
      const mock = createMockCartRepository({
        findById: jest.fn().mockResolvedValue(testCart),
      });

      // findById is overridden, but save should still have default behavior
      await expect(mock.save({} as ShoppingCart)).resolves.toBeUndefined();

      // delete should still have default behavior
      const cartId = CartId.create();
      await expect(mock.delete(cartId)).resolves.toBeUndefined();

      // findByCustomerId should still have default behavior
      const customerId = CustomerId.fromString('customer-123');
      await expect(mock.findByCustomerId(customerId)).resolves.toEqual([]);
    });
  });
});
