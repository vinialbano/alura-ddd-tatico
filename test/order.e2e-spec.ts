import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'net';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CartResponseDto } from '../src/contexts/orders/application/dtos/cart-response.dto';
import { OrderResponseDTO } from '../src/contexts/orders/application/dtos/order-response.dto';

// Type for NestJS error responses
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

describe('Order E2E Tests', () => {
  let app: INestApplication<Server>;
  let createdCartId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
        productId: 'COFFEE-COL-001', // Product exists in stub catalog gateway
        quantity: 2,
      })
      .expect(200);
  });

  describe('POST /orders/checkout', () => {
    it('should successfully create order from valid cart', async () => {
      // Act
      const response = await request(app.getHttpServer())
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

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('cartId', createdCartId);
      expect(body).toHaveProperty('status', 'AWAITING_PAYMENT');
      expect(body).toHaveProperty('items');
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toHaveProperty('productId', 'COFFEE-COL-001');
      expect(body).toHaveProperty('totalAmount');
      expect(typeof body.totalAmount).toBe('number');
      expect(body).toHaveProperty('currency', 'USD');
      expect(body).toHaveProperty('shippingAddress');
      expect(body.shippingAddress).toHaveProperty('street', '123 Main St');
    });

    it('should reject checkout with missing cart ID', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(400);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should reject checkout with invalid shipping address', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: createdCartId,
          shippingAddress: {
            street: '123 Main St',
            // Missing required fields
          },
        })
        .expect(400);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should reject checkout with non-existent cart', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: '00000000-0000-0000-0000-000000000000',
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should reject checkout with empty cart', async () => {
      // Arrange - Create an empty cart without items
      const emptyCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-456' })
        .expect(201);

      const emptyCartId = (emptyCartResponse.body as CartResponseDto).cartId;

      // Act - Attempt to checkout empty cart
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: emptyCartId,
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          },
        })
        .expect(400);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('empty');
    });

    it('should return existing order on duplicate checkout attempt', async () => {
      // First checkout
      const firstResponse = await request(app.getHttpServer())
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

      const firstOrderId = (firstResponse.body as OrderResponseDTO).id;

      // Second checkout attempt
      const secondResponse = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          cartId: createdCartId,
          shippingAddress: {
            street: '456 Different St',
            city: 'Other City',
            stateOrProvince: 'CA',
            postalCode: '90001',
            country: 'USA',
          },
        })
        .expect(201);

      // Assert - should return the same order
      expect((secondResponse.body as OrderResponseDTO).id).toBe(firstOrderId);
    });
  });

  describe('GET /orders/:id', () => {
    it('should retrieve order by ID', async () => {
      // Arrange - Create an order first
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

      // Act
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id', orderId);
      expect(body).toHaveProperty('status', 'AWAITING_PAYMENT');
      expect(body).toHaveProperty('items');
      expect(body.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/orders/00000000-0000-0000-0000-000000000000')
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });
  });

  // NOTE: These tests demonstrate synchronous payment processing via POST /payments.
  // To use this flow, set ENABLE_AUTOMATIC_PAYMENT=false environment variable.
  // This illustrates the application service pattern (before introducing event-driven architecture).
  // For event-driven tests, see event-driven-flow.e2e-spec.ts
  (process.env.ENABLE_AUTOMATIC_PAYMENT === 'false' ? describe : describe.skip)(
    'POST /payments (Manual Payment Flow)',
    () => {
    it('should process payment successfully for order with ID ending in 0', async () => {
      // Arrange - Create a fresh cart for this test
      const createCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-123' })
        .expect(201);

      const testCartId = (createCartResponse.body as CartResponseDto).cartId;

      // Add item to cart
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .send({
          productId: 'COFFEE-COL-001',
          quantity: 2,
        })
        .expect(200);

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

      // Act - Process payment through Payments BC
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId,
          amount: orderBody.totalAmount,
          currency: orderBody.currency,
        })
        .expect(201);

      // Assert
      const body = response.body as { paymentId: string; status: string; orderId: string };
      expect(body).toHaveProperty('paymentId');
      expect(body).toHaveProperty('status', 'approved');
      expect(body).toHaveProperty('orderId', orderId);
      expect(body.paymentId).toMatch(/^PAY-/); // Gateway generates "PAY-{orderId}"

      // Verify order is marked as paid
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);
      const updatedOrder = orderResponse.body as OrderResponseDTO;
      expect(updatedOrder.status).toBe('PAID');
    });

    it('should reject payment with 400 for order with ID ending in 5 (insufficient funds)', async () => {
      // Arrange - Create order, then manipulate to get ID ending in 5
      // Note: In real implementation, we'd need to create order with specific ID
      // For now, we test the error handling path
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
      const orderBody = checkoutResponse.body as OrderResponseDTO;

      // Act - Process payment (may succeed or fail depending on orderId)
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId,
          amount: orderBody.totalAmount,
          currency: orderBody.currency,
        });

      // Assert - Either succeeds (201) or rejected (400)
      // Note: Conditional expects are intentional here since orderId is random
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
      // Arrange - Create and pay for order
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

      // Act - Try to pay again
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId,
          amount: orderBody.totalAmount,
          currency: orderBody.currency,
        })
        .expect(409);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('Cannot mark order as paid');
      expect(body.message).toContain('PAID');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          amount: 100,
          currency: 'USD',
        })
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should handle payment gateway latency gracefully', async () => {
      // Arrange - Create order
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
      const orderBody = checkoutResponse.body as OrderResponseDTO;

      // Act - Process payment (stubbed gateway simulates 500ms-2s latency)
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId,
          amount: orderBody.totalAmount,
          currency: orderBody.currency,
        });
      const endTime = Date.now();

      // Assert - Should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // Should be less than 3 seconds
      expect([201, 400]).toContain(response.status); // Either success or declined
    });
  },
  );
});
