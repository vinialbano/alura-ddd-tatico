import { IsNotEmpty, IsString } from 'class-validator';

/**
 * CreateCartDto
 *
 * Input DTO for creating a new shopping cart
 */
export class CreateCartDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;
}
