import { ShoppingCart } from '../shopping-cart';
import { CartItem } from '../cart-item';
import { CartId } from '../value-objects/cart-id';
import { CustomerId } from '../../shared/value-objects/customer-id';
import { ProductId } from '../../shared/value-objects/product-id';
import { Quantity } from '../../shared/value-objects/quantity';

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

  describe('restore', () => {
    it('should restore cart with items and active status', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();
      const productId = ProductId.fromString('product-1');
      const item = CartItem.create(productId, Quantity.of(5));
      items.set(productId.getValue(), item);

      const cart = new ShoppingCart({
        cartId,
        customerId,
        items,
        conversionStatus: 'active',
      });

      expect(cart.getCartId()).toBe(cartId);
      expect(cart.getCustomerId()).toBe(customerId);
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItemCount()).toBe(1);
      expect(cart.isConverted()).toBe(false);
    });

    it('should restore cart with converted status', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();
      const productId = ProductId.fromString('product-1');
      const item = CartItem.create(productId, Quantity.of(3));
      items.set(productId.getValue(), item);

      const cart = new ShoppingCart({
        cartId,
        customerId,
        items,
        conversionStatus: 'converted',
      });

      expect(cart.isConverted()).toBe(true);
      expect(cart.getItems()).toHaveLength(1);
    });

    it('should restore empty active cart', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();

      const cart = new ShoppingCart({
        cartId,
        customerId,
        items,
        conversionStatus: 'active',
      });

      expect(cart.getItemCount()).toBe(0);
      expect(cart.isConverted()).toBe(false);
    });

    it('should restore cart with multiple items', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();

      const product1 = ProductId.fromString('product-1');
      const product2 = ProductId.fromString('product-2');
      const item1 = CartItem.create(product1, Quantity.of(3));
      const item2 = CartItem.create(product2, Quantity.of(5));
      items.set(product1.getValue(), item1);
      items.set(product2.getValue(), item2);

      const cart = new ShoppingCart({
        cartId,
        customerId,
        items,
        conversionStatus: 'active',
      });

      expect(cart.getItemCount()).toBe(2);
      expect(cart.getItems()).toHaveLength(2);
    });
  });

  describe('restore - invariant validation', () => {
    it('should reject restoring cart with more than 20 products', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();

      // Add 21 products
      for (let i = 1; i <= 21; i++) {
        const productId = ProductId.fromString(`product-${i}`);
        const item = CartItem.create(productId, Quantity.of(1));
        items.set(productId.getValue(), item);
      }

      expect(
        () =>
          new ShoppingCart({
            cartId,
            customerId,
            items,
            conversionStatus: 'active',
          }),
      ).toThrow('Cart cannot contain more than 20 unique products');
    });

    it('should reject restoring empty cart with converted status', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();

      expect(
        () =>
          new ShoppingCart({
            cartId,
            customerId,
            items,
            conversionStatus: 'converted',
          }),
      ).toThrow('Cannot restore empty cart with converted status');
    });

    it('should reject restoring cart with invalid conversionStatus', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();
      const productId = ProductId.fromString('product-1');
      const item = CartItem.create(productId, Quantity.of(3));
      items.set(productId.getValue(), item);

      expect(
        () =>
          new ShoppingCart({
            cartId,
            customerId,
            items,
            conversionStatus: 'invalid-status' as never,
          }),
      ).toThrow(
        "Invalid conversionStatus: invalid-status. Must be 'active' or 'converted'",
      );
    });

    it('should allow restoring converted cart with items', () => {
      const cartId = CartId.create();
      const customerId = CustomerId.fromString('customer-1');
      const items = new Map<string, CartItem>();
      const productId = ProductId.fromString('product-1');
      const item = CartItem.create(productId, Quantity.of(5));
      items.set(productId.getValue(), item);

      const cart = new ShoppingCart({
        cartId,
        customerId,
        items,
        conversionStatus: 'converted',
      });

      expect(cart.isConverted()).toBe(true);
      expect(cart.getItemCount()).toBe(1);
    });
  });

  describe('addItem - US1', () => {
    it('should add new product to empty cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
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
        CustomerId.fromString('customer-1'),
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
        CustomerId.fromString('customer-1'),
      );
      const product1 = ProductId.fromString('product-1');
      const product2 = ProductId.fromString('product-2');

      cart.addItem(product1, Quantity.of(3));
      cart.addItem(product2, Quantity.of(5));

      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getItemCount()).toBe(2);
    });

    it('should reject invalid quantity', () => {
      // Quantity.of() will throw for invalid values
      expect(() => Quantity.of(0)).toThrow();
      expect(() => Quantity.of(-1)).toThrow();
      expect(() => Quantity.of(11)).toThrow();
    });

    it('should throw MaxProductsExceededError when adding 21st product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );

      // Add 20 unique products
      for (let i = 1; i <= 20; i++) {
        cart.addItem(ProductId.fromString(`product-${i}`), Quantity.of(1));
      }

      expect(cart.getItemCount()).toBe(20);

      // Attempt to add 21st product
      expect(() =>
        cart.addItem(ProductId.fromString('product-21'), Quantity.of(1)),
      ).toThrow('Cart cannot contain more than 20 unique products');
    });

    it('should throw when consolidation exceeds 10', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');

      cart.addItem(productId, Quantity.of(7));

      // Attempt to add more, which would exceed 10
      expect(() => cart.addItem(productId, Quantity.of(4))).toThrow(
        'Quantity must be an integer between 1 and 10',
      );
    });
  });

  describe('getItems', () => {
    it('should return defensive copy as array', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
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
        CustomerId.fromString('customer-1'),
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

  describe('markAsConverted - US4', () => {
    it('should mark cart as converted', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      expect(cart.isConverted()).toBe(false);

      cart.markAsConverted();

      expect(cart.isConverted()).toBe(true);
    });

    it('should reject converting empty cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );

      expect(cart.getItemCount()).toBe(0);

      expect(() => cart.markAsConverted()).toThrow('Cannot convert empty cart');
      expect(cart.isConverted()).toBe(false);
    });

    it('should be idempotent - allow marking already converted cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      cart.markAsConverted();
      expect(cart.isConverted()).toBe(true);

      // Should not throw when called again
      expect(() => cart.markAsConverted()).not.toThrow();
      expect(cart.isConverted()).toBe(true);
    });

    it('should reject addItem after conversion', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      cart.markAsConverted();

      expect(() =>
        cart.addItem(ProductId.fromString('product-2'), Quantity.of(5)),
      ).toThrow('has already been converted and cannot be modified');
    });

    it('should reject adding to existing product after conversion', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      cart.markAsConverted();

      // Attempt to add more of the same product
      expect(() => cart.addItem(productId, Quantity.of(2))).toThrow(
        'has already been converted and cannot be modified',
      );
    });
  });

  describe('updateItemQuantity - US2', () => {
    it('should update quantity of existing item', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      expect(cart.getItems()[0].getQuantity().getValue()).toBe(3);

      cart.updateItemQuantity(productId, Quantity.of(7));

      expect(cart.getItems()[0].getQuantity().getValue()).toBe(7);
      expect(cart.getItemCount()).toBe(1);
    });

    it('should allow increasing quantity', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(2));

      cart.updateItemQuantity(productId, Quantity.of(8));

      expect(cart.getItems()[0].getQuantity().getValue()).toBe(8);
    });

    it('should allow decreasing quantity', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(9));

      cart.updateItemQuantity(productId, Quantity.of(2));

      expect(cart.getItems()[0].getQuantity().getValue()).toBe(2);
    });

    it('should throw error for non-existent product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      expect(() =>
        cart.updateItemQuantity(
          ProductId.fromString('product-2'),
          Quantity.of(5),
        ),
      ).toThrow('Product product-2 is not in the cart');
    });

    it('should throw error for invalid quantity', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      // Invalid quantities should be rejected by Quantity value object
      expect(() => Quantity.of(0)).toThrow();
      expect(() => Quantity.of(11)).toThrow();
    });

    it('should reject update on converted cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      cart.markAsConverted();

      expect(() => cart.updateItemQuantity(productId, Quantity.of(5))).toThrow(
        'has already been converted and cannot be modified',
      );
    });
  });

  describe('removeItem - US3', () => {
    it('should remove existing item from cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      expect(cart.getItemCount()).toBe(1);

      cart.removeItem(productId);

      expect(cart.getItemCount()).toBe(0);
      expect(cart.getItems()).toHaveLength(0);
    });

    it('should make cart empty when removing last item', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(5));

      expect(cart.getItemCount()).toBe(1);

      cart.removeItem(productId);

      expect(cart.getItemCount()).toBe(0);
      expect(cart.getItems()).toHaveLength(0);
    });

    it('should throw error for non-existent product', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      cart.addItem(ProductId.fromString('product-1'), Quantity.of(3));

      expect(() => cart.removeItem(ProductId.fromString('product-2'))).toThrow(
        'Product product-2 is not in the cart',
      );
    });

    it('should reject removal on converted cart', () => {
      const cart = ShoppingCart.create(
        CartId.create(),
        CustomerId.fromString('customer-1'),
      );
      const productId = ProductId.fromString('product-1');
      cart.addItem(productId, Quantity.of(3));

      cart.markAsConverted();

      expect(() => cart.removeItem(productId)).toThrow(
        'has already been converted and cannot be modified',
      );
    });
  });
});
