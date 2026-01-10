import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'net';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CartResponseDto } from '../src/contexts/orders/application/dtos/cart-response.dto';
import { OrderResponseDTO } from '../src/contexts/orders/application/dtos/order-response.dto';
import { OrderRepository } from '../src/contexts/orders/domain/order/order.repository';
import { ORDER_REPOSITORY } from '../src/contexts/orders/orders.module';
import { OrderId } from '../src/shared/value-objects/order-id';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/**
 * Payment Integration E2E Tests
 *
 * Tests Lessons 3-4: Order state management and event-driven integration
 */
describe('Payment Integration E2E (Lessons 3-4)', () => {
  let app: INestApplication<Server>;
  let orderRepository: OrderRepository;

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

  describe('Synchronous Payment Flow (Lesson 3: State Management)', () => {
    let testCartId: string;

    beforeEach(async () => {
      // Create a test cart with items for checkout
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);
    });

    // Note: These tests demonstrate synchronous payment processing via POST /payments.
    // To use this flow, set ENABLE_AUTOMATIC_PAYMENT=false environment variable.
    (process.env.ENABLE_AUTOMATIC_PAYMENT === 'false'
      ? describe
      : describe.skip)('POST /payments (Manual Payment Flow)', () => {
      it('should process payment successfully', async () => {
        // Create order through checkout
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
        const orderBody = checkoutResponse.body as OrderResponseDTO;

        // Process payment through Payments BC
        const response = await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId,
            amount: orderBody.totalAmount,
            currency: orderBody.currency,
          })
          .expect(201);

        const body = response.body as {
          paymentId: string;
          status: string;
          orderId: string;
        };
        expect(body).toHaveProperty('paymentId');
        expect(body).toHaveProperty('status', 'approved');
        expect(body).toHaveProperty('orderId', orderId);
        expect(body.paymentId).toMatch(/^PAY-/);

        // Verify order is marked as paid
        const orderResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .expect(200);
        const updatedOrder = orderResponse.body as OrderResponseDTO;
        expect(updatedOrder.status).toBe('PAID');
      });

      it('should handle deterministic payment validation', async () => {
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
        const orderBody = checkoutResponse.body as OrderResponseDTO;

        // Process payment (may succeed or fail depending on orderId)
        const response = await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId,
            amount: orderBody.totalAmount,
            currency: orderBody.currency,
          });

        // Either succeeds (201) or rejected (400)
        /* eslint-disable jest/no-conditional-expect */
        if (orderId.endsWith('5')) {
          expect(response.status).toBe(400);
          const body = response.body as { message: string };
          expect(body).toHaveProperty('message', 'Insufficient funds');
        } else if (orderId.endsWith('9')) {
          expect(response.status).toBe(400);
          const body = response.body as { message: string };
          expect(body).toHaveProperty('message', 'Card declined');
        } else {
          expect(response.status).toBe(201);
        }
        /* eslint-enable jest/no-conditional-expect */
      });

      it('should return 409 when trying to pay already paid order', async () => {
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
        const orderBody = checkoutResponse.body as OrderResponseDTO;

        // First payment
        await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId,
            amount: orderBody.totalAmount,
            currency: orderBody.currency,
          })
          .expect(201);

        // Try to pay again
        const response = await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId,
            amount: orderBody.totalAmount,
            currency: orderBody.currency,
          })
          .expect(409);

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
        expect(body.message).toContain('Cannot mark order as paid');
        expect(body.message).toContain('PAID');
      });

      it('should return 404 for non-existent order', async () => {
        const response = await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId: '00000000-0000-0000-0000-000000000000',
            amount: 100,
            currency: 'USD',
          })
          .expect(404);

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
      });

      it('should handle payment gateway latency gracefully', async () => {
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
        const orderBody = checkoutResponse.body as OrderResponseDTO;

        // Process payment (stubbed gateway simulates 500ms-2s latency)
        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/payments')
          .send({
            orderId,
            amount: orderBody.totalAmount,
            currency: orderBody.currency,
          });
        const endTime = Date.now();

        // Should complete within reasonable time
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(3000);
        expect([201, 400]).toContain(response.status);
      });
    });
  });

  describe('Asynchronous Payment Flow (Lesson 4: Event-Driven Integration)', () => {
    let testCartId: string;

    beforeEach(async () => {
      // Create a test cart with items for checkout
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add an item to the cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);
    });

    it('should complete event-driven flow: order.placed → payment.approved', async () => {
      // Step 1: Checkout creates order in AWAITING_PAYMENT state
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

      // Verify initial state
      expect((checkoutResponse.body as OrderResponseDTO).status).toBe(
        'AWAITING_PAYMENT',
      );

      // Step 2: Wait for async event processing chain
      // order.placed → payment.approved
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
    }, 10000); // 10s timeout (well above 5s requirement)

    it('should complete within 5 seconds (SC-002 performance requirement)', async () => {
      const startTime = Date.now();

      // Step 1: Checkout
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
});
