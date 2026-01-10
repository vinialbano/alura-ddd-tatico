import { Money } from '../../../../shared/value-objects/money';
import { OrderId } from '../../../../shared/value-objects/order-id';
import { DomainEvent } from '../shared/domain-event';
import { CustomerId } from '../shared/value-objects/customer-id';
import { EventId } from '../shared/value-objects/event-id';
import { CartId } from '../shopping-cart/cart-id';
import { OrderCancelled } from './events/order-cancelled.event';
import { OrderPaid } from './events/order-paid.event';
import { OrderPlaced } from './events/order-placed.event';
import { InvalidOrderStateTransitionError } from './exceptions/invalid-order-state-transition.error';
import { OrderItem } from './order-item';
import { OrderStatus } from './value-objects/order-status';
import { ShippingAddress } from './value-objects/shipping-address';

// Order Aggregate Root - manages order lifecycle through state machine
// State transitions: AwaitingPayment → Paid → Cancelled
// Invariants: min 1 item, currency consistency, valid state transitions
export class Order {
  private readonly _domainEvents: DomainEvent[] = [];
  private readonly _processedPaymentIds: Set<string> = new Set();

  private constructor(
    private readonly _id: OrderId,
    private readonly _cartId: CartId,
    private readonly _customerId: CustomerId,
    private readonly _items: OrderItem[],
    private readonly _shippingAddress: ShippingAddress,
    private _status: OrderStatus,
    private readonly _orderLevelDiscount: Money,
    private readonly _totalAmount: Money,
    private _paymentId: string | null,
    private _cancellationReason: string | null,
    private readonly _createdAt: Date,
  ) {
    this.validateInvariants();
  }

  // Creates new order in AwaitingPayment status
  static create(
    id: OrderId,
    cartId: CartId,
    customerId: CustomerId,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    orderLevelDiscount: Money,
    totalAmount: Money,
  ): Order {
    const createdAt = new Date();
    const order = new Order(
      id,
      cartId,
      customerId,
      items,
      shippingAddress,
      OrderStatus.AwaitingPayment,
      orderLevelDiscount,
      totalAmount,
      null, // paymentId
      null, // cancellationReason
      createdAt,
    );

    // Emit OrderPlaced domain event
    order._domainEvents.push(
      new OrderPlaced(
        EventId.generate(),
        id,
        customerId,
        cartId,
        items,
        totalAmount,
        shippingAddress,
        createdAt,
      ),
    );

    return order;
  }

  // Marks order as paid - idempotent per paymentId
  markAsPaid(paymentId: string): void {
    // Idempotency check: If we've already processed this payment ID, return early
    if (this._processedPaymentIds.has(paymentId)) {
      return;
    }

    if (!this.canBePaid()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot mark order as paid: order is in ${this._status.toString()} state`,
      );
    }

    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;
    this._processedPaymentIds.add(paymentId);

    // Raise domain event
    this._domainEvents.push(
      new OrderPaid(
        EventId.generate(),
        this._id.getValue(),
        new Date(),
        paymentId,
      ),
    );
  }

  // TODO: Student exercise - implement stock reservation
  // applyStockReserved(reservationId: string): void {
  //   // Validate current status is Paid
  //   // Transition to StockReserved
  //   // Store reservationId
  //   // Raise StockReserved domain event if needed
  // }

  // Cancels order - from AwaitingPayment (no refund) or Paid (refund needed)
  cancel(reason: string): void {
    if (!this.canBeCancelled()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot cancel order: order is in ${this._status.toString()} state`,
      );
    }

    // Validate reason is not empty or whitespace-only
    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason cannot be empty');
    }

    // Capture previous state before transitioning
    const previousState = this._status.toString();

    this._status = OrderStatus.Cancelled;
    this._cancellationReason = reason;

    // Raise domain event
    this._domainEvents.push(
      new OrderCancelled(
        EventId.generate(),
        this._id.getValue(),
        new Date(),
        reason,
        previousState,
      ),
    );
  }

  canBePaid(): boolean {
    return this._status.equals(OrderStatus.AwaitingPayment);
  }

  canBeCancelled(): boolean {
    return (
      this._status.equals(OrderStatus.AwaitingPayment) ||
      this._status.equals(OrderStatus.Paid)
    );
  }

  // Idempotency check for payment processing
  hasProcessedPayment(paymentId: string): boolean {
    return this._processedPaymentIds.has(paymentId);
  }

  private validateInvariants(): void {
    if (this._items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Currency consistency enforced by pricing service, validated here for defense
    const orderCurrency = this._totalAmount.currency;
    const allSameCurrency = this._items.every(
      (item) =>
        item.unitPrice.currency === orderCurrency &&
        item.itemDiscount.currency === orderCurrency,
    );

    if (!allSameCurrency) {
      throw new Error(
        'All order items must use the same currency as the order total',
      );
    }

    if (this._orderLevelDiscount.currency !== orderCurrency) {
      throw new Error(
        'Order level discount must use the same currency as the order total',
      );
    }
  }

  // Getters for aggregate root properties

  get id(): OrderId {
    return this._id;
  }

  get cartId(): CartId {
    return this._cartId;
  }

  get customerId(): CustomerId {
    return this._customerId;
  }

  get items(): readonly OrderItem[] {
    return this._items;
  }

  get shippingAddress(): ShippingAddress {
    return this._shippingAddress;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get orderLevelDiscount(): Money {
    return this._orderLevelDiscount;
  }

  get totalAmount(): Money {
    return this._totalAmount;
  }

  get paymentId(): string | null {
    return this._paymentId;
  }

  get cancellationReason(): string | null {
    return this._cancellationReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  getDomainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  // Called after publishing events to bus
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}
