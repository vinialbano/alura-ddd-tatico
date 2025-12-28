import { Injectable } from '@nestjs/common';
import { ShoppingCartRepository } from '../../domain/repositories/shopping-cart.repository.interface';
import { ShoppingCart } from '../../domain/aggregates/shopping-cart';
import { CartId } from '../../domain/value-objects/cart-id';
import { CustomerId } from '../../domain/value-objects/customer-id';

/**
 * InMemoryShoppingCartRepository
 *
 * In-memory implementation of ShoppingCartRepository for educational purposes.
 * Uses a Map for fast lookups by CartId.
 */
@Injectable()
export class InMemoryShoppingCartRepository implements ShoppingCartRepository {
  private readonly carts: Map<string, ShoppingCart> = new Map();

  async save(cart: ShoppingCart): Promise<void> {
    const cartKey = cart.getCartId().getValue();
    this.carts.set(cartKey, cart);
  }

  async findById(cartId: CartId): Promise<ShoppingCart | null> {
    const cartKey = cartId.getValue();
    const cart = this.carts.get(cartKey);
    return cart || null;
  }

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

  async delete(cartId: CartId): Promise<void> {
    const cartKey = cartId.getValue();
    this.carts.delete(cartKey);
  }
}
