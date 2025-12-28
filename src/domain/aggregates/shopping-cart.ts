import { CartItem } from '../entities/cart-item';
import { CartId } from '../value-objects/cart-id';
import { CustomerId } from '../value-objects/customer-id';
import { ProductId } from '../value-objects/product-id';
import { Quantity } from '../value-objects/quantity';

/**
 * Parameters for constructing a ShoppingCart aggregate
 */
export type ShoppingCartParams = {
  cartId: CartId;
  customerId: CustomerId;
  items: Map<string, CartItem>;
  conversionStatus: 'active' | 'converted';
};

/**
 * ShoppingCart Aggregate Root
 *
 * Manages cart lifecycle and enforces cart-level invariants.
 * Transaction boundary for all cart operations.
 */
export class ShoppingCart {
  private static readonly MAX_PRODUCTS = 20;

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

  /**
   * Factory method - creates empty active cart
   * @param cartId - Unique cart identifier
   * @param customerId - Customer identifier (required)
   */
  static create(cartId: CartId, customerId: CustomerId): ShoppingCart {
    return new ShoppingCart({
      cartId,
      customerId,
      items: new Map(),
      conversionStatus: 'active',
    });
  }

  /**
   * Adds new item or consolidates quantity if product exists
   * @param productId - Product to add
   * @param quantity - Quantity to add
   * @throws Error if cart is converted
   * @throws Error if adding would exceed 20 products
   * @throws Error if consolidation exceeds 10
   */
  addItem(productId: ProductId, quantity: Quantity): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (existingItem) {
      // Consolidate quantity (may throw if exceeds 10)
      existingItem.addQuantity(quantity);
    } else {
      // Check max products limit before adding new product
      this.ensureWithinProductLimit();
      const newItem = CartItem.create(productId, quantity);
      this.items.set(productKey, newItem);
    }
  }

  /**
   * Returns cart identifier
   */
  getCartId(): CartId {
    return this.cartId;
  }

  /**
   * Returns customer identifier
   */
  getCustomerId(): CustomerId {
    return this.customerId;
  }

  /**
   * Returns array of cart items (defensive copy)
   */
  getItems(): CartItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Returns true if cart has been converted
   */
  isConverted(): boolean {
    return this.conversionStatus === 'converted';
  }

  /**
   * Returns number of unique products in cart
   */
  getItemCount(): number {
    return this.items.size;
  }

  /**
   * Updates quantity of an existing item in the cart
   * @param productId - Product identifier
   * @param quantity - New quantity (replaces current quantity)
   * @throws Error if cart is converted
   * @throws Error if product is not in cart
   */
  updateItemQuantity(productId: ProductId, quantity: Quantity): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (!existingItem) {
      throw new Error(`Product ${productKey} is not in the cart`);
    }

    existingItem.updateQuantity(quantity);
  }

  /**
   * Removes an item from the cart
   * @param productId - Product identifier to remove
   * @throws Error if cart is converted
   * @throws Error if product is not in cart
   */
  removeItem(productId: ProductId): void {
    this.ensureNotConverted();

    const productKey = productId.getValue();
    const existingItem = this.items.get(productKey);

    if (!existingItem) {
      throw new Error(`Product ${productKey} is not in the cart`);
    }

    this.items.delete(productKey);
  }

  /**
   * Marks cart as converted to order
   * Once converted, cart becomes immutable
   * @throws Error if cart is empty
   */
  markAsConverted(): void {
    if (this.items.size === 0) {
      throw new Error('Cannot convert empty cart');
    }
    this.conversionStatus = 'converted';
  }

  private ensureNotConverted(): void {
    if (this.isConverted()) {
      throw new Error(
        `Cart ${this.cartId.getValue()} has already been converted and cannot be modified`,
      );
    }
  }

  private ensureWithinProductLimit(): void {
    if (this.items.size >= ShoppingCart.MAX_PRODUCTS) {
      throw new Error('Cart cannot contain more than 20 unique products');
    }
  }

  /**
   * Ensures empty carts cannot be restored with converted status
   * @throws Error if cart is empty and status is converted
   */
  private ensureConvertedCartNotEmpty(): void {
    if (this.conversionStatus === 'converted' && this.items.size === 0) {
      throw new Error('Cannot restore empty cart with converted status');
    }
  }

  /**
   * Ensures conversionStatus is a valid enum value
   * @throws Error if status is not 'active' or 'converted'
   */
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

  /**
   * Validates all domain invariants for the aggregate
   * Called during construction to ensure aggregate is always in a valid state
   *
   * Delegates to specific validation methods:
   * - ensureWithinProductLimit: Maximum 20 unique products
   * - ensureConvertedCartNotEmpty: No empty converted carts
   * - ensureValidConversionStatus: Valid status enum value
   *
   * @throws Error if any invariant is violated
   */
  private validate(): void {
    this.ensureWithinProductLimit();
    this.ensureConvertedCartNotEmpty();
    this.ensureValidConversionStatus();
  }
}
