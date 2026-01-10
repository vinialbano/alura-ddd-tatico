import { Money } from '../../../../shared/value-objects/money';
import { OrderId } from '../../../../shared/value-objects/order-id';
import { DomainEvent } from '../shared/domain-event';
import { CustomerId } from '../shared/value-objects/customer-id';
import { EventId } from '../shared/value-objects/event-id';
import { CartId } from '../shopping-cart/cart-id';
import { OrderPlaced } from './events/order-placed.event';
import { InvalidOrderStateTransitionError } from './exceptions/invalid-order-state-transition.error';
import { OrderItem } from './order-item';
import { OrderStatus } from './value-objects/order-status';
import { ShippingAddress } from './value-objects/shipping-address';

// Order Aggregate Root - manages order lifecycle through state machine
// State transitions: AwaitingPayment → Paid
// Invariants: min 1 item, currency consistency, valid state transitions
export class Order {
  private readonly _domainEvents: DomainEvent[] = [];

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
    private readonly _createdAt: Date,
  ) {
    this.validateInvariants();
  }

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

  // State transition: AwaitingPayment → Paid
  markAsPaid(paymentId: string): void {
    if (!this.canBePaid()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot mark order as paid: order is in ${this._status.toString()} state`,
      );
    }

    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;
  }

  // TODO: Student exercise - implement stock reservation
  // applyStockReserved(reservationId: string): void {
  //   // Validate current status is Paid
  //   // Transition to StockReserved
  //   // Store reservationId
  //   // Raise StockReserved domain event if needed
  // }

  canBePaid(): boolean {
    return this._status.equals(OrderStatus.AwaitingPayment);
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
