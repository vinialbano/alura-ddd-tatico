import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import { AddItemDto } from '../../application/dtos/add-item.dto';
import { CartResponseDto } from '../../application/dtos/cart-response.dto';
import { CreateCartDto } from '../../application/dtos/create-cart.dto';
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
    return await this.cartService.addItem(cartId, addItemDto);
  }

  /**
   * GET /carts/:id
   * Retrieves a cart by ID
   */
  @Get(':id')
  async getCart(@Param('id') cartId: string): Promise<CartResponseDto> {
    return await this.cartService.getCart(cartId);
  }
}
