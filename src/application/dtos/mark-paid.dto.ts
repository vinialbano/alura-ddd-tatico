import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * MarkPaidDTO
 *
 * Data Transfer Object for marking an order as paid
 */
export class MarkPaidDTO {
  @IsString()
  @IsNotEmpty({ message: 'Payment ID is required' })
  @MinLength(1, { message: 'Payment ID cannot be empty' })
  paymentId: string;
}
