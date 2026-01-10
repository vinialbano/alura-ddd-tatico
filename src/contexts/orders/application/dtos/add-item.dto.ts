import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * AddItemDto
 *
 * Input DTO for adding an item to a shopping cart
 */
export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}
