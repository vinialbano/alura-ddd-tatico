import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CartAlreadyConvertedError } from '../../domain/exceptions/cart-already-converted.error';
import { MaxProductsExceededError } from '../../domain/exceptions/max-products-exceeded.error';
import { InvalidQuantityError } from '../../domain/exceptions/invalid-quantity.error';
import { ProductNotInCartError } from '../../domain/exceptions/product-not-in-cart.error';
import { EmptyCartError } from '../../domain/exceptions/empty-cart.error';

/**
 * Exception filter for domain exceptions
 * Maps domain-level business rule violations to appropriate HTTP status codes
 */
@Catch(
  CartAlreadyConvertedError,
  MaxProductsExceededError,
  InvalidQuantityError,
  ProductNotInCartError,
  EmptyCartError,
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

    // Fallback (should not reach here due to @Catch decorator)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
    };
  }
}
