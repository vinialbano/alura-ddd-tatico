export class OrderStatus {
  private constructor(private readonly value: string) {}

  static readonly AwaitingPayment = new OrderStatus('AWAITING_PAYMENT');
  static readonly Paid = new OrderStatus('PAID');

  // TODO: Student exercise - implement stock reservation flow
  // This status should be reached after payment is confirmed and inventory
  // system reserves products. Students should:
  // 1. Create StockReservedHandler in application layer
  // 2. Handle 'stock.reserved' events from inventory context
  // 3. Add order.applyStockReserved() method
  // 4. Update state machine to allow Paid → StockReserved transition
  static readonly StockReserved = new OrderStatus('STOCK_RESERVED');

  static readonly Cancelled = new OrderStatus('CANCELLED');

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
