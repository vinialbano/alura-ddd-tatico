import { CheckoutService } from '../checkout.service';
import { ShoppingCartRepository } from '../../../domain/shopping-cart/shopping-cart.repository';
import { OrderRepository } from '../../../domain/order/order.repository';
import { OrderPricingService } from '../../../domain/order/services/order-pricing.service';
import { OrderCreationService } from '../../../domain/order/services/order-creation.service';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { ProductId } from '../../../domain/shared/value-objects/product-id';
import { Quantity } from '../../../domain/shared/value-objects/quantity';
import { Money } from '../../../domain/order/value-objects/money';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { ShoppingCart } from '../../../domain/shopping-cart/shopping-cart';
import { CartNotFoundException } from '../../exceptions/cart-not-found.exception';
import { OrderItem } from '../../../domain/order/order-item';
import { CheckoutDTO } from '../../dtos/checkout.dto';
import { Order } from '../../../domain/order/order';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';
import { EmptyCartError } from '../../../domain/shopping-cart/exceptions/empty-cart.error';

const createCheckoutDto = (cartId: string): CheckoutDTO => ({
  cartId,
  shippingAddress: {
    street: '123 Main St',
    city: 'Springfield',
    stateOrProvince: 'IL',
    postalCode: '62701',
    country: 'USA',
  },
});

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockCartRepository: jest.Mocked<ShoppingCartRepository>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockPricingService: jest.Mocked<OrderPricingService>;
  let mockOrderCreationService: jest.Mocked<OrderCreationService>;

  const testCustomerId = CustomerId.fromString('customer-123');
  const testCartId = CartId.create();
  const testProductId = ProductId.fromString('COFFEE-COL-001');

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

    mockOrderCreationService = {
      createFromCart: jest.fn(),
      canConvertCart: jest.fn(),
    } as any;

    service = new CheckoutService(
      mockCartRepository,
      mockOrderRepository,
      mockPricingService,
      mockOrderCreationService,
    );
  });

  describe('checkout', () => {
    it('should throw CartNotFoundException if cart does not exist', async () => {
      // Arrange
      mockCartRepository.findById.mockResolvedValue(null);
      const dto = createCheckoutDto(testCartId.getValue());

      // Act & Assert
      await expect(service.checkout(dto)).rejects.toThrow(
        CartNotFoundException,
      );

      expect(mockPricingService.price).not.toHaveBeenCalled();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should validate cart is not empty before checkout', async () => {
      // Arrange
      const emptyCart = ShoppingCart.create(testCartId, testCustomerId);
      mockCartRepository.findById.mockResolvedValue(emptyCart);

      const mockPricedData = {
        items: [],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(0, 'USD'),
      };
      mockPricingService.price.mockResolvedValue(mockPricedData);

      // OrderCreationService will throw EmptyCartError
      mockOrderCreationService.createFromCart.mockImplementation(() => {
        throw new EmptyCartError();
      });

      const dto = createCheckoutDto(testCartId.getValue());

      // Act & Assert
      await expect(service.checkout(dto)).rejects.toThrow(
        'Cannot convert empty cart',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return OrderResponseDTO with all fields on successful checkout', async () => {
      // Arrange
      const cart = ShoppingCart.create(testCartId, testCustomerId);
      cart.addItem(testProductId, Quantity.of(2));
      mockCartRepository.findById.mockResolvedValue(cart);

      const mockPricedData = {
        items: [
          OrderItem.create(
            new ProductSnapshot({
              name: 'Premium Coffee Beans',
              description: 'Test description',
              sku: 'COFFEE-COL-001',
            }),
            Quantity.of(2),
            new Money(24.99, 'USD'),
            new Money(0, 'USD'),
          ),
        ],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(49.98, 'USD'),
      };
      mockPricingService.price.mockResolvedValue(mockPricedData);

      // Mock OrderCreationService to return an Order
      const mockOrder = Order.create(
        OrderId.generate(),
        testCartId,
        testCustomerId,
        mockPricedData.items,
        new ShippingAddress({
          street: '123 Main St',
          city: 'Springfield',
          stateOrProvince: 'IL',
          postalCode: '62701',
          country: 'USA',
        }),
        mockPricedData.orderLevelDiscount,
        mockPricedData.orderTotal,
      );
      mockOrderCreationService.createFromCart.mockReturnValue(mockOrder);

      const dto = createCheckoutDto(testCartId.getValue());

      // Act
      const response = await service.checkout(dto);

      // Assert - DTO structure
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('cartId', testCartId.getValue());
      expect(response).toHaveProperty('customerId', testCustomerId.getValue());
      expect(response).toHaveProperty('items');
      expect(response).toHaveProperty('shippingAddress');
      expect(response.shippingAddress).toHaveProperty('street', '123 Main St');
      expect(response).toHaveProperty('status', 'AWAITING_PAYMENT');
      expect(response).toHaveProperty('totalAmount');
      expect(response.totalAmount).toHaveProperty('amount');
      expect(response.totalAmount).toHaveProperty('currency', 'USD');

      // Assert - items array
      expect(response.items).toHaveLength(1);
      expect(response.items[0]).toHaveProperty('productSnapshot');
      expect(response.items[0].productSnapshot).toHaveProperty(
        'name',
        'Premium Coffee Beans',
      );

      // Assert - repositories called
      expect(mockOrderRepository.save).toHaveBeenCalled();
      expect(mockCartRepository.save).toHaveBeenCalled();
    });

    it('should return existing order when cart is already converted', async () => {
      // Arrange
      const cart = ShoppingCart.create(testCartId, testCustomerId);
      cart.addItem(testProductId, Quantity.of(2));

      const existingOrderId = OrderId.generate();
      const existingOrder = Order.create(
        existingOrderId,
        testCartId,
        testCustomerId,
        [
          OrderItem.create(
            new ProductSnapshot({
              name: 'Premium Coffee Beans',
              description: 'Test description',
              sku: 'COFFEE-COL-001',
            }),
            Quantity.of(2),
            new Money(24.99, 'USD'),
            new Money(0, 'USD'),
          ),
        ],
        new ShippingAddress({
          street: '123 Main St',
          city: 'Springfield',
          stateOrProvince: 'IL',
          postalCode: '62701',
          country: 'USA',
        }),
        new Money(0, 'USD'),
        new Money(49.98, 'USD'),
      );

      // Mark cart as converted
      cart.markAsConverted();

      mockCartRepository.findById.mockResolvedValue(cart);
      mockOrderRepository.findByCartId.mockResolvedValue(existingOrder);

      const dto = createCheckoutDto(testCartId.getValue());

      // Act
      const response = await service.checkout(dto);

      // Assert
      expect(response.id).toBe(existingOrderId.getValue());
      expect(mockOrderRepository.findByCartId).toHaveBeenCalledWith(testCartId);
      expect(mockPricingService.price).not.toHaveBeenCalled();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });
  });
});
