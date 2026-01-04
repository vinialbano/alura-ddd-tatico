import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Order E2E Tests', () => {
  let app: INestApplication;
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

    createdCartId = createCartResponse.body.cartId;

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
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('cartId', createdCartId);
      expect(response.body).toHaveProperty('status', 'AWAITING_PAYMENT');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toHaveProperty('productSnapshot');
      expect(response.body.items[0].productSnapshot).toHaveProperty(
        'name',
        'Premium Coffee Beans',
      );
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body.totalAmount).toHaveProperty('amount');
      expect(response.body.totalAmount).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('shippingAddress');
      expect(response.body.shippingAddress).toHaveProperty(
        'street',
        '123 Main St',
      );
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
      expect(response.body).toHaveProperty('message');
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
      expect(response.body).toHaveProperty('message');
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
      expect(response.body).toHaveProperty('message');
    });

    it('should reject checkout with empty cart', async () => {
      // Arrange - Create an empty cart without items
      const emptyCartResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-456' })
        .expect(201);

      const emptyCartId = emptyCartResponse.body.cartId;

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
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('empty');
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

      const firstOrderId = firstResponse.body.id;

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
      expect(secondResponse.body.id).toBe(firstOrderId);
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

      const orderId = checkoutResponse.body.id;

      // Act
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('status', 'AWAITING_PAYMENT');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/orders/00000000-0000-0000-0000-000000000000')
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
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

      const orderId = checkoutResponse.body.id;

      // Act
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/mark-paid`)
        .send({ paymentId: 'pay_123456' })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('status', 'PAID');
      expect(response.body).toHaveProperty('paymentId', 'pay_123456');
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

      const orderId = checkoutResponse.body.id;

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
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/00000000-0000-0000-0000-000000000000/mark-paid')
        .send({ paymentId: 'pay_123' })
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
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

      const orderId = checkoutResponse.body.id;

      // Act
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .send({ reason: 'Customer requested cancellation' })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('status', 'CANCELLED');
      expect(response.body).toHaveProperty(
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

      const orderId = checkoutResponse.body.id;

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
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('status', 'CANCELLED');
      expect(response.body).toHaveProperty(
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

      const orderId = checkoutResponse.body.id;

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
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent order', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/orders/00000000-0000-0000-0000-000000000000/cancel')
        .send({ reason: 'Test cancellation' })
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
    });
  });
});
