import { Money } from '../../../../../../shared/value-objects/money';
import {
  PricingGateway,
  PricingResult,
} from '../../../../application/gateways/pricing.gateway.interface';
import { ProductId } from '../../../shared/value-objects/product-id';
import { Quantity } from '../../../shared/value-objects/quantity';
import { CartItem } from '../../../shopping-cart/cart-item';
import { OrderPricingService } from '../order-pricing.service';

describe('OrderPricingService', () => {
  let orderPricingService: OrderPricingService;
  let mockPricingGateway: jest.Mocked<PricingGateway>;

  beforeEach(() => {
    mockPricingGateway = {
      calculatePricing: jest.fn(),
    };

    orderPricingService = new OrderPricingService(mockPricingGateway);
  });

  const createCartItem = (
    productIdValue: string,
    quantityValue: number,
  ): CartItem => {
    return CartItem.create(
      ProductId.fromString(productIdValue),
      Quantity.of(quantityValue),
    );
  };

  describe('Successful Pricing Flow', () => {
    it('should call pricing gateway to return fully priced order data', async () => {
      const cartItems = [
        createCartItem('product-1', 2),
        createCartItem('product-2', 1),
      ];

      const pricingResult: PricingResult = {
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(50.0, 'USD'),
            itemDiscount: new Money(5.0, 'USD'),
            lineTotal: new Money(95.0, 'USD'),
          },
          {
            productId: ProductId.fromString('product-2'),
            unitPrice: new Money(30.0, 'USD'),
            itemDiscount: new Money(0, 'USD'),
            lineTotal: new Money(30.0, 'USD'),
          },
        ],
        orderLevelDiscount: new Money(10.0, 'USD'),
        orderTotal: new Money(115.0, 'USD'),
      };

      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      expect(mockPricingGateway.calculatePricing).toHaveBeenCalledTimes(1);
      expect(mockPricingGateway.calculatePricing).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: cartItems[0].getProductId(),
            quantity: cartItems[0].getQuantity(),
          }),
          expect.objectContaining({
            productId: cartItems[1].getProductId(),
            quantity: cartItems[1].getQuantity(),
          }),
        ]),
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].productId.equals(ProductId.fromString('product-1'))).toBe(true);
      expect(result.items[0].quantity.getValue()).toBe(2);
      expect(result.items[0].unitPrice.amount).toBe(50.0);
      expect(result.items[0].itemDiscount.amount).toBe(5.0);

      expect(result.items[1].productId.equals(ProductId.fromString('product-2'))).toBe(true);
      expect(result.items[1].quantity.getValue()).toBe(1);
      expect(result.items[1].unitPrice.amount).toBe(30.0);
      expect(result.items[1].itemDiscount.amount).toBe(0);

      expect(result.orderLevelDiscount.amount).toBe(10.0);
      expect(result.orderTotal.amount).toBe(115.0);
    });

    it('should handle single cart item', async () => {
      const cartItems = [createCartItem('product-1', 3)];

      const pricingResult: PricingResult = {
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(20.0, 'USD'),
            itemDiscount: new Money(0, 'USD'),
            lineTotal: new Money(60.0, 'USD'),
          },
        ],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(60.0, 'USD'),
      };

      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId.equals(ProductId.fromString('product-1'))).toBe(true);
      expect(result.orderTotal.amount).toBe(60.0);
    });

    it('should preserve currency consistency across all items', async () => {
      const cartItems = [
        createCartItem('product-1', 2),
        createCartItem('product-2', 1),
      ];

      const pricingResult: PricingResult = {
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(50.0, 'EUR'),
            itemDiscount: new Money(5.0, 'EUR'),
            lineTotal: new Money(95.0, 'EUR'),
          },
          {
            productId: ProductId.fromString('product-2'),
            unitPrice: new Money(30.0, 'EUR'),
            itemDiscount: new Money(0, 'EUR'),
            lineTotal: new Money(30.0, 'EUR'),
          },
        ],
        orderLevelDiscount: new Money(10.0, 'EUR'),
        orderTotal: new Money(115.0, 'EUR'),
      };

      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      const currencies = [
        ...result.items.map((item) => item.unitPrice.currency),
        ...result.items.map((item) => item.itemDiscount.currency),
        result.orderLevelDiscount.currency,
        result.orderTotal.currency,
      ];

      const allSameCurrency = currencies.every((c) => c === 'EUR');
      expect(allSameCurrency).toBe(true);
    });
  });

  describe('Error Handling: Pricing Failures', () => {
    it('should throw Error when pricing calculation fails', async () => {
      const cartItems = [createCartItem('product-1', 2)];

      mockPricingGateway.calculatePricing.mockRejectedValue(
        new Error('Failed to calculate pricing: Pricing service unavailable'),
      );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow(Error);
      await expect(orderPricingService.price(cartItems)).rejects.toThrow(
        'Failed to calculate pricing',
      );
    });

    it('should throw Error when pricing times out', async () => {
      const cartItems = [createCartItem('product-1', 1)];

      mockPricingGateway.calculatePricing.mockRejectedValue(
        new Error('Failed to calculate pricing: Request timeout'),
      );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow(Error);
      await expect(orderPricingService.price(cartItems)).rejects.toThrow(
        'Failed to calculate pricing',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cart items array gracefully', async () => {
      const emptyCartItems: CartItem[] = [];

      const emptyPricingResult: PricingResult = {
        items: [],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(0, 'USD'),
      };

      mockPricingGateway.calculatePricing.mockResolvedValue(emptyPricingResult);

      const result = await orderPricingService.price(emptyCartItems);

      expect(result.items).toHaveLength(0);
      expect(result.orderTotal.amount).toBe(0);
    });

    it('should handle maximum quantity items correctly', async () => {
      const cartItems = [createCartItem('product-1', 10)]; // Max quantity from Quantity value object

      mockPricingGateway.calculatePricing.mockResolvedValue({
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(10.0, 'USD'),
            itemDiscount: new Money(5.0, 'USD'),
            lineTotal: new Money(95.0, 'USD'),
          },
        ],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(95.0, 'USD'),
      });

      const result = await orderPricingService.price(cartItems);

      expect(result.items[0].quantity.getValue()).toBe(10);
      expect(result.orderTotal.amount).toBe(95.0);
    });
  });

  describe('Domain Service Orchestration', () => {
    it('should call pricing gateway with cart items', async () => {
      const cartItems = [createCartItem('product-1', 1)];

      mockPricingGateway.calculatePricing.mockResolvedValue({
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(10.0, 'USD'),
            itemDiscount: new Money(0, 'USD'),
            lineTotal: new Money(10.0, 'USD'),
          },
        ],
        orderLevelDiscount: new Money(0, 'USD'),
        orderTotal: new Money(10.0, 'USD'),
      });

      await orderPricingService.price(cartItems);

      expect(mockPricingGateway.calculatePricing).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: cartItems[0].getProductId(),
            quantity: cartItems[0].getQuantity(),
          }),
        ]),
      );
    });

    it('should aggregate pricing data with cart items correctly', async () => {
      const cartItems = [createCartItem('product-1', 3)];

      const pricingResult: PricingResult = {
        items: [
          {
            productId: ProductId.fromString('product-1'),
            unitPrice: new Money(25.0, 'USD'),
            itemDiscount: new Money(2.5, 'USD'),
            lineTotal: new Money(72.5, 'USD'),
          },
        ],
        orderLevelDiscount: new Money(5.0, 'USD'),
        orderTotal: new Money(67.5, 'USD'),
      };

      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      // Verify product ID preserved from cart
      expect(result.items[0].productId.equals(ProductId.fromString('product-1'))).toBe(true);

      // Verify pricing data
      expect(result.items[0].unitPrice.amount).toBe(25.0);
      expect(result.items[0].itemDiscount.amount).toBe(2.5);

      // Verify quantity preserved from cart
      expect(result.items[0].quantity.getValue()).toBe(3);

      // Verify order-level data
      expect(result.orderLevelDiscount.amount).toBe(5.0);
      expect(result.orderTotal.amount).toBe(67.5);
    });
  });
});
