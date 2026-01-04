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
import { MarkPaidDTO } from '../../application/dtos/mark-paid.dto';
import { CancelOrderDTO } from '../../application/dtos/cancel-order.dto';
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

  /**
   * GET /orders/:id
   *
   * Get an order by ID
   *
   * @param id - Order ID
   * @returns Order response DTO
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: string): Promise<OrderResponseDTO> {
    return await this.orderService.findById(id);
  }

  /**
   * POST /orders/:id/mark-paid
   *
   * Mark an order as paid
   *
   * @param id - Order ID
   * @param dto - Mark paid request with payment ID
   * @returns Order response DTO
   */
  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDTO,
  ): Promise<OrderResponseDTO> {
    return await this.orderService.markAsPaid(id, dto.paymentId);
  }

  /**
   * POST /orders/:id/cancel
   *
   * Cancel an order
   *
   * @param id - Order ID
   * @param dto - Cancel order request with reason
   * @returns Order response DTO
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDTO,
  ): Promise<OrderResponseDTO> {
    return await this.orderService.cancel(id, dto.reason);
  }
}
