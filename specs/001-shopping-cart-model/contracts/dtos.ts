/**
 * Data Transfer Object Contracts for Shopping Cart Application
 *
 * DTOs bridge between HTTP/API layer and domain layer.
 * Location: src/application/dtos/
 */

/**
 * Input DTO for adding item to cart
 */
export interface AddItemDto {
  productId: string;
  quantity: number;
}

/**
 * Input DTO for updating item quantity
 */
export interface UpdateQuantityDto {
  productId: string;
  newQuantity: number;
}

/**
 * Input DTO for removing item
 */
export interface RemoveItemDto {
  productId: string;
}

/**
 * Response DTO for cart item
 */
export interface CartItemResponseDto {
  productId: string;
  quantity: number;
}

/**
 * Response DTO for shopping cart
 */
export interface CartResponseDto {
  cartId: string;
  customerId: string;
  items: CartItemResponseDto[];
  isConverted: boolean;
  itemCount: number;
}

/**
 * Input DTO for creating new cart
 */
export interface CreateCartDto {
  customerId: string;
}
