import { CartItem } from './cart-item';
import { CartId } from './value-objects/cart-id';
import { CustomerId } from '../shared/value-objects/customer-id';
import { ProductId } from '../shared/value-objects/product-id';
import { Quantity } from '../shared/value-objects/quantity';
import { InvalidCartOperationError } from './exceptions/invalid-cart-operation.error';
import { EmptyCartError } from './exceptions/empty-cart.error';

export type ShoppingCartParams = {
  cartId: CartId;
  customerId: CustomerId;
  items: Map<string, CartItem>;
  conversionStatus: 'active' | 'converted';
};

// ShoppingCart Aggregate Root - manages cart lifecycle and enforces invariants
export class ShoppingCart {
  private readonly cartId: CartId;
  private readonly customerId: CustomerId;
  private readonly items: Map<string, CartItem>;
  private conversionStatus: 'active' | 'converted';

  constructor(params: ShoppingCartParams) {
    this.cartId = params.cartId;
    this.customerId = params.customerId;
    this.items = params.items;
    this.conversionStatus = params.conversionStatus;
    this.validate();
  }

  // Creates empty active cart
  static create(cartId: CartId, customerId: CustomerId): ShoppingCart {
    return new ShoppingCart({
      cartId,
      customerId,
      items: new Map(),
      conversionStatus: 'active',
    });
  }

  // Adds item or consolidates quantity if exists (max 10 per product)
  addItem(productId: ProductId, quantity: Quantity): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (existingItem) {
      // Consolidate quantity (may throw if exceeds 10)
      existingItem.addQuantity(quantity);
    } else {
      const newItem = CartItem.create(productId, quantity);
      this.items.set(productKey, newItem);
    }
  }

  getCartId(): CartId {
    return this.cartId;
  }

  getCustomerId(): CustomerId {
    return this.customerId;
  }

  getItems(): CartItem[] {
    return Array.from(this.items.values());
  }

  isConverted(): boolean {
    return this.conversionStatus === 'converted';
  }

  getItemCount(): number {
    return this.items.size;
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  getConversionStatus(): 'active' | 'converted' {
    return this.conversionStatus;
  }

  // Replaces quantity for existing item
  updateItemQuantity(productId: ProductId, quantity: Quantity): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (!existingItem) {
      throw new InvalidCartOperationError(
        `Product ${productId.getValue()} is not in the cart`,
      );
    }

    existingItem.updateQuantity(quantity);
  }

  // Removes item from cart
  removeItem(productId: ProductId): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (!existingItem) {
      throw new InvalidCartOperationError(
        `Product ${productId.getValue()} is not in the cart`,
      );
    }

    this.items.delete(productKey);
  }

  // Converts cart to order - becomes immutable
  markAsConverted(): void {
    if (this.items.size === 0) {
      throw new EmptyCartError();
    }
    this.conversionStatus = 'converted';
  }

  private ensureNotConverted(): void {
    if (this.isConverted()) {
      throw new InvalidCartOperationError(
        `Cart ${this.cartId.getValue()} has already been converted and cannot be modified`,
      );
    }
  }

  // Invariant: empty carts cannot be converted
  private ensureConvertedCartNotEmpty(): void {
    if (this.conversionStatus === 'converted' && this.items.size === 0) {
      throw new Error('Cannot restore empty cart with converted status');
    }
  }

  private ensureValidConversionStatus(): void {
    const validStatuses: Array<'active' | 'converted'> = [
      'active',
      'converted',
    ];
    if (!validStatuses.includes(this.conversionStatus)) {
      throw new Error(
        `Invalid conversionStatus: ${String(this.conversionStatus)}. Must be 'active' or 'converted'`,
      );
    }
  }

  private validate(): void {
    this.ensureConvertedCartNotEmpty();
    this.ensureValidConversionStatus();
  }
}
