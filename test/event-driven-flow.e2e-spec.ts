import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'net';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CartResponseDto } from '../src/contexts/orders/application/dtos/cart-response.dto';
import { OrderResponseDTO } from '../src/contexts/orders/application/dtos/order-response.dto';
import { OrderRepository } from '../src/contexts/orders/domain/order/order.repository';
import { ORDER_REPOSITORY } from '../src/contexts/orders/order.module';
import {
  IMessageBus,
  MESSAGE_BUS,
} from '../src/shared/message-bus/message-bus.interface';
import { OrderId } from '../src/shared/value-objects/order-id';

/**
 * Event-Driven Integration Flow E2E Tests
 *
 * Tests the complete event-driven integration flow:
 * 1. Checkout creates order (AWAITING_PAYMENT) and emits OrderPlaced
 * 2. PaymentsConsumer receives OrderPlaced, simulates payment, emits payment.approved
 * 3. PaymentApprovedHandler marks order as PAID and emits OrderPaid
 *
 * This validates eventual consistency and async bounded context integration.
 */
describe('Event-Driven Integration Flow E2E', () => {
  let app: INestApplication<Server>;
  let orderRepository: OrderRepository;
  let createdCartId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    orderRepository = moduleFixture.get<OrderRepository>(ORDER_REPOSITORY);

    // Enable automatic DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test cart with items for checkout
    const createCartResponse = await request(app.getHttpServer())
      .post('/carts')
      .send({ customerId: 'customer-123' })
      .expect(201);

    createdCartId = (createCartResponse.body as CartResponseDto).cartId;

    // Add an item to the cart
    await request(app.getHttpServer())
      .post(`/carts/${createdCartId}/items`)
      .send({
        productId: 'COFFEE-COL-001',
        quantity: 2,
      })
      .expect(200);
  });

  describe('Complete Order Flow: Checkout → Payment', () => {
    it('should progress order from AWAITING_PAYMENT to PAID through event-driven integration', async () => {
      // Step 1: Checkout creates order in AWAITING_PAYMENT state
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: createdCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Verify initial state
      expect((checkoutResponse.body as OrderResponseDTO).status).toBe(
        'AWAITING_PAYMENT',
      );

      // Step 2: Wait for async event processing chain
      // order.placed → payment.approved → order.paid
      // Payment consumer has 10ms delay, plus message bus async delivery
      // Total expected time: ~20-30ms (well under 5 second requirement)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 3: Verify order reached PAID state
      const order = await orderRepository.findById(OrderId.fromString(orderId));

      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('PAID');
      expect(order!.paymentId).not.toBeNull();

      // Verify payment was processed
      expect(order!.paymentId).toMatch(/^payment-/);

      // Verify order has processed payment ID (idempotency tracking)
      expect(order!.hasProcessedPayment(order!.paymentId!)).toBe(true);
    }, 10000); // 10s timeout (well above 5s requirement)

    it('should handle order flow within 5 seconds (SC-002 performance requirement)', async () => {
      const startTime = Date.now();

      // Step 1: Checkout
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: createdCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Step 2: Poll for PAID state (max 5 seconds)
      let order: Awaited<ReturnType<typeof orderRepository.findById>> = null;
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5 seconds

      while (attempts < maxAttempts) {
        order = await orderRepository.findById(OrderId.fromString(orderId));
        if (order && order.status.toString() === 'PAID') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Assert: Order reached PAID state
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('PAID');

      // Assert: Completed within 5 seconds (SC-002)
      expect(elapsedSeconds).toBeLessThan(5);

      console.log(
        `✓ Event-driven flow completed in ${elapsedSeconds.toFixed(3)} seconds`,
      );
    }, 10000);
  });

  describe('Order Cancellation Propagation (T040)', () => {
    it('should propagate order.cancelled event to consumers after cancelling order', async () => {
      // Create a fresh cart for this test
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      const testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);

      // Step 1: Create and complete an order (AWAITING_PAYMENT → PAID)
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: testCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Wait for order to reach PAID state
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify order is in PAID state
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('PAID');

      // Step 2: Cancel the order
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({
          reason: 'Customer requested cancellation',
        })
        .expect(200);

      // Wait for cancellation event to propagate
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 3: Verify order status changed to CANCELLED
      order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('CANCELLED');
      expect(order!.cancellationReason).toBe('Customer requested cancellation');

      // Note: In a real E2E test, we would verify that:
      // - PaymentsConsumer logged refund trigger (was PAID)
      // For this test, we verify the order state transition is correct
    });

    it('should handle cancellation from AWAITING_PAYMENT state', async () => {
      // Create a fresh cart for this test
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      const testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);

      // Step 1: Create order (will be in AWAITING_PAYMENT initially)
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: testCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Step 2: Cancel immediately (before payment processing)
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({
          reason: 'Changed my mind',
        })
        .expect(200);

      // Wait for cancellation to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 3: Verify order is CANCELLED
      const order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('CANCELLED');
      expect(order!.cancellationReason).toBe('Changed my mind');

      // Cancellation from AWAITING_PAYMENT means:
      // - No refund needed (never paid)
    });
  });

  describe('Idempotent Event Handling', () => {
    it('should handle duplicate payment.approved messages without errors (T047)', async () => {
      // Create a fresh cart for this test
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      const testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);

      // Step 1: Create order through checkout
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: testCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Step 2: Wait for payment processing
      // Payment happens ~10ms after checkout
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Step 3: Verify order is PAID
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('PAID');
      const firstPaymentId = order!.paymentId;

      // Step 4: Manually trigger duplicate payment.approved
      // (In real system, this simulates duplicate message delivery)
      const duplicatePaymentMessage = {
        messageId: 'duplicate-msg-001',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId,
        payload: {
          orderId,
          paymentId: firstPaymentId, // Same payment ID
          approvedAmount: 49.98,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      // Publish duplicate message through message bus
      const messageBus = app.get<IMessageBus>(MESSAGE_BUS);
      await messageBus.publish(
        'payment.approved',
        duplicatePaymentMessage.payload,
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 5: Verify order state is valid (duplicate didn't cause issues)
      order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      // Order should be PAID (normal flow continues)
      expect(order!.status.toString()).toBe('PAID');
      expect(order!.paymentId).toBe(firstPaymentId);

      // Verify idempotency: payment ID should only be processed once
      expect(order!.hasProcessedPayment(firstPaymentId!)).toBe(true);
    });
  });

  describe('Invalid State Transition Rejection (T057)', () => {
    it('should reject payment.approved for order in Cancelled state', async () => {
      // Create a fresh cart for this test
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      const testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);

      // Step 1: Create order
      const checkoutResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: testCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = (checkoutResponse.body as OrderResponseDTO).id;

      // Step 2: Cancel the order immediately
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({
          reason: 'Customer cancelled immediately',
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 3: Verify order is CANCELLED
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('CANCELLED');

      // Step 4: Try to send payment.approved for cancelled order
      const paymentMessage = {
        messageId: 'invalid-payment-001',
        topic: 'payment.approved',
        timestamp: new Date(),
        correlationId: orderId,
        payload: {
          orderId,
          paymentId: 'payment-invalid-123',
          approvedAmount: 49.98,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };

      const messageBus = app.get<IMessageBus>(MESSAGE_BUS);

      // This should be logged as error but not crash
      await messageBus.publish('payment.approved', paymentMessage.payload);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 5: Verify order is still CANCELLED (state unchanged)
      order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('CANCELLED');
      expect(order!.paymentId).toBeNull();
    });
  });
});
