/**
 * Domain exception thrown when a quantity value violates business rules
 * (must be an integer between 1 and 10, inclusive)
 */
export class InvalidQuantityError extends Error {
  constructor() {
    super('Quantity must be an integer between 1 and 10');
    this.name = 'InvalidQuantityError';
    Object.setPrototypeOf(this, InvalidQuantityError.prototype);
  }
}
