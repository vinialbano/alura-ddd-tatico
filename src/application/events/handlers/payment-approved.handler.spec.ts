import { Test, TestingModule } from '@nestjs/testing';
import { PaymentApprovedHandler } from './payment-approved.handler';
import type { OrderRepository } from '../../../domain/order/order.repository';
import { OrderId } from '../../../domain/order/value-objects/order-id';
import { ORDER_REPOSITORY } from '../../../infrastructure/modules/order.module';
import { DomainEventPublisher } from '../../../infrastructure/events/domain-event-publisher';
import {
  IntegrationMessage,
  PaymentApprovedPayload,
} from '../integration-message';
import { OrderBuilder } from '../../../../test/builders/order.builder';
import { createMockOrderRepository, createMockEventPublisher } from '../../../../test/factories/mock-repositories.factory';

describe('PaymentApprovedHandler', () => {
  let handler: PaymentApprovedHandler;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  beforeEach(async () => {
    mockOrderRepository = createMockOrderRepository();
    mockEventPublisher = createMockEventPublisher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentApprovedHandler,
        {
          provide: ORDER_REPOSITORY,
          useValue: mockOrderRepository,
        },
        {
          provide: DomainEventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<PaymentApprovedHandler>(PaymentApprovedHandler);
  });

  describe('handle', () => {
    it('should mark order as paid when order exists and is in AWAITING_PAYMENT state', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = OrderBuilder.create()
        .withOrderId(orderId)
        .build();

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderRepository.save.mockResolvedValue(undefined);
      mockEventPublisher.publishDomainEvents.mockResolvedValue(undefined);

      const message: IntegrationMessage<PaymentApprovedPayload> = {
        messageId: 'msg-001',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          paymentId: 'payment-123',
          approvedAmount: 20,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(order);
      expect(mockEventPublisher.publishDomainEvents).toHaveBeenCalled();
      expect(order.status.toString()).toBe('PAID');
      expect(order.paymentId).toBe('payment-123');
    });

    it('should handle duplicate payment.approved messages idempotently', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = OrderBuilder.create()
        .withOrderId(orderId)
        .build();

      // First payment approval
      order.markAsPaid('payment-123');
      await mockOrderRepository.save(order);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderRepository.save.mockClear();
      mockEventPublisher.publishDomainEvents.mockResolvedValue(undefined);

      const message: IntegrationMessage<PaymentApprovedPayload> = {
        messageId: 'msg-002',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          paymentId: 'payment-123', // Same payment ID
          approvedAmount: 20,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert - should not save or publish events for duplicate
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishDomainEvents).not.toHaveBeenCalled();
    });

    it('should log warning and return when order not found', async () => {
      // Arrange
      const orderId = OrderId.generate();
      mockOrderRepository.findById.mockResolvedValue(null);

      const message: IntegrationMessage<PaymentApprovedPayload> = {
        messageId: 'msg-003',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          paymentId: 'payment-123',
          approvedAmount: 20,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Act
      await handler.handle(message);

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishDomainEvents).not.toHaveBeenCalled();
    });

    it('should throw error when order cannot be paid (invalid state)', async () => {
      // Arrange
      const orderId = OrderId.generate();
      const order = OrderBuilder.create()
        .withOrderId(orderId)
        .build();

      // Cancel the order so it can't be paid
      order.cancel('Customer cancelled');

      mockOrderRepository.findById.mockResolvedValue(order);

      const message: IntegrationMessage<PaymentApprovedPayload> = {
        messageId: 'msg-004',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId.getValue(),
        payload: {
          orderId: orderId.getValue(),
          paymentId: 'payment-123',
          approvedAmount: 20,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Act & Assert
      await expect(handler.handle(message)).rejects.toThrow();
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishDomainEvents).not.toHaveBeenCalled();
    });
  });
});
