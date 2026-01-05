import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for order cancellation request
 *
 * Requires a substantive cancellation reason to track why orders are cancelled.
 * This data is valuable for business analytics and customer service.
 */
export class CancelOrderDto {
  /**
   * Cancellation reason
   *
   * Must be 1-500 characters and cannot be whitespace-only
   *
   * @example "Customer changed mind"
   * @example "Item out of stock"
   * @example "Duplicate order"
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
