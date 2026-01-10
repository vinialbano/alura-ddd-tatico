export class CartItemResponseDto {
  productId: string;
  quantity: number;
}

export class CartResponseDto {
  cartId: string;
  customerId: string;
  items: CartItemResponseDto[];
  itemCount: number;
  isConverted: boolean;
}
