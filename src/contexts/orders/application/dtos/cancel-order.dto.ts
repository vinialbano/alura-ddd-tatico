import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * CancelOrderDTO
 *
 * Data Transfer Object for cancelling an order
 */
export class CancelOrderDTO {
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MinLength(1, { message: 'Cancellation reason cannot be empty' })
  reason: string;
}
