import { Injectable } from '@nestjs/common';
import { CustomerId } from '../../domain/shared/value-objects/customer-id';
import { CartId } from '../../domain/shopping-cart/cart-id';
import { ShoppingCart } from '../../domain/shopping-cart/shopping-cart';
import { ShoppingCartRepository } from '../../domain/shopping-cart/shopping-cart.repository';

/**
 * InMemoryShoppingCartRepository
 *
 * In-memory implementation of ShoppingCartRepository for educational purposes.
 * Uses a Map for fast lookups by CartId.
 *
 * Note: Methods are async to match the repository interface contract,
 * but do not use await since operations are synchronous (in-memory).
 */
@Injectable()
export class InMemoryShoppingCartRepository implements ShoppingCartRepository {
  private readonly carts: Map<string, ShoppingCart> = new Map();

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(cart: ShoppingCart): Promise<void> {
    const cartKey = cart.getCartId().getValue();
    this.carts.set(cartKey, cart);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(cartId: CartId): Promise<ShoppingCart | null> {
    const cartKey = cartId.getValue();
    const cart = this.carts.get(cartKey);
    return cart || null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByCustomerId(customerId: CustomerId): Promise<ShoppingCart[]> {
    const customerKey = customerId.getValue();
    const customerCarts: ShoppingCart[] = [];

    for (const cart of this.carts.values()) {
      if (cart.getCustomerId().getValue() === customerKey) {
        customerCarts.push(cart);
      }
    }

    return customerCarts;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(cartId: CartId): Promise<void> {
    const cartKey = cartId.getValue();
    this.carts.delete(cartKey);
  }
}
