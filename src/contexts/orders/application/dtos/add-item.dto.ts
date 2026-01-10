import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}
