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
      expect(body.items[0]).toHaveProperty('productSnapshot');
      expect(body.items[0].productSnapshot).toHaveProperty(
        'name',
        'Premium Coffee Beans',
      );
      expect(body).toHaveProperty('totalAmount');
      expect(body.totalAmount).toHaveProperty('amount');
      expect(body.totalAmount).toHaveProperty('currency', 'USD');
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

  describe('POST /orders/:id/mark-paid', () => {
    it('should mark order as paid with valid payment ID', async () => {
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
        .post(`/orders/${orderId}/mark-paid`)
        .send({ paymentId: 'pay_123456' })
        .expect(200);

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id', orderId);
      expect(body).toHaveProperty('status', 'PAID');
      expect(body).toHaveProperty('paymentId', 'pay_123456');
    });

    it('should reject marking already paid order as paid', async () => {
      // Arrange - Create and mark order as paid
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

      await request(app.getHttpServer())
        .post(`/orders/${orderId}/mark-paid`)
        .send({ paymentId: 'pay_first' })
        .expect(200);

      // Act - Try to mark as paid again
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/mark-paid`)
        .send({ paymentId: 'pay_second' })
        .expect(409);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/00000000-0000-0000-0000-000000000000/mark-paid')
        .send({ paymentId: 'pay_123' })
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });
  });

  // NOTE: These tests are for Lesson 3 (synchronous payment gateway).
  // In Lesson 4, payment processing is now event-driven and happens automatically after checkout.
  // The /orders/:id/pay endpoint still exists but will conflict with automatic processing.
  // Skipping these tests since event-driven-flow.e2e-spec.ts now provides comprehensive coverage.
  describe.skip('POST /orders/:id/pay (Payment Gateway Flow)', () => {
    it('should process payment successfully for order with ID ending in 0', async () => {
      // Arrange - Create an order with ID ending in 0 (approved by stubbed gateway)
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

      // Act - Process payment through gateway
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({}) // Empty body per PayOrderDto
        .expect(200);

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id', orderId);
      expect(body).toHaveProperty('status', 'PAID');
      expect(body).toHaveProperty('paymentId');
      expect(body.paymentId).toMatch(/^PAY-/); // Gateway generates "PAY-{orderId}"
    });

    it('should reject payment with 422 for order with ID ending in 5 (insufficient funds)', async () => {
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

      // Act - Process payment (may succeed or fail depending on orderId)
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({});

      // Assert - Either succeeds (200) or rejected (422)
      // Note: Conditional expects are intentional here since orderId is random
      /* eslint-disable jest/no-conditional-expect */
      if (orderId.endsWith('5')) {
        expect(response.status).toBe(422);
        const body = response.body as { message: string; reason: string };
        expect(body).toHaveProperty('message', 'Payment declined');
        expect(body).toHaveProperty('reason', 'Insufficient funds');
      } else if (orderId.endsWith('9')) {
        expect(response.status).toBe(422);
        const body = response.body as { message: string; reason: string };
        expect(body).toHaveProperty('message', 'Payment declined');
        expect(body).toHaveProperty('reason', 'Card declined');
      } else {
        expect(response.status).toBe(200);
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

      // First payment
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({})
        .expect(200);

      // Act - Try to pay again
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({})
        .expect(409);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('Cannot mark order as paid');
      expect(body.message).toContain('PAID');
    });

    it('should return 409 when trying to pay cancelled order', async () => {
      // Arrange - Create and cancel order
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

      // Cancel order first
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'Customer changed mind' })
        .expect(200);

      // Act - Try to pay cancelled order
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({})
        .expect(409);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('Cannot mark order as paid');
      expect(body.message).toContain('CANCELLED');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/00000000-0000-0000-0000-000000000000/pay')
        .send({})
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should handle payment gateway timeout gracefully', async () => {
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

      // Act - Process payment (stubbed gateway simulates 500ms-2s latency)
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .send({});
      const endTime = Date.now();

      // Assert - Should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // Should be less than 3 seconds
      expect([200, 422]).toContain(response.status); // Either success or declined
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('should cancel order from AwaitingPayment state', async () => {
      // Arrange - Create an order
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
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'Customer requested cancellation' })
        .expect(200);

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id', orderId);
      expect(body).toHaveProperty('status', 'CANCELLED');
      expect(body).toHaveProperty(
        'cancellationReason',
        'Customer requested cancellation',
      );
    });

    it('should cancel order from Paid state (refund scenario)', async () => {
      // Arrange - Create and mark order as paid
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

      await request(app.getHttpServer())
        .post(`/orders/${orderId}/mark-paid`)
        .send({ paymentId: 'pay_123' })
        .expect(200);

      // Act - Cancel paid order
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'Product defect - refund requested' })
        .expect(200);

      // Assert
      const body = response.body as OrderResponseDTO;
      expect(body).toHaveProperty('id', orderId);
      expect(body).toHaveProperty('status', 'CANCELLED');
      expect(body).toHaveProperty(
        'cancellationReason',
        'Product defect - refund requested',
      );
    });

    it('should reject cancelling already cancelled order', async () => {
      // Arrange - Create and cancel order
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

      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'First cancellation' })
        .expect(200);

      // Act - Try to cancel again
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'Second cancellation' })
        .expect(409);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/00000000-0000-0000-0000-000000000000/cancel')
        .send({ reason: 'Test cancellation' })
        .expect(404);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
    });

    it('should return 400 when cancelling with empty reason (T042)', async () => {
      // Arrange - Create an order
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

      // Act - Try to cancel with empty reason
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: '' })
        .expect(400);

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('reason')]),
      );
    });

    it('should return 400 when cancelling with whitespace-only reason', async () => {
      // Arrange - Create an order
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

      // Act - Try to cancel with whitespace-only reason
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: '   ' })
        .expect(422); // Domain validation returns 422 Unprocessable Entity

      // Assert
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('Cancellation reason cannot be empty');
    });
  });
});
