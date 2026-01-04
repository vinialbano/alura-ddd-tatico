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
});
