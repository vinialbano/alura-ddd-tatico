import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { CheckoutService } from '../../application/services/checkout.service';
import { CheckoutDTO } from '../../application/dtos/checkout.dto';
import { OrderResponseDTO } from '../../application/dtos/order-response.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

/**
 * OrderController
 *
 * REST API controller for order operations
 * Handles HTTP requests and maps to application services
 */
@Controller('orders')
@UseFilters(DomainExceptionFilter)
export class OrderController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * POST /orders/checkout
   *
   * Create an order from a shopping cart
   *
   * @param dto - Checkout request with cart ID and shipping address
   * @returns Order response DTO
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDTO): Promise<OrderResponseDTO> {
    return await this.checkoutService.checkout(dto);
  }
}
