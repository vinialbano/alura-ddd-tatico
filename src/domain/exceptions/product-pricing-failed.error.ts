export class ProductPricingFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductPricingFailedError';
    Object.setPrototypeOf(this, ProductPricingFailedError.prototype);
  }
}
