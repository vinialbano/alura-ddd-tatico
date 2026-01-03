import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutService } from '../../application/services/checkout.service';
import { CheckoutDTO } from '../../application/dtos/checkout.dto';
import {
  OrderResponseDTO,
  OrderItemDTO,
  ProductSnapshotDTO,
  MoneyDTO,
  ShippingAddressResponseDTO,
} from '../../application/dtos/order-response.dto';
import { CartId } from '../../domain/shopping-cart/value-objects/cart-id';
import { ShippingAddress } from '../../domain/order/value-objects/shipping-address';
import { Order } from '../../domain/order/order';
import { CartNotFoundException } from '../../application/exceptions/cart-not-found.exception';
import { ProductDataUnavailableError } from '../../domain/order/exceptions/product-data-unavailable.error';
import { ProductPricingFailedError } from '../../domain/order/exceptions/product-pricing-failed.error';

/**
 * OrderController
 *
 * REST API controller for order operations
 * Handles HTTP requests and maps to application services
 */
@Controller('orders')
export class OrderController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * POST /orders/checkout
   *
   * Create an order from a shopping cart
   *
   * @param dto - Checkout request with cart ID and shipping address
   * @returns Order response DTO
   * @throws 400 Bad Request - Invalid input, empty cart, pricing failed
   * @throws 404 Not Found - Cart not found
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDTO): Promise<OrderResponseDTO> {
    try {
      // Map DTO to domain value objects
      const cartId = CartId.fromString(dto.cartId);
      const shippingAddress = new ShippingAddress({
        street: dto.shippingAddress.street,
        addressLine2: dto.shippingAddress.addressLine2,
        city: dto.shippingAddress.city,
        stateOrProvince: dto.shippingAddress.stateOrProvince,
        postalCode: dto.shippingAddress.postalCode,
        country: dto.shippingAddress.country,
        deliveryInstructions: dto.shippingAddress.deliveryInstructions,
      });

      // Execute checkout use case
      const order = await this.checkoutService.checkout(
        cartId,
        shippingAddress,
      );

      // Map domain Order to response DTO
      return this.mapOrderToResponseDTO(order);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Map Order aggregate to OrderResponseDTO
   */
  private mapOrderToResponseDTO(order: Order): OrderResponseDTO {
    const items: OrderItemDTO[] = order.items.map((item) => {
      const lineTotal = item.getLineTotal();
      return new OrderItemDTO(
        new ProductSnapshotDTO(
          item.productSnapshot.name,
          item.productSnapshot.description,
          item.productSnapshot.sku,
        ),
        item.quantity.getValue(),
        new MoneyDTO(item.unitPrice.amount, item.unitPrice.currency),
        new MoneyDTO(item.itemDiscount.amount, item.itemDiscount.currency),
        new MoneyDTO(lineTotal.amount, lineTotal.currency),
      );
    });

    const shippingAddress = new ShippingAddressResponseDTO({
      street: order.shippingAddress.street,
      addressLine2: order.shippingAddress.addressLine2,
      city: order.shippingAddress.city,
      stateOrProvince: order.shippingAddress.stateOrProvince,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      deliveryInstructions: order.shippingAddress.deliveryInstructions,
    });

    return new OrderResponseDTO({
      id: order.id.getValue(),
      cartId: order.cartId.getValue(),
      customerId: order.customerId.getValue(),
      items,
      shippingAddress,
      status: order.status.toString(),
      orderLevelDiscount: new MoneyDTO(
        order.orderLevelDiscount.amount,
        order.orderLevelDiscount.currency,
      ),
      totalAmount: new MoneyDTO(
        order.totalAmount.amount,
        order.totalAmount.currency,
      ),
      paymentId: order.paymentId,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
    });
  }

  /**
   * Handle and map domain/application exceptions to HTTP responses
   */
  private handleError(error: unknown): never {
    if (error instanceof CartNotFoundException) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof ProductDataUnavailableError) {
      throw new BadRequestException(
        `Product data unavailable: ${error.message}`,
      );
    }

    if (error instanceof ProductPricingFailedError) {
      throw new BadRequestException(`Pricing failed: ${error.message}`);
    }

    if (error instanceof Error) {
      if (error.message.includes('empty cart')) {
        throw new BadRequestException('Cannot checkout empty cart');
      }
      throw new BadRequestException(error.message);
    }

    throw new BadRequestException('Checkout failed');
  }
}
