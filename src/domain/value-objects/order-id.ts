import { randomUUID } from 'crypto';

export class OrderId {
  public readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value.toLowerCase();
  }

  static generate(): OrderId {
    return new OrderId(randomUUID());
  }

  private validate(value: string): void {
    // UUID v4 regex pattern
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Invalid UUID format for OrderId');
    }
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
