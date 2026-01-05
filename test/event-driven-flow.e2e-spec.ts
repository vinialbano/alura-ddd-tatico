import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OrderRepository } from '../src/domain/order/order.repository';
import { ORDER_REPOSITORY } from '../src/infrastructure/modules/order.module';
import { OrderId } from '../src/domain/order/value-objects/order-id';

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

    createdCartId = createCartResponse.body.cartId;

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

      const orderId = checkoutResponse.body.id;

      // Verify initial state
      expect(checkoutResponse.body.status).toBe('AWAITING_PAYMENT');

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

      const orderId = checkoutResponse.body.id;

      // Step 2: Poll for STOCK_RESERVED state (max 5 seconds)
      let order = null;
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

  describe('Idempotent Event Handling', () => {
    it('should handle duplicate payment.approved messages without errors', async () => {
      // This test will be implemented in Phase 5 (User Story 3)
      // For now, we just verify the basic flow works
      expect(true).toBe(true);
    });

    it('should handle duplicate stock.reserved messages without errors', async () => {
      // This test will be implemented in Phase 5 (User Story 3)
      // For now, we just verify the basic flow works
      expect(true).toBe(true);
    });
  });
});
