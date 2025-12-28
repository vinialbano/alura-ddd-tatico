import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CartService } from '../../application/services/cart.service';
import { CreateCartDto } from '../../application/dtos/create-cart.dto';
import { AddItemDto } from '../../application/dtos/add-item.dto';
import { CartResponseDto } from '../../application/dtos/cart-response.dto';

/**
 * CartController
 *
 * REST API endpoints for shopping cart operations
 */
@Controller('carts')
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
}
