/**
 * UpdateQuantityDto
 *
 * Data transfer object for updating an item's quantity in the cart
 */
export class UpdateQuantityDto {
  /**
   * New quantity for the item (replaces current quantity)
   * Must be an integer between 1 and 10
   */
  quantity: number;
}
