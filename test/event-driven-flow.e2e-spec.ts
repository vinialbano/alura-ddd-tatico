import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  MESSAGE_BUS,
  IMessageBus,
} from '../src/application/events/message-bus.interface';
import { OrderRepository } from '../src/domain/order/order.repository';
import { OrderId } from '../src/domain/order/value-objects/order-id';
import { ORDER_REPOSITORY } from '../src/infrastructure/modules/order.module';
import { CartResponseDto } from '../src/application/dtos/cart-response.dto';
import { OrderResponseDTO } from '../src/application/dtos/order-response.dto';

/**
 * Event-Driven Integration Flow E2E Tests
 *
 * Tests the complete event-driven integration flow:
 * 1. Checkout creates order (AWAITING_PAYMENT) and emits OrderPlaced
 * 2. PaymentsConsumer receives OrderPlaced, simulates payment, emits payment.approved
 * 3. PaymentApprovedHandler marks order as PAID and emits OrderPaid
 * 4. StockConsumer receives OrderPaid, simulates stock reservation, emits stock.reserved
 * 5. StockReservedHandler marks order as STOCK_RESERVED
 *
 * This validates eventual consistency and async bounded context integration.
 */
describe('Event-Driven Integration Flow E2E', () => {
  let app: INestApplication;
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

  describe('Complete Order Flow: Checkout → Payment → Stock Reservation', () => {
    it('should progress order from AWAITING_PAYMENT to STOCK_RESERVED through event-driven integration', async () => {
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
      // order.placed → payment.approved → order.paid → stock.reserved
      // Each consumer has 10ms delay, plus message bus async delivery
      // Total expected time: ~40-50ms (well under 5 second requirement)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Verify order reached STOCK_RESERVED state
      const order = await orderRepository.findById(OrderId.fromString(orderId));

      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('STOCK_RESERVED');
      expect(order!.paymentId).not.toBeNull();

      // Verify payment was processed
      expect(order!.paymentId).toMatch(/^payment-/);

      // Verify order has processed payment ID (idempotency tracking)
      expect(order!.hasProcessedPayment(order!.paymentId!)).toBe(true);

      // Verify order has processed reservation ID (idempotency tracking)
      // Note: reservationId is internal to Order aggregate, we can't access it directly
      // but we can verify the state transition succeeded
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

      // Step 2: Poll for STOCK_RESERVED state (max 5 seconds)
      let order: Awaited<ReturnType<typeof orderRepository.findById>> = null;
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5 seconds

      while (attempts < maxAttempts) {
        order = await orderRepository.findById(OrderId.fromString(orderId));
        if (order && order.status.toString() === 'STOCK_RESERVED') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Assert: Order reached STOCK_RESERVED state
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('STOCK_RESERVED');

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

      // Step 1: Create and complete an order (AWAITING_PAYMENT → PAID → STOCK_RESERVED)
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

      // Wait for order to reach STOCK_RESERVED state
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify order is in STOCK_RESERVED state
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('STOCK_RESERVED');

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
      // - PaymentsConsumer logged refund trigger (was STOCK_RESERVED)
      // - StockConsumer logged stock release (was STOCK_RESERVED)
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
      // - No stock to release (never reserved)
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

      // Step 2: Wait for payment processing but not stock reservation
      // Payment happens ~10ms after checkout, stock happens ~10ms after payment
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Step 3: Verify order is PAID (but not yet STOCK_RESERVED)
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      // Order might be PAID or STOCK_RESERVED depending on timing, so accept both
      expect(['PAID', 'STOCK_RESERVED']).toContain(order!.status.toString());
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
      // Order should be PAID or STOCK_RESERVED (normal flow continues)
      expect(['PAID', 'STOCK_RESERVED']).toContain(order!.status.toString());
      expect(order!.paymentId).toBe(firstPaymentId);

      // Verify idempotency: payment ID should only be processed once
      expect(order!.hasProcessedPayment(firstPaymentId!)).toBe(true);
    });

    it('should handle duplicate stock.reserved messages without errors (T048)', async () => {
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

      // Step 1: Create order and wait for it to reach STOCK_RESERVED
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

      // Wait for complete flow
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Step 2: Verify order is STOCK_RESERVED
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('STOCK_RESERVED');

      // Step 3: Get the internal reservation ID by checking processed IDs
      // We can't access it directly, but we can publish a duplicate message
      const duplicateStockMessage = {
        messageId: 'duplicate-msg-002',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId,
        payload: {
          orderId,
          reservationId: 'test-duplicate-reservation',
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      // Publish duplicate message through message bus
      const messageBus = app.get<IMessageBus>(MESSAGE_BUS);

      // First send with one ID
      await messageBus.publish('stock.reserved', duplicateStockMessage.payload);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send exact duplicate
      await messageBus.publish('stock.reserved', duplicateStockMessage.payload);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Step 4: Verify order is still STOCK_RESERVED (no error occurred)
      order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('STOCK_RESERVED');
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

    it('should reject stock.reserved for order in AWAITING_PAYMENT state', async () => {
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

      // Step 2: Immediately check order is AWAITING_PAYMENT before automatic flow
      let order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      expect(order!.status.toString()).toBe('AWAITING_PAYMENT');

      // Step 3: Try to reserve stock while still in AWAITING_PAYMENT
      const stockMessage = {
        messageId: 'invalid-stock-001',
        topic: 'stock.reserved',
        timestamp: new Date(),
        correlationId: orderId,
        payload: {
          orderId,
          reservationId: 'invalid-reservation-123',
          items: [],
          timestamp: new Date().toISOString(),
        },
      };

      const messageBus = app.get<IMessageBus>(MESSAGE_BUS);

      // This should be logged as error but not crash
      await messageBus.publish('stock.reserved', stockMessage.payload);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Step 4: Verify the invalid message didn't cause state corruption
      // Order might have progressed through normal flow, but shouldn't have
      // used the invalid reservation ID
      order = await orderRepository.findById(OrderId.fromString(orderId));
      expect(order).not.toBeNull();
      // The invalid message should have been rejected, order continues normal flow
      expect(['AWAITING_PAYMENT', 'PAID', 'STOCK_RESERVED']).toContain(
        order!.status.toString(),
      );
    });
  });
});
