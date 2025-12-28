import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common';
import { AddItemDto } from '../../application/dtos/add-item.dto';
import { CartResponseDto } from '../../application/dtos/cart-response.dto';
import { CreateCartDto } from '../../application/dtos/create-cart.dto';
import { UpdateQuantityDto } from '../../application/dtos/update-quantity.dto';
import { CartService } from '../../application/services/cart.service';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

/**
 * CartController
 *
 * REST API endpoints for shopping cart operations
 * Domain exceptions are automatically mapped to appropriate HTTP status codes via DomainExceptionFilter
 */
@Controller('carts')
@UseFilters(DomainExceptionFilter)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * POST /carts
   * Creates a new shopping cart
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCart(
    @Body() createCartDto: CreateCartDto,
  ): Promise<CartResponseDto> {
    return await this.cartService.createCart(createCartDto);
  }

  /**
   * POST /carts/:id/items
   * Adds an item to an existing cart
   */
  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @Param('id') cartId: string,
    @Body() addItemDto: AddItemDto,
  ): Promise<CartResponseDto> {
    return await this.handleCartNotFound(() =>
      this.cartService.addItem(cartId, addItemDto),
    );
  }

  /**
   * GET /carts/:id
   * Retrieves a cart by ID
   */
  @Get(':id')
  async getCart(@Param('id') cartId: string): Promise<CartResponseDto> {
    return await this.handleCartNotFound(() =>
      this.cartService.getCart(cartId),
    );
  }

  /**
   * POST /carts/:id/convert
   * Converts cart to order (marks as immutable)
   */
  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  async convertCart(@Param('id') cartId: string): Promise<CartResponseDto> {
    return await this.handleCartNotFound(() =>
      this.cartService.convertCart(cartId),
    );
  }

  /**
   * PUT /carts/:id/items/:productId
   * Updates quantity of an item in the cart
   */
  @Put(':id/items/:productId')
  @HttpCode(HttpStatus.OK)
  async updateItemQuantity(
    @Param('id') cartId: string,
    @Param('productId') productId: string,
    @Body() updateQuantityDto: UpdateQuantityDto,
  ): Promise<CartResponseDto> {
    return await this.handleCartNotFound(() =>
      this.cartService.updateItemQuantity(cartId, productId, updateQuantityDto),
    );
  }

  /**
   * DELETE /carts/:id/items/:productId
   * Removes an item from the cart
   */
  @Delete(':id/items/:productId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('id') cartId: string,
    @Param('productId') productId: string,
  ): Promise<CartResponseDto> {
    return await this.handleCartNotFound(() =>
      this.cartService.removeItem(cartId, productId),
    );
  }

  /**
   * Helper method to handle "Cart not found" errors
   * Domain exceptions are handled by DomainExceptionFilter and re-thrown
   * @private
   */
  private async handleCartNotFound<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.message === 'Cart not found') {
        throw new NotFoundException(error.message);
      }
      // Re-throw domain exceptions - they'll be caught by DomainExceptionFilter
      throw error;
    }
  }
}
