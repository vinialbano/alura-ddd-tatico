import { ShoppingCart } from '../shopping-cart';
import { CartId } from '../../value-objects/cart-id';
import { CustomerId } from '../../value-objects/customer-id';
import { ProductId } from '../../value-objects/product-id';
import { Quantity } from '../../value-objects/quantity';

describe('ShoppingCart', () => {
  describe('create', () => {
    it('should create empty active cart with CustomerId', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');

      const cart = ShoppingCart.create(cartId, customerId);

      expect(cart.getCartId()).toBe(cartId);
      expect(cart.getCustomerId()).toBe(customerId);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.isConverted()).toBe(false);
      expect(cart.getItemCount()).toBe(0);
    });

    it('should require CustomerId at creation', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-123');

      const cart = ShoppingCart.create(cartId, customerId);

      expect(cart.getCustomerId()).toBe(customerId);
    });
  });

  describe('addItem - US1', () => {
    it('should add new product to empty cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      const productId = ProductId.fromString('product-1');
      const quantity = Quantity.of(3);

      cart.addItem(productId, quantity);

      const items = cart.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].getProductId()).toBe(productId);
      expect(items[0].getQuantity()).toBe(quantity);
      expect(cart.getItemCount()).toBe(1);
    });

    it('should consolidate quantity for duplicate product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      const productId = ProductId.fromString('product-1');

      cart.addItem(productId, Quantity.of(3));
      cart.addItem(productId, Quantity.of(4));

      const items = cart.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].getQuantity().getValue()).toBe(7);
    });

    it('should create separate line for different product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      const product1 = ProductId.fromString('product-1');
      const product2 = ProductId.fromString('product-2');

      cart.addItem(product1, Quantity.of(3));
      cart.addItem(product2, Quantity.of(5));

      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getItemCount()).toBe(2);
    });

    it('should reject invalid quantity', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      const productId = ProductId.fromString('product-1');

      // Quantity.of() will throw for invalid values
      expect(() => Quantity.of(0)).toThrow();
      expect(() => Quantity.of(-1)).toThrow();
      expect(() => Quantity.of(11)).toThrow();
    });

    it('should throw MaxProductsExceededError when adding 21st product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );

      // Add 20 unique products
      for (let i = 1; i <= 20; i++) {
        cart.addItem(ProductId.fromString(`product-${i}`), Quantity.of(1));
      }

      expect(cart.getItemCount()).toBe(20);

      // Attempt to add 21st product
      expect(() =>
        cart.addItem(ProductId.fromString('product-21'), Quantity.of(1))
      ).toThrow('Cart cannot contain more than 20 unique products');
    });

    it('should throw when consolidation exceeds 10', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      const productId = ProductId.fromString('product-1');

      cart.addItem(productId, Quantity.of(7));

      // Attempt to add more, which would exceed 10
      expect(() => cart.addItem(productId, Quantity.of(4))).toThrow(
        'Quantity must be an integer between 1 and 10'
      );
    });
  });

  describe('getItems', () => {
    it('should return defensive copy as array', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      const items1 = cart.getItems();
      const items2 = cart.getItems();

      // Should be different array instances (defensive copy)
      expect(items1).not.toBe(items2);
      expect(items1).toHaveLength(1);
      expect(items2).toHaveLength(1);
    });
  });

  describe('getItemCount', () => {
    it('should return correct count', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1')
      );

      expect(cart.getItemCount()).toBe(0);

      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));
      expect(cart.getItemCount()).toBe(1);

      cart.addItem(ProductId.fromString('product-2'), Quantity.of(5));
      expect(cart.getItemCount()).toBe(2);

      // Adding duplicate doesn't increase count
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(2));
      expect(cart.getItemCount()).toBe(2);
    });
  });
});
