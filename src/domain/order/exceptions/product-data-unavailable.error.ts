export class ProductDataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductDataUnavailableError';
    Object.setPrototypeOf(this, ProductDataUnavailableError.prototype);
  }
}
