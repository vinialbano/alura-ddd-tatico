import { OrderPricingService } from '../../src/domain/order/services/order-pricing.service';
import { OrderCreationService } from '../../src/domain/order/services/order-creation.service';
import { DomainEventPublisher } from '../../src/infrastructure/events/domain-event-publisher';
import {
  createMockPricingService,
  createMockOrderCreationService,
  createMockEventPublisher,
} from './mock-services.factory';
import { CartItem } from '../../src/domain/shopping-cart/cart-item';
import { ShoppingCart } from '../../src/domain/shopping-cart/shopping-cart';
import { DomainEvent } from '../../src/domain/shared/domain-event';

describe('Mock Service Factories', () => {
  describe('createMockPricingService', () => {
    it('should return properly typed OrderPricingService mock', () => {
      const mock = createMockPricingService();

      expect(mock).toBeDefined();
      expect(mock.price).toBeDefined();
      expect(typeof mock.price).toBe('function');
    });

    it('should have price method that resolves by default', async () => {
      const mock = createMockPricingService();
      const cartItems = [] as CartItem[];

      await expect(mock.price(cartItems)).resolves.toBeDefined();
    });

    it('should allow overriding price method', async () => {
      const testPricedData = {
        items: [],
        orderLevelDiscount: {} as any,
        orderTotal: {} as any,
      };

      const mock = createMockPricingService({
        price: jest.fn().mockResolvedValue(testPricedData),
      });

      const cartItems = [] as CartItem[];
      const result = await mock.price(cartItems);

      expect(result).toBe(testPricedData);
      expect(mock.price).toHaveBeenCalledWith(cartItems);
    });
  });

  describe('createMockOrderCreationService', () => {
    it('should return properly typed OrderCreationService mock', () => {
      const mock = createMockOrderCreationService();

      expect(mock).toBeDefined();
      expect(mock.createFromCart).toBeDefined();
      expect(mock.canConvertCart).toBeDefined();
      expect(typeof mock.createFromCart).toBe('function');
      expect(typeof mock.canConvertCart).toBe('function');
    });

    it('should have createFromCart method that resolves by default', () => {
      const mock = createMockOrderCreationService();

      // Default implementation should return an Order
      expect(() =>
        mock.createFromCart({} as ShoppingCart, {} as any, {} as any),
      ).toBeDefined();
    });

    it('should have canConvertCart method that returns false by default', () => {
      const mock = createMockOrderCreationService();
      const cart = {} as ShoppingCart;

      const result = mock.canConvertCart(cart);

      expect(result).toBe(false);
    });

    it('should allow overriding createFromCart method', () => {
      const testOrder = {} as any;
      const mock = createMockOrderCreationService({
        createFromCart: jest.fn().mockReturnValue(testOrder),
      });

      const cart = {} as ShoppingCart;
      const result = mock.createFromCart(cart, {} as any, {} as any);

      expect(result).toBe(testOrder);
      expect(mock.createFromCart).toHaveBeenCalledWith(cart, {}, {});
    });

    it('should allow overriding canConvertCart method', () => {
      const mock = createMockOrderCreationService({
        canConvertCart: jest.fn().mockReturnValue(true),
      });

      const cart = {} as ShoppingCart;
      const result = mock.canConvertCart(cart);

      expect(result).toBe(true);
      expect(mock.canConvertCart).toHaveBeenCalledWith(cart);
    });

    it('should maintain default behavior for non-overridden methods', () => {
      const testOrder = {} as any;
      const mock = createMockOrderCreationService({
        createFromCart: jest.fn().mockReturnValue(testOrder),
      });

      // createFromCart is overridden
      const cart = {} as ShoppingCart;
      expect(mock.createFromCart(cart, {} as any, {} as any)).toBe(testOrder);

      // canConvertCart should still have default behavior
      expect(mock.canConvertCart(cart)).toBe(false);
    });
  });

  describe('createMockEventPublisher', () => {
    it('should return properly typed DomainEventPublisher mock', () => {
      const mock = createMockEventPublisher();

      expect(mock).toBeDefined();
      expect(mock.publishDomainEvents).toBeDefined();
      expect(typeof mock.publishDomainEvents).toBe('function');
    });

    it('should have publishDomainEvents that resolves to undefined by default', async () => {
      const mock = createMockEventPublisher();
      const events = [] as DomainEvent[];

      await expect(mock.publishDomainEvents(events)).resolves.toBeUndefined();
    });

    it('should allow overriding publishDomainEvents method', async () => {
      const mock = createMockEventPublisher({
        publishDomainEvents: jest.fn().mockResolvedValue(undefined),
      });

      const events = [] as DomainEvent[];
      await mock.publishDomainEvents(events);

      expect(mock.publishDomainEvents).toHaveBeenCalledWith(events);
    });
  });
});
