/**
 * CartItemResponseDto
 *
 * Output DTO for a cart item
 */
export class CartItemResponseDto {
  productId: string;
  quantity: number;
}

/**
 * CartResponseDto
 *
 * Output DTO for shopping cart
 */
export class CartResponseDto {
  cartId: string;
  customerId: string;
  items: CartItemResponseDto[];
  itemCount: number;
  isConverted: boolean;
}
