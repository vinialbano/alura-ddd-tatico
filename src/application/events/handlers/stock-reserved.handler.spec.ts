import { Test, TestingModule } from '@nestjs/testing';
import { StockReservedHandler } from './stock-reserved.handler';
import type { OrderRepository } from '../../../domain/order/order.repository';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';
import {
  IntegrationMessage,
  StockReservedPayload,
} from '../integration-message';
import { OrderBuilder } from '../../../../test/builders/order.builder';
import { OrderStatus } from '../../../domain/order/value-objects/order-status';
import { createMockOrderRepository } from '../../../../test/factories/mock-repositories.factory';

describe('StockReservedHandler', () => {
  let handler: StockReservedHandler;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    mockOrderRepository = createMockOrderRepository();

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
      const order = OrderBuilder.create()
        .withOrderId(orderId)
        .withStatus(OrderStatus.Paid)
        .build();

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
      const order = OrderBuilder.create()
        .withOrderId(orderId)
        .withStatus(OrderStatus.Paid)
        .build();

      // Properly transition to STOCK_RESERVED with reservation ID
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
      const order = OrderBuilder.create().withOrderId(orderId).build();

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
