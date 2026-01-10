import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidCartOperationError } from '../../domain/shopping-cart/exceptions/invalid-cart-operation.error';
import { EmptyCartError } from '../../domain/shopping-cart/exceptions/empty-cart.error';
import { InvalidOrderStateTransitionError } from '../../domain/order/exceptions/invalid-order-state-transition.error';

/**
 * Exception filter for domain and application exceptions
 * Maps domain-level business rule violations and application-level exceptions
 * to appropriate HTTP status codes
 */
@Catch(
  InvalidCartOperationError,
  EmptyCartError,
  InvalidOrderStateTransitionError,
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
    if (exception instanceof InvalidOrderStateTransitionError) {
      return {
        status: HttpStatus.CONFLICT,
        error: 'Conflict',
      };
    }

    // 409 Conflict - Cart already converted (detect by message)
    if (
      exception instanceof InvalidCartOperationError &&
      exception.message.includes('already been converted')
    ) {
      return {
        status: HttpStatus.CONFLICT,
        error: 'Conflict',
      };
    }

    // 400 Bad Request - Invalid input or business rule violation
    if (
      exception instanceof InvalidCartOperationError ||
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
