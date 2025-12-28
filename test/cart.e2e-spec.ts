import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:net';
import request from 'supertest';
import type { CartResponseDto } from '../src/application/dtos/cart-response.dto';
import { CartModule } from '../src/infrastructure/modules/cart.module';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

describe('CartController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CartModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

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
      // Create cart first
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      // Add item
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

      // Add same product twice
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

    it('should reject adding 21st product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      // Add 20 products
      for (let i = 1; i <= 20; i++) {
        await request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .send({ productId: `product-${i}`, quantity: 1 });
      }

      // Attempt 21st
      return request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-21', quantity: 1 })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.message).toContain(
            'Cart cannot contain more than 20 unique products',
          );
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

    it('should return cart with items', async () => {
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
