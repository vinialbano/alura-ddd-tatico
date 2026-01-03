import { CheckoutService } from '../checkout.service';
import { ShoppingCartRepository } from '../../../domain/shopping-cart/shopping-cart.repository';
import { OrderRepository } from '../../../domain/order/order.repository';
import { OrderPricingService } from '../../../domain/order/services/order-pricing.service';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { ProductId } from '../../../domain/shared/value-objects/product-id';
import { Quantity } from '../../../domain/shared/value-objects/quantity';
import { Money } from '../../../domain/order/value-objects/money';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { CartItem } from '../../../domain/shopping-cart/cart-item';
import { ShoppingCart } from '../../../domain/shopping-cart/shopping-cart';
import { CartNotFoundException } from '../../exceptions/cart-not-found.exception';
import { OrderItem } from '../../../domain/order/order-item';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockCartRepository: jest.Mocked<ShoppingCartRepository>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockPricingService: jest.Mocked<OrderPricingService>;

  const testCustomerId = CustomerId.fromString('customer-123');
  const testCartId = CartId.create();
  const testProductId = ProductId.fromString('COFFEE-COL-001');
  const testAddress = new ShippingAddress({
    street: '123 Main St',
    city: 'Springfield',
    stateOrProvince: 'IL',
    postalCode: '62701',
    country: 'USA',
  });

  beforeEach(() => {
    mockCartRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
    } as any;

    mockOrderRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCartId: jest.fn(),
    } as any;

    mockPricingService = {
      price: jest.fn(),
    } as any;

    service = new CheckoutService(
      mockCartRepository,
      mockOrderRepository,
      mockPricingService,
    );
  });

  describe('checkout', () => {
    it('should throw CartNotFoundException if cart does not exist', async () => {
      // Arrange
      mockCartRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkout(testCartId, testAddress)).rejects.toThrow(
        CartNotFoundException,
      );

      expect(mockPricingService.price).not.toHaveBeenCalled();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should validate cart is not empty before checkout', async () => {
      // Arrange
      const emptyCart = ShoppingCart.create(testCartId, testCustomerId);

      mockCartRepository.findById.mockResolvedValue(emptyCart);

      // Act & Assert
      await expect(
        service.checkout(emptyCart.getCartId(), testAddress),
      ).rejects.toThrow('Cannot checkout empty cart');

      expect(mockPricingService.price).not.toHaveBeenCalled();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });
});
