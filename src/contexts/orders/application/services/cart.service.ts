import { Inject, Injectable } from '@nestjs/common';
import { SHOPPING_CART_REPOSITORY } from '../../cart.tokens';
import { CustomerId } from '../../domain/shared/value-objects/customer-id';
import { ProductId } from '../../domain/shared/value-objects/product-id';
import { Quantity } from '../../domain/shared/value-objects/quantity';
import { CartId } from '../../domain/shopping-cart/cart-id';
import { ShoppingCart } from '../../domain/shopping-cart/shopping-cart';
import type { ShoppingCartRepository } from '../../domain/shopping-cart/shopping-cart.repository';
import { AddItemDto } from '../dtos/add-item.dto';
import {
  CartItemResponseDto,
  CartResponseDto,
} from '../dtos/cart-response.dto';
import { CreateCartDto } from '../dtos/create-cart.dto';
import { UpdateQuantityDto } from '../dtos/update-quantity.dto';
import { CartNotFoundException } from '../exceptions/cart-not-found.exception';

/**
 * CartService
 *
 * Application service for cart use case orchestration.
 * Coordinates between DTOs, domain objects, and repositories.
 */
@Injectable()
export class CartService {
  constructor(
    @Inject(SHOPPING_CART_REPOSITORY)
    private readonly repository: ShoppingCartRepository,
  ) {}

  /**
   * Creates a new shopping cart for a customer
   * @param dto - CreateCartDto with customer ID
   * @returns CartResponseDto with new cart details
   */
  async createCart(dto: CreateCartDto): Promise<CartResponseDto> {
    const cartId = CartId.create();
    const customerId = CustomerId.fromString(dto.customerId);

    const cart = ShoppingCart.create(cartId, customerId);

    await this.repository.save(cart);

    return this.mapToDto(cart);
  }

  /**
   * Adds an item to an existing cart
   * @param cartIdStr - Cart identifier as string
   * @param dto - AddItemDto with product ID and quantity
   * @returns CartResponseDto with updated cart
   * @throws CartNotFoundException if cart not found
   */
  async addItem(cartIdStr: string, dto: AddItemDto): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    const productId = ProductId.fromString(dto.productId);
    const quantity = Quantity.of(dto.quantity);

    cart.addItem(productId, quantity);

    await this.repository.save(cart);

    return this.mapToDto(cart);
  }

  /**
   * Retrieves a cart by ID
   * @param cartIdStr - Cart identifier as string
   * @returns CartResponseDto with cart details
   * @throws CartNotFoundException if cart not found
   */
  async getCart(cartIdStr: string): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    return this.mapToDto(cart);
  }

  /**
   * Updates quantity of an item in the cart
   * @param cartIdStr - Cart identifier as string
   * @param productIdStr - Product identifier as string
   * @param dto - UpdateQuantityDto with new quantity
   * @returns CartResponseDto with updated cart
   * @throws CartNotFoundException if cart not found
   * @throws ProductNotInCartError if product not in cart
   */
  async updateItemQuantity(
    cartIdStr: string,
    productIdStr: string,
    dto: UpdateQuantityDto,
  ): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    const productId = ProductId.fromString(productIdStr);
    const quantity = Quantity.of(dto.quantity);

    cart.updateItemQuantity(productId, quantity);

    await this.repository.save(cart);

    return this.mapToDto(cart);
  }

  /**
   * Removes an item from the cart
   * @param cartIdStr - Cart identifier as string
   * @param productIdStr - Product identifier as string
   * @returns CartResponseDto with updated cart
   * @throws CartNotFoundException if cart not found
   * @throws ProductNotInCartError if product not in cart
   */
  async removeItem(
    cartIdStr: string,
    productIdStr: string,
  ): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new CartNotFoundException(cartId);
    }

    const productId = ProductId.fromString(productIdStr);

    cart.removeItem(productId);

    await this.repository.save(cart);

    return this.mapToDto(cart);
  }

  /**
   * Maps domain ShoppingCart to CartResponseDto
   * @param cart - ShoppingCart aggregate
   * @returns CartResponseDto
   */
  private mapToDto(cart: ShoppingCart): CartResponseDto {
    const items: CartItemResponseDto[] = cart.getItems().map((item) => ({
      productId: item.getProductId().getValue(),
      quantity: item.getQuantity().getValue(),
    }));

    return {
      cartId: cart.getCartId().getValue(),
      customerId: cart.getCustomerId().getValue(),
      items,
      itemCount: cart.getItemCount(),
      isConverted: cart.isConverted(),
    };
  }
}
