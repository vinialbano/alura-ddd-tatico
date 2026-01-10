/**
 * Generic domain exception for invalid shopping cart operations
 * Replaces multiple specific exception classes for simpler error handling
 */
export class InvalidCartOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCartOperationError';
    Object.setPrototypeOf(this, InvalidCartOperationError.prototype);
  }
}
