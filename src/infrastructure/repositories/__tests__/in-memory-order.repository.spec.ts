import { InMemoryOrderRepository } from '../in-memory-order.repository';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { Order } from '../../../domain/order/order';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { OrderItem } from '../../../domain/order/order-item';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { Quantity } from '../../../domain/shared/value-objects/quantity';
import { Money } from '../../../domain/order/value-objects/money';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';

// Test helper to create order
const createTestOrder = (cartId?: CartId, orderId?: OrderId) => {
  const items = [
    OrderItem.create(
      new ProductSnapshot({
        name: 'Test Product',
        description: 'Test description',
        sku: 'TEST-SKU-001',
      }),
      Quantity.of(1),
      new Money(100.0, 'USD'),
      new Money(0, 'USD'),
    ),
  ];

  return Order.create(
    orderId || OrderId.generate(),
    cartId || CartId.create(),
    CustomerId.fromString('customer-123'),
    items,
    new ShippingAddress({
      street: '123 Main St',
      city: 'Springfield',
      stateOrProvince: 'IL',
      postalCode: '62701',
      country: 'USA',
    }),
    new Money(0, 'USD'),
    new Money(100.0, 'USD'),
  );
};

describe('InMemoryOrderRepository', () => {
  let repository: InMemoryOrderRepository;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
  });

  describe('save', () => {
    it('should save a new order', async () => {
      const order = createTestOrder();

      await repository.save(order);

      const foundOrder = await repository.findById(order.id);
      expect(foundOrder).toBe(order);
    });

    it('should update an existing order', async () => {
      const order = createTestOrder();
      await repository.save(order);

      order.markAsPaid('payment-123');
      await repository.save(order);

      const foundOrder = await repository.findById(order.id);
      expect(foundOrder?.paymentId).toBe('payment-123');
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      const order = createTestOrder();
      await repository.save(order);

      const foundOrder = await repository.findById(order.id);

      expect(foundOrder).toBe(order);
      expect(foundOrder?.id.getValue()).toBe(order.id.getValue());
    });

    it('should return null when order not found', async () => {
      const nonExistentId = OrderId.generate();

      const foundOrder = await repository.findById(nonExistentId);

      expect(foundOrder).toBeNull();
    });
  });

  describe('findByCartId', () => {
    it('should return order when found by cart ID', async () => {
      const cartId = CartId.create();
      const order = createTestOrder(cartId);
      await repository.save(order);

      const foundOrder = await repository.findByCartId(cartId);

      expect(foundOrder).toBe(order);
      expect(foundOrder?.cartId.getValue()).toBe(cartId.getValue());
    });

    it('should return null when no order found for cart ID', async () => {
      const nonExistentCartId = CartId.create();

      const foundOrder = await repository.findByCartId(nonExistentCartId);

      expect(foundOrder).toBeNull();
    });

    it('should return the correct order when multiple orders exist', async () => {
      const cartId1 = CartId.create();
      const cartId2 = CartId.create();
      const order1 = createTestOrder(cartId1);
      const order2 = createTestOrder(cartId2);

      await repository.save(order1);
      await repository.save(order2);

      const foundOrder = await repository.findByCartId(cartId1);

      expect(foundOrder).toBe(order1);
      expect(foundOrder?.cartId.getValue()).toBe(cartId1.getValue());
    });
  });
});
