import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { CartService } from '../../application/services/cart.service';
import { CreateCartDto } from '../../application/dtos/create-cart.dto';
import { AddItemDto } from '../../application/dtos/add-item.dto';
import { UpdateQuantityDto } from '../../application/dtos/update-quantity.dto';
import { CartResponseDto } from '../../application/dtos/cart-response.dto';
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
    try {
      return await this.cartService.createCart(createCartDto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(message);
    }
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
    try {
      return await this.cartService.addItem(cartId, addItemDto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Cart not found') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  /**
   * GET /carts/:id
   * Retrieves a cart by ID
   */
  @Get(':id')
  async getCart(@Param('id') cartId: string): Promise<CartResponseDto> {
    try {
      return await this.cartService.getCart(cartId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Cart not found') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  /**
   * POST /carts/:id/convert
   * Converts cart to order (marks as immutable)
   */
  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  async convertCart(@Param('id') cartId: string): Promise<CartResponseDto> {
    try {
      return await this.cartService.convertCart(cartId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Cart not found') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
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
    try {
      return await this.cartService.updateItemQuantity(
        cartId,
        productId,
        updateQuantityDto,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Cart not found') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
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
    try {
      return await this.cartService.removeItem(cartId, productId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Cart not found') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
