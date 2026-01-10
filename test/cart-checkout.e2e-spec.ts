import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:net';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import type { CartResponseDto } from '../src/contexts/orders/application/dtos/cart-response.dto';
import type { OrderResponseDTO } from '../src/contexts/orders/application/dtos/order-response.dto';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/**
 * Cart & Checkout E2E Tests
 *
 * Tests Lessons 1-2: Shopping Cart aggregate and Order creation via Checkout
 */
describe('Cart & Checkout E2E (Lessons 1-2)', () => {
  let app: INestApplication<Server>;

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

  describe('Cart Operations (Lesson 1: Aggregates & Value Objects)', () => {
    describe('POST /carts', () => {
      it('should create a new cart', () => {
        return request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-123' })
          .expect(201)
          .expect((res) => {
            const body = res.body as CartResponseDto;
            expect(body.cartId).toBeDefined();
            expect(body.customerId).toBe('customer-123');
            expect(body.items).toEqual([]);
            expect(body.itemCount).toBe(0);
            expect(body.isConverted).toBe(false);
          });
      });
    });

    describe('POST /carts/:id/items', () => {
      it('should add item to cart', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        return request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 3 })
          .expect(200)
          .expect((res) => {
            const body = res.body as CartResponseDto;
            expect(body.items).toHaveLength(1);
            expect(body.items[0].productId).toBe('product-1');
            expect(body.items[0].quantity).toBe(3);
            expect(body.itemCount).toBe(1);
          });
      });

      it('should consolidate quantity for duplicate product', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 3 });

        return request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 4 })
          .expect(200)
          .expect((res) => {
            const body = res.body as CartResponseDto;
            expect(body.items).toHaveLength(1);
            expect(body.items[0].quantity).toBe(7);
          });
      });

      it('should reject invalid quantity', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        return request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 0 })
          .expect(400);
      });

      it('should reject consolidation exceeding max quantity', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 7 });

        return request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 4 })
          .expect(400)
          .expect((res) => {
            const body = res.body as ErrorResponse;
            expect(body.message).toContain(
              'Quantity must be an integer between 1 and 10',
            );
          });
      });

      it('should prevent adding items after checkout', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 3 });

        await request(app.getHttpServer())
          .post('/orders/checkout')
          .send({
            cartId: cartId,
            shippingAddress: {
              street: '123 Main St',
              city: 'Springfield',
              stateOrProvince: 'IL',
              postalCode: '62701',
              country: 'USA',
            },
          });

        return request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-2', quantity: 5 })
          .expect(409)
          .expect((res) => {
            const body = res.body as ErrorResponse;
            expect(body.message).toContain(
              'has already been converted and cannot be modified',
            );
          });
      });
    });

    describe('GET /carts/:id', () => {
      it('should retrieve cart by ID', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-456' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        return request(app.getHttpServer())
          .get(`/carts/${cartId}`)
          .expect(200)
          .expect((res) => {
            const body = res.body as CartResponseDto;
            expect(body.cartId).toBe(cartId);
            expect(body.customerId).toBe('customer-456');
          });
      });

      it('should return 404 for non-existent cart', () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        return request(app.getHttpServer())
          .get(`/carts/${nonExistentId}`)
          .expect(404);
      });

      it('should return cart with multiple items', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-1' });

        const cartId = (createResponse.body as CartResponseDto).cartId;

        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-1', quantity: 3 });

        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: 'product-2', quantity: 5 });

        return request(app.getHttpServer())
          .get(`/carts/${cartId}`)
          .expect(200)
          .expect((res) => {
            const body = res.body as CartResponseDto;
            expect(body.items).toHaveLength(2);
            expect(body.itemCount).toBe(2);
          });
      });
    });
  });

  describe('Checkout Flow (Lesson 2: Domain Services & Gateways)', () => {
    let testCartId: string;

    beforeEach(async () => {
      // Create a cart with items for checkout tests
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

    describe('POST /orders/checkout', () => {
      it('should successfully create order from valid cart', async () => {
        const response = await request(app.getHttpServer())
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

        const body = response.body as OrderResponseDTO;
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('cartId', testCartId);
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

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
      });

      it('should reject checkout with invalid shipping address', async () => {
        const response = await request(app.getHttpServer())
          .post('/orders/checkout')
          .send({
            cartId: testCartId,
            shippingAddress: {
              street: '123 Main St',
              // Missing required fields
            },
          })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
      });

      it('should reject checkout with non-existent cart', async () => {
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

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
      });

      it('should reject checkout with empty cart', async () => {
        const emptyCartResponse = await request(app.getHttpServer())
          .post('/carts')
          .send({ customerId: 'customer-456' })
          .expect(201);

        const emptyCartId = (emptyCartResponse.body as CartResponseDto).cartId;

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

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
        expect(body.message).toContain('empty');
      });

      it('should handle duplicate checkout (idempotency)', async () => {
        const firstResponse = await request(app.getHttpServer())
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

        const firstOrderId = (firstResponse.body as OrderResponseDTO).id;

        const secondResponse = await request(app.getHttpServer())
          .post('/orders/checkout')
          .send({
            cartId: testCartId,
            shippingAddress: {
              street: '456 Different St',
              city: 'Other City',
              stateOrProvince: 'CA',
              postalCode: '90001',
              country: 'USA',
            },
          })
          .expect(201);

        expect((secondResponse.body as OrderResponseDTO).id).toBe(firstOrderId);
      });
    });

    describe('GET /orders/:id', () => {
      it('should retrieve order by ID', async () => {
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

        const response = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .expect(200);

        const body = response.body as OrderResponseDTO;
        expect(body).toHaveProperty('id', orderId);
        expect(body).toHaveProperty('status', 'AWAITING_PAYMENT');
        expect(body).toHaveProperty('items');
        expect(body.items).toHaveLength(1);
      });

      it('should return 404 for non-existent order', async () => {
        const response = await request(app.getHttpServer())
          .get('/orders/00000000-0000-0000-0000-000000000000')
          .expect(404);

        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('message');
      });
    });
  });
});
