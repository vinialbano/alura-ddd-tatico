import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class ProcessPaymentDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
