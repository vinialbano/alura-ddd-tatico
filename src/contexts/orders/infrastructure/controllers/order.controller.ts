import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseFilters,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutService } from '../../application/services/checkout.service';
import { OrderService } from '../../application/services/order.service';
import { CheckoutDTO } from '../../application/dtos/checkout.dto';
import { CancelOrderDTO } from '../../application/dtos/cancel-order.dto';
import { OrderResponseDTO } from '../../application/dtos/order-response.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { InvalidOrderStateTransitionError } from '../../domain/order/exceptions/invalid-order-state-transition.error';

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
    try {
      return await this.orderService.cancel(id, dto.reason);
    } catch (error) {
      if (error instanceof InvalidOrderStateTransitionError) {
        throw new ConflictException(error.message);
      }
      // Handle domain validation errors (empty/whitespace reason)
      if (
        error instanceof Error &&
        error.message.includes('Cancellation reason cannot be empty')
      ) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
