import { Test, TestingModule } from '@nestjs/testing';
import { StockReservedHandler } from './stock-reserved.handler';
import type { OrderRepository } from '../../../domain/order/order.repository';
import { Order } from '../../../domain/order/order';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { CartId } from '../../../domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../../domain/shared/value-objects/customer-id';
import { Money } from '../../../domain/order/value-objects/money';
import { ShippingAddress } from '../../../domain/order/value-objects/shipping-address';
import { OrderItem } from '../../../domain/order/order-item';
import { ProductSnapshot } from '../../../domain/order/value-objects/product-snapshot';
import { Quantity } from '../../../domain/shared/value-objects/quantity';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';
import {
  IntegrationMessage,
  StockReservedPayload,
} from '../integration-message';

describe('StockReservedHandler', () => {
  let handler: StockReservedHandler;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockReservedHandler,
        {
          provide: ORDER_REPOSITORY,
          useValue: mockOrderRepository,
        },
      ],
    }).compile();

    handler = module.get<StockReservedHandler>(StockReservedHandler);
  });

  describe('handle', () => {
    it('should reserve stock when order exists and is in PAID state', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        [
          OrderItem.create(
            new ProductSnapshot({
              name: 'Test Product',
              description: 'Description',
              sku: 'SKU-123',
            }),
            Quantity.of(2),
            new Money(10, 'USD'),
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
        new Money(20, 'USD'),
      );

      // Mark order as paid first
      order.markAsPaid('payment-123');

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderRepository.save.mockResolvedValue(undefined);

      const message: IntegrationMessage<StockReservedPayload> = {
        messageId: 'msg-001',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          reservationId: 'reservation-123',
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);
      expect(order.status.toString()).toBe('STOCK_RESERVED');
    });

    it('should handle duplicate stock.reserved messages idempotently', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        [
          OrderItem.create(
            new ProductSnapshot({
              name: 'Test Product',
              description: 'Description',
              sku: 'SKU-123',
            }),
            Quantity.of(2),
            new Money(10, 'USD'),
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
        new Money(20, 'USD'),
      );

      // Mark order as paid and reserve stock
      order.markAsPaid('payment-123');
      order.reserveStock('reservation-123');

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderRepository.save.mockClear();

      const message: IntegrationMessage<StockReservedPayload> = {
        messageId: 'msg-002',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          reservationId: 'reservation-123', // Same reservation ID
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert - should not save for duplicate
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(order.status.toString()).toBe('STOCK_RESERVED');
    });

    it('should log warning and return when order not found', async () => {
      // Arrange
      const orderId = OrderId.generate();
      mockOrderRepository.findById.mockResolvedValue(null);

      const message: IntegrationMessage<StockReservedPayload> = {
        messageId: 'msg-003',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          reservationId: 'reservation-123',
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when order cannot reserve stock (invalid state)', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = Order.create(
        orderId,
        CartId.create(),
        CustomerId.fromString('customer-123'),
        [
          OrderItem.create(
            new ProductSnapshot({
              name: 'Test Product',
              description: 'Description',
              sku: 'SKU-123',
            }),
            Quantity.of(2),
            new Money(10, 'USD'),
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
        new Money(20, 'USD'),
      );

      // Order is still in AWAITING_PAYMENT state (not PAID)

      mockOrderRepository.findById.mockResolvedValue(order);

      const message: IntegrationMessage<StockReservedPayload> = {
        messageId: 'msg-004',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          reservationId: 'reservation-123',
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      // Act & Assert
      await expect(handler.handle(message)).rejects.toThrow();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });
});
