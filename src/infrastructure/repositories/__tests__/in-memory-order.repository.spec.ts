import { InMemoryOrderRepository } from '../in-memory-order.repository';
import { Order } from '../../../domain/order/order';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { Money } from '../../../domain/order/value-objects/money';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';
import { OrderItem } from '../../../domain/order/order-item';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { Quantity } from '../../../domain/shared/value-objects/quantity';

describe('InMemoryOrderRepository', () => {
  let repository: InMemoryOrderRepository;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
  });

  const createTestOrder = (cartId?: CartId): Order => {
    const testCartId = cartId || CartId.create();
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

    return Order.create(
      OrderId.generate(),
      testCartId,
      testCustomerId,
      [orderItem],
      shippingAddress,
      new Money(0, 'USD'),
      new Money(10.0, 'USD'),
    );
  };

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
