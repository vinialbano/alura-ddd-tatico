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

  describe('POST /carts/:id/convert', () => {
    it('should convert cart to order', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      return request(app.getHttpServer())
        .post(`/carts/${cartId}/convert`)
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.isConverted).toBe(true);
          expect(body.cartId).toBe(cartId);
          expect(body.items).toHaveLength(1);
        });
    });

    it('should reject converting empty cart', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      return request(app.getHttpServer())
        .post(`/carts/${cartId}/convert`)
        .expect(400)
        .expect((res) => {
          expect((res.body as { message: string }).message).toContain(
            'Cannot convert empty cart',
          );
        });
    });

    it('should return 404 for non-existent cart', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      return request(app.getHttpServer())
        .post(`/carts/${nonExistentId}/convert`)
        .expect(404);
    });

    it('should prevent adding items after conversion', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      await request(app.getHttpServer()).post(`/carts/${cartId}/convert`);

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

    it('should be idempotent - allow converting already converted cart', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      await request(app.getHttpServer()).post(`/carts/${cartId}/convert`);

      return request(app.getHttpServer())
        .post(`/carts/${cartId}/convert`)
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.isConverted).toBe(true);
        });
    });
  });

  describe('PUT /carts/:id/items/:productId', () => {
    it('should update quantity of existing item', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 7 })
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.items).toHaveLength(1);
          expect(body.items[0].productId).toBe('product-1');
          expect(body.items[0].quantity).toBe(7);
        });
    });

    it('should allow increasing quantity', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 2 });

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 9 })
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.items[0].quantity).toBe(9);
        });
    });

    it('should allow decreasing quantity', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 8 });

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 3 })
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.items[0].quantity).toBe(3);
        });
    });

    it('should return 404 for non-existent cart', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      return request(app.getHttpServer())
        .put(`/carts/${nonExistentId}/items/product-1`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should return 400 for non-existent product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-2`)
        .send({ quantity: 5 })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.message).toContain(
            'Product product-2 is not in the cart',
          );
        });
    });

    it('should reject invalid quantity', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      await request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 0 })
        .expect(400);

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 11 })
        .expect(400);
    });

    it('should reject update on converted cart', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      await request(app.getHttpServer()).post(`/carts/${cartId}/convert`);

      return request(app.getHttpServer())
        .put(`/carts/${cartId}/items/product-1`)
        .send({ quantity: 5 })
        .expect(409)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.message).toContain(
            'has already been converted and cannot be modified',
          );
        });
    });
  });

  describe('DELETE /carts/:id/items/:productId', () => {
    it('should remove existing item from cart', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      return request(app.getHttpServer())
        .delete(`/carts/${cartId}/items/product-1`)
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.items).toHaveLength(0);
          expect(body.itemCount).toBe(0);
        });
    });

    it('should make cart empty when removing last item', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 5 });

      return request(app.getHttpServer())
        .delete(`/carts/${cartId}/items/product-1`)
        .expect(200)
        .expect((res) => {
          const body = res.body as CartResponseDto;
          expect(body.items).toHaveLength(0);
          expect(body.itemCount).toBe(0);
        });
    });

    it('should return 404 for non-existent cart', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      return request(app.getHttpServer())
        .delete(`/carts/${nonExistentId}/items/product-1`)
        .expect(404);
    });

    it('should return 400 for non-existent product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      return request(app.getHttpServer())
        .delete(`/carts/${cartId}/items/product-2`)
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.message).toContain(
            'Product product-2 is not in the cart',
          );
        });
    });

    it('should reject removal on converted cart', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/carts')
        .send({ customerId: 'customer-1' });

      const cartId = (createResponse.body as CartResponseDto).cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .send({ productId: 'product-1', quantity: 3 });

      await request(app.getHttpServer()).post(`/carts/${cartId}/convert`);

      return request(app.getHttpServer())
        .delete(`/carts/${cartId}/items/product-1`)
        .expect(409)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.message).toContain(
            'has already been converted and cannot be modified',
          );
        });
    });
  });
});
