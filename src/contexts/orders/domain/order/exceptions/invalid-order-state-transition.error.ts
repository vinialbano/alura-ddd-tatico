export class InvalidOrderStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderStateTransitionError';
    Object.setPrototypeOf(this, InvalidOrderStateTransitionError.prototype);
  }
}
