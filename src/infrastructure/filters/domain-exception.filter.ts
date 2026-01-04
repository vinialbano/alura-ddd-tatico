import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CartNotFoundException } from '../../application/exceptions/cart-not-found.exception';
import { CartAlreadyConvertedError } from '../../domain/shopping-cart/exceptions/cart-already-converted.error';
import { MaxProductsExceededError } from '../../domain/shopping-cart/exceptions/max-products-exceeded.error';
import { InvalidQuantityError } from '../../domain/shopping-cart/exceptions/invalid-quantity.error';
import { ProductNotInCartError } from '../../domain/shopping-cart/exceptions/product-not-in-cart.error';
import { EmptyCartError } from '../../domain/shopping-cart/exceptions/empty-cart.error';
import { ProductDataUnavailableError } from '../../domain/order/exceptions/product-data-unavailable.error';
import { ProductPricingFailedError } from '../../domain/order/exceptions/product-pricing-failed.error';

/**
 * Exception filter for domain and application exceptions
 * Maps domain-level business rule violations and application-level exceptions
 * to appropriate HTTP status codes
 */
@Catch(
  CartNotFoundException,
  CartAlreadyConvertedError,
  MaxProductsExceededError,
  InvalidQuantityError,
  ProductNotInCartError,
  EmptyCartError,
  ProductDataUnavailableError,
  ProductPricingFailedError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, error } = this.mapExceptionToHttpResponse(exception);

    response.status(status).json({
      statusCode: status,
      error: error,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }

  private mapExceptionToHttpResponse(exception: Error): {
    status: number;
    error: string;
  } {
    // 404 Not Found - Resource doesn't exist
    if (exception instanceof CartNotFoundException) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: 'Not Found',
      };
    }

    // 409 Conflict - Attempting operation on incompatible state
    if (exception instanceof CartAlreadyConvertedError) {
      return {
        status: HttpStatus.CONFLICT,
        error: 'Conflict',
      };
    }

    // 400 Bad Request - Invalid input or business rule violation
    if (
      exception instanceof MaxProductsExceededError ||
      exception instanceof InvalidQuantityError ||
      exception instanceof ProductNotInCartError ||
      exception instanceof EmptyCartError
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
      };
    }

    // 400 Bad Request - Gateway/external service failures during checkout
    if (
      exception instanceof ProductDataUnavailableError ||
      exception instanceof ProductPricingFailedError
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
      };
    }

    // Fallback (should not reach here due to @Catch decorator)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
    };
  }
}
