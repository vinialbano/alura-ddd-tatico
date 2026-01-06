export class OrderStatus {
  private constructor(private readonly value: string) {}

  static readonly AwaitingPayment = new OrderStatus('AWAITING_PAYMENT');
  static readonly Paid = new OrderStatus('PAID');
  static readonly StockReserved = new OrderStatus('STOCK_RESERVED');
  static readonly Cancelled = new OrderStatus('CANCELLED');

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
