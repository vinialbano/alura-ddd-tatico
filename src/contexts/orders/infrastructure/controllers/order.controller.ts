import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { CheckoutService } from '../../application/services/checkout.service';
import { OrderService } from '../../application/services/order.service';
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
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly orderService: OrderService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDTO): Promise<OrderResponseDTO> {
    return await this.checkoutService.checkout(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: string): Promise<OrderResponseDTO> {
    return await this.orderService.findById(id);
  }
}
