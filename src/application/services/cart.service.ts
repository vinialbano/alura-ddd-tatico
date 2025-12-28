import { Injectable } from '@nestjs/common';
import { ShoppingCartRepository } from '../../domain/repositories/shopping-cart.repository.interface';
import { ShoppingCart } from '../../domain/aggregates/shopping-cart';
import { CartId } from '../../domain/value-objects/cart-id';
import { CustomerId } from '../../domain/value-objects/customer-id';
import { ProductId } from '../../domain/value-objects/product-id';
import { Quantity } from '../../domain/value-objects/quantity';
import { CreateCartDto } from '../dtos/create-cart.dto';
import { AddItemDto } from '../dtos/add-item.dto';
import { CartResponseDto, CartItemResponseDto } from '../dtos/cart-response.dto';

/**
 * CartService
 *
 * Application service for cart use case orchestration.
 * Coordinates between DTOs, domain objects, and repositories.
 */
@Injectable()
export class CartService {
  constructor(private readonly repository: ShoppingCartRepository) {}

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
   * @throws Error if cart not found
   */
  async addItem(cartIdStr: string, dto: AddItemDto): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new Error('Cart not found');
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
   * @throws Error if cart not found
   */
  async getCart(cartIdStr: string): Promise<CartResponseDto> {
    const cartId = CartId.fromString(cartIdStr);
    const cart = await this.repository.findById(cartId);

    if (!cart) {
      throw new Error('Cart not found');
    }

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
