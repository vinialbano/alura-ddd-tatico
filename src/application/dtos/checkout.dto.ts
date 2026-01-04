import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * ShippingAddressDTO
 *
 * Data Transfer Object for shipping address in checkout request
 */
export class ShippingAddressDTO {
  @IsString()
  @IsNotEmpty()
  street!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  stateOrProvince!: string;

  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;
}

/**
 * CheckoutDTO
 *
 * Request DTO for POST /orders/checkout endpoint
 * Initiates order creation from an existing shopping cart
 */
export class CheckoutDTO {
  @IsUUID()
  @IsNotEmpty()
  cartId!: string;

  @ValidateNested()
  @Type(() => ShippingAddressDTO)
  @IsNotEmpty()
  shippingAddress!: ShippingAddressDTO;
}
