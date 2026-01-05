import { OrderId } from './value-objects/order-id';
import { CartId } from '../shopping-cart/value-objects/cart-id';
import { CustomerId } from '../shared/value-objects/customer-id';
import { OrderStatus } from './value-objects/order-status';
import { Money } from './value-objects/money';
import { ShippingAddress } from './value-objects/shipping-address';
import { OrderItem } from './order-item';
import { InvalidOrderStateTransitionError } from './exceptions/invalid-order-state-transition.error';
import { DomainEvent } from '../shared/domain-event';
import { OrderPaid } from './events/order-paid.event';
import { OrderCancelled } from './events/order-cancelled.event';

/**
 * Order Aggregate Root
 *
 * Represents a customer's purchase intent and manages the complete order lifecycle
 * through a state machine: AwaitingPayment → Paid → Cancelled
 *
 * Key Responsibilities:
 * - Enforce order state machine invariants
 * - Own and manage OrderItems collection
 * - Capture product snapshots and pricing at checkout time
 * - Track payment and cancellation information
 *
 * State Machine:
 * - AwaitingPayment (initial): Order created, waiting for payment
 * - Paid: Payment received and recorded
 * - Cancelled: Order cancelled (from either AwaitingPayment or Paid)
 *
 * Invariants:
 * - Must have at least one OrderItem
 * - All OrderItems must share same currency as Order totalAmount
 * - Can only transition to Paid from AwaitingPayment
 * - Can only transition to Cancelled from AwaitingPayment or Paid
 * - Cannot transition from Cancelled to any other state
 * - PaymentId must be provided when marking as Paid
 * - CancellationReason must be provided when marking as Cancelled
 */
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
    private _cancellationReason: string | null,
    private readonly _createdAt: Date,
  ) {
    this.validateInvariants();
  }

  /**
   * Factory method to create a new Order in AwaitingPayment status
   *
   * @param id - Unique order identifier
   * @param cartId - Reference to source shopping cart
   * @param customerId - Customer who created the order
   * @param items - Collection of order items (min 1 required)
   * @param shippingAddress - Delivery address
   * @param orderLevelDiscount - Cart-wide discount applied
   * @param totalAmount - Total order amount after all discounts
   * @returns New Order instance in AwaitingPayment status
   * @throws Error if items array is empty
   */
  static create(
    id: OrderId,
    cartId: CartId,
    customerId: CustomerId,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    orderLevelDiscount: Money,
    totalAmount: Money,
  ): Order {
    return new Order(
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
      new Date(),
    );
  }

  /**
   * Transition order from AwaitingPayment to Paid status
   *
   * Raises OrderPaid domain event when successful
   *
   * @param paymentId - Payment transaction identifier
   * @throws InvalidOrderStateTransitionError if not in AwaitingPayment status
   */
  markAsPaid(paymentId: string): void {
    if (!this.canBePaid()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot mark order as paid: order is in ${this._status.toString()} state`,
      );
    }

    this._status = OrderStatus.Paid;
    this._paymentId = paymentId;

    // Raise domain event
    this._domainEvents.push(
      new OrderPaid(this._id.getValue(), new Date(), paymentId),
    );
  }

  /**
   * Transition order to Cancelled status with reason
   *
   * Can be called from AwaitingPayment (cancellation) or Paid (refund scenario)
   *
   * Raises OrderCancelled domain event with previous state for subscriber context
   *
   * @param reason - Cancellation reason (min 1 character)
   * @throws InvalidOrderStateTransitionError if already cancelled
   */
  cancel(reason: string): void {
    if (!this.canBeCancelled()) {
      throw new InvalidOrderStateTransitionError(
        `Cannot cancel order: order is in ${this._status.toString()} state`,
      );
    }

    // Capture previous state before transitioning
    const previousState = this._status.toString();

    this._status = OrderStatus.Cancelled;
    this._cancellationReason = reason;

    // Raise domain event
    this._domainEvents.push(
      new OrderCancelled(
        this._id.getValue(),
        new Date(),
        reason,
        previousState,
      ),
    );
  }

  /**
   * Check if order can accept payment
   *
   * @returns true if order is in AwaitingPayment status
   */
  canBePaid(): boolean {
    return this._status.equals(OrderStatus.AwaitingPayment);
  }

  /**
   * Check if order can be cancelled
   *
   * @returns true if order is in AwaitingPayment or Paid status
   */
  canBeCancelled(): boolean {
    return (
      this._status.equals(OrderStatus.AwaitingPayment) ||
      this._status.equals(OrderStatus.Paid)
    );
  }

  /**
   * Validate aggregate invariants
   *
   * @throws Error if invariants are violated
   */
  private validateInvariants(): void {
    if (this._items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Additional invariant: All items must share same currency as order total
    // This is enforced by the pricing service, but we validate here as well
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

  /**
   * Get all domain events raised by this aggregate
   *
   * @returns Readonly array of domain events
   */
  getDomainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  /**
   * Clear all domain events after they have been published
   *
   * Should be called by the application service after successfully
   * publishing events to the event bus
   */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}
