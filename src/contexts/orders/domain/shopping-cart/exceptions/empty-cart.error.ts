export class EmptyCartError extends Error {
  constructor() {
    super('Cannot convert empty cart');
    this.name = 'EmptyCartError';
    Object.setPrototypeOf(this, EmptyCartError.prototype);
  }
}
