import { CartService } from '../cart.service';
import { InMemoryShoppingCartRepository } from '../../../infrastructure/repositories/in-memory-shopping-cart.repository';
import { CreateCartDto } from '../../dtos/create-cart.dto';
import { AddItemDto } from '../../dtos/add-item.dto';

describe('CartService (Integration)', () => {
  let service: CartService;
  let repository: InMemoryShoppingCartRepository;

  beforeEach(() => {
    repository = new InMemoryShoppingCartRepository();
    service = new CartService(repository);
  });

  describe('createCart', () => {
    it('should create a new cart with customer ID', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-123' };

      const cartResponse = await service.createCart(createDto);

      expect(cartResponse).toBeDefined();
      expect(cartResponse.cartId).toBeDefined();
      expect(cartResponse.customerId).toBe('customer-123');
      expect(cartResponse.items).toHaveLength(0);
      expect(cartResponse.itemCount).toBe(0);
      expect(cartResponse.isConverted).toBe(false);
    });

    it('should persist cart to repository', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-456' };

      const cartResponse = await service.createCart(createDto);

      // Verify cart can be retrieved
      const retrievedCart = await service.getCart(cartResponse.cartId);
      expect(retrievedCart).toBeDefined();
      expect(retrievedCart.customerId).toBe('customer-456');
    });
  });

  describe('addItem', () => {
    it('should add item to existing cart', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      const addItemDto: AddItemDto = { productId: 'product-1', quantity: 3 };
      const updatedCart = await service.addItem(cartResponse.cartId, addItemDto);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].productId).toBe('product-1');
      expect(updatedCart.items[0].quantity).toBe(3);
      expect(updatedCart.itemCount).toBe(1);
    });

    it('should consolidate quantity when adding duplicate product', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      await service.addItem(cartResponse.cartId, {
        productId: 'product-1',
        quantity: 3,
      });
      const updatedCart = await service.addItem(cartResponse.cartId, {
        productId: 'product-1',
        quantity: 4,
      });

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].quantity).toBe(7);
      expect(updatedCart.itemCount).toBe(1);
    });

    it('should add multiple different products', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      await service.addItem(cartResponse.cartId, {
        productId: 'product-1',
        quantity: 2,
      });
      const updatedCart = await service.addItem(cartResponse.cartId, {
        productId: 'product-2',
        quantity: 5,
      });

      expect(updatedCart.items).toHaveLength(2);
      expect(updatedCart.itemCount).toBe(2);
    });

    it('should throw error when cart not found', async () => {
      const addItemDto: AddItemDto = { productId: 'product-1', quantity: 3 };
      const nonExistentCartId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.addItem(nonExistentCartId, addItemDto)
      ).rejects.toThrow('Cart not found');
    });

    it('should throw error for invalid quantity', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      const addItemDto: AddItemDto = { productId: 'product-1', quantity: 0 };

      await expect(
        service.addItem(cartResponse.cartId, addItemDto)
      ).rejects.toThrow();
    });

    it('should throw error when exceeding max products', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      // Add 20 unique products
      for (let i = 1; i <= 20; i++) {
        await service.addItem(cartResponse.cartId, {
          productId: `product-${i}`,
          quantity: 1,
        });
      }

      // Attempt to add 21st product
      await expect(
        service.addItem(cartResponse.cartId, {
          productId: 'product-21',
          quantity: 1,
        })
      ).rejects.toThrow('Cart cannot contain more than 20 unique products');
    });

    it('should throw error when consolidation exceeds max quantity', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      await service.addItem(cartResponse.cartId, {
        productId: 'product-1',
        quantity: 7,
      });

      await expect(
        service.addItem(cartResponse.cartId, {
          productId: 'product-1',
          quantity: 4,
        })
      ).rejects.toThrow('Quantity must be an integer between 1 and 10');
    });
  });

  describe('getCart', () => {
    it('should retrieve existing cart', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-789' };
      const cartResponse = await service.createCart(createDto);

      const retrievedCart = await service.getCart(cartResponse.cartId);

      expect(retrievedCart).toBeDefined();
      expect(retrievedCart.cartId).toBe(cartResponse.cartId);
      expect(retrievedCart.customerId).toBe('customer-789');
    });

    it('should throw error when cart not found', async () => {
      const nonExistentCartId = '00000000-0000-0000-0000-000000000000';

      await expect(service.getCart(nonExistentCartId)).rejects.toThrow(
        'Cart not found'
      );
    });

    it('should return cart with items', async () => {
      const createDto: CreateCartDto = { customerId: 'customer-1' };
      const cartResponse = await service.createCart(createDto);

      await service.addItem(cartResponse.cartId, {
        productId: 'product-1',
        quantity: 3,
      });
      await service.addItem(cartResponse.cartId, {
        productId: 'product-2',
        quantity: 5,
      });

      const retrievedCart = await service.getCart(cartResponse.cartId);

      expect(retrievedCart.items).toHaveLength(2);
      expect(retrievedCart.itemCount).toBe(2);
    });
  });
});
