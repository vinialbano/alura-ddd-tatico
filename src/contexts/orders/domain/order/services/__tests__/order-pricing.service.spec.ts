import {
  CatalogGateway,
  ProductData,
} from '../../../../application/gateways/catalog.gateway.interface';
import {
  PricingGateway,
  PricingResult,
} from '../../../../application/gateways/pricing.gateway.interface';
import { ProductId } from '../../../shared/value-objects/product-id';
import { Quantity } from '../../../shared/value-objects/quantity';
import { CartItem } from '../../../shopping-cart/cart-item';
import { Money } from '../../../../../../shared/value-objects/money';
import { OrderPricingService } from '../order-pricing.service';

describe('OrderPricingService', () => {
  let orderPricingService: OrderPricingService;
  let mockCatalogGateway: jest.Mocked<CatalogGateway>;
  let mockPricingGateway: jest.Mocked<PricingGateway>;

  beforeEach(() => {
    mockCatalogGateway = {
      getProductData: jest.fn(),
    };

    mockPricingGateway = {
      calculatePricing: jest.fn(),
    };

    orderPricingService = new OrderPricingService(
      mockCatalogGateway,
      mockPricingGateway,
    );
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
    it('should orchestrate catalog and pricing gateways to return fully priced order data', async () => {
      const cartItems = [
        createCartItem('product-1', 2),
        createCartItem('product-2', 1),
      ];

      const productDataMap: ProductData[] = [
        {
          name: 'Premium Coffee Beans',
          description: 'Single-origin Arabica beans from Colombia',
          sku: 'COFFEE-COL-001',
        },
        {
          name: 'Coffee Grinder',
          description: 'Burr coffee grinder for perfect grinding',
          sku: 'GRINDER-001',
        },
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

      mockCatalogGateway.getProductData
        .mockResolvedValueOnce(productDataMap[0])
        .mockResolvedValueOnce(productDataMap[1]);
      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      expect(mockCatalogGateway.getProductData).toHaveBeenCalledTimes(2);
      expect(mockCatalogGateway.getProductData).toHaveBeenCalledWith(
        cartItems[0].getProductId(),
      );
      expect(mockCatalogGateway.getProductData).toHaveBeenCalledWith(
        cartItems[1].getProductId(),
      );

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
      expect(result.items[0].productSnapshot.name).toBe('Premium Coffee Beans');
      expect(result.items[0].productSnapshot.sku).toBe('COFFEE-COL-001');
      expect(result.items[0].quantity.getValue()).toBe(2);
      expect(result.items[0].unitPrice.amount).toBe(50.0);
      expect(result.items[0].itemDiscount.amount).toBe(5.0);

      expect(result.items[1].productSnapshot.name).toBe('Coffee Grinder');
      expect(result.items[1].productSnapshot.sku).toBe('GRINDER-001');
      expect(result.items[1].quantity.getValue()).toBe(1);
      expect(result.items[1].unitPrice.amount).toBe(30.0);
      expect(result.items[1].itemDiscount.amount).toBe(0);

      expect(result.orderLevelDiscount.amount).toBe(10.0);
      expect(result.orderTotal.amount).toBe(115.0);
    });

    it('should handle single cart item', async () => {
      const cartItems = [createCartItem('product-1', 3)];

      const productData: ProductData = {
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-SKU-001',
      };

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

      mockCatalogGateway.getProductData.mockResolvedValue(productData);
      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productSnapshot.name).toBe('Test Product');
      expect(result.orderTotal.amount).toBe(60.0);
    });

    it('should preserve currency consistency across all items', async () => {
      const cartItems = [
        createCartItem('product-1', 2),
        createCartItem('product-2', 1),
      ];

      const productDataMap: ProductData[] = [
        {
          name: 'Product A',
          description: 'Description A',
          sku: 'SKU-A',
        },
        {
          name: 'Product B',
          description: 'Description B',
          sku: 'SKU-B',
        },
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

      mockCatalogGateway.getProductData
        .mockResolvedValueOnce(productDataMap[0])
        .mockResolvedValueOnce(productDataMap[1]);
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

  describe('Error Handling: Catalog Failures', () => {
    it('should throw Error when catalog lookup fails for any product', async () => {
      const cartItems = [
        createCartItem('product-1', 2),
        createCartItem('product-2', 1),
      ];

      mockCatalogGateway.getProductData
        .mockResolvedValueOnce({
          name: 'Product 1',
          description: 'Description 1',
          sku: 'SKU-1',
        })
        .mockRejectedValueOnce(
          new Error(
            'Failed to fetch product data from catalog: Product not found',
          ),
        );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow(Error);
    });

    it('should throw Error when catalog times out', async () => {
      const cartItems = [createCartItem('product-1', 1)];

      mockCatalogGateway.getProductData.mockRejectedValue(
        new Error('Failed to fetch product data from catalog: Request timeout'),
      );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow(Error);
      await expect(orderPricingService.price(cartItems)).rejects.toThrow(
        'Failed to fetch product data from catalog',
      );
    });

    it('should throw Error when catalog service is unavailable', async () => {
      const cartItems = [createCartItem('product-1', 1)];

      mockCatalogGateway.getProductData.mockRejectedValue(
        new Error(
          'Failed to fetch product data from catalog: Service unavailable',
        ),
      );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow(Error);
    });

    it('should not call pricing gateway if catalog lookup fails', async () => {
      const cartItems = [createCartItem('product-1', 1)];

      mockCatalogGateway.getProductData.mockRejectedValue(
        new Error('Failed to fetch product data from catalog: Catalog error'),
      );

      await expect(orderPricingService.price(cartItems)).rejects.toThrow();

      expect(mockPricingGateway.calculatePricing).not.toHaveBeenCalled();
      expect(mockCatalogGateway.getProductData).toHaveBeenCalled();
    });
  });

  describe('Error Handling: Pricing Failures', () => {
    it('should throw Error when pricing calculation fails', async () => {
      const cartItems = [createCartItem('product-1', 2)];

      mockCatalogGateway.getProductData.mockResolvedValue({
        name: 'Product 1',
        description: 'Description 1',
        sku: 'SKU-1',
      });

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

      mockCatalogGateway.getProductData.mockResolvedValue({
        name: 'Product 1',
        description: 'Description 1',
        sku: 'SKU-1',
      });

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
      expect(mockCatalogGateway.getProductData).not.toHaveBeenCalled();
    });

    it('should handle maximum quantity items correctly', async () => {
      const cartItems = [createCartItem('product-1', 10)]; // Max quantity from Quantity value object

      mockCatalogGateway.getProductData.mockResolvedValue({
        name: 'Bulk Product',
        description: 'Large quantity product',
        sku: 'BULK-001',
      });

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
    it('should call gateways in correct sequence: catalog first, then pricing', async () => {
      const cartItems = [createCartItem('product-1', 1)];
      const callSequence: string[] = [];

      mockCatalogGateway.getProductData.mockImplementation(() => {
        callSequence.push('catalog');
        return Promise.resolve({
          name: 'Product 1',
          description: 'Description 1',
          sku: 'SKU-1',
        });
      });

      mockPricingGateway.calculatePricing.mockImplementation(() => {
        callSequence.push('pricing');
        return Promise.resolve({
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
      });

      await orderPricingService.price(cartItems);

      expect(callSequence).toEqual(['catalog', 'pricing']);
    });

    it('should aggregate product snapshots with pricing data correctly', async () => {
      const cartItems = [createCartItem('product-1', 3)];

      const productData: ProductData = {
        name: 'Aggregation Test Product',
        description: 'Test aggregation of catalog and pricing',
        sku: 'AGGR-001',
      };

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

      mockCatalogGateway.getProductData.mockResolvedValue(productData);
      mockPricingGateway.calculatePricing.mockResolvedValue(pricingResult);

      const result = await orderPricingService.price(cartItems);

      // Verify snapshot from catalog
      expect(result.items[0].productSnapshot.name).toBe(
        'Aggregation Test Product',
      );
      expect(result.items[0].productSnapshot.sku).toBe('AGGR-001');

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
