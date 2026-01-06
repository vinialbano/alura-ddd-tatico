import { Order } from '../../src/domain/order/order';
import { OrderId } from '../../src/domain/order/value-objects/order-id';
import { CartId } from '../../src/domain/shopping-cart/value-objects/cart-id';
import { CustomerId } from '../../src/domain/shared/value-objects/customer-id';
import { OrderStatus } from '../../src/domain/order/value-objects/order-status';
import { Money } from '../../src/domain/order/value-objects/money';
import { ShippingAddress } from '../../src/domain/order/value-objects/shipping-address';
import { OrderItem } from '../../src/domain/order/order-item';
import { OrderItemBuilder } from './order-item.builder';
import { TEST_ADDRESS_US, TEST_CURRENCY } from '../fixtures/common-values';

/**
 * Test builder for Order with sensible defaults.
 * Test-only - uses reflection to set status for testing purposes.
 *
 * Default configuration:
 * - 2 items: Colombian Coffee ($12.99 x1), Green Tea ($8.99 x2)
 * - Status: AwaitingPayment
 * - Address: TEST_ADDRESS_US
 * - Order-level discount: $0
 * - Total: $30.97 (calculated from items)
 */
export class OrderBuilder {
  private orderId: OrderId = OrderId.generate();
  private cartId: CartId = CartId.create();
  private customerId: CustomerId = CustomerId.fromString('customer-123');
  private items: OrderItem[] = this.createDefaultItems();
  private shippingAddress: ShippingAddress = TEST_ADDRESS_US;
  private status: OrderStatus = OrderStatus.AwaitingPayment;
  private orderLevelDiscount: Money = new Money(0, TEST_CURRENCY);

  private constructor() {}

  static create(): OrderBuilder {
    return new OrderBuilder();
  }

  private createDefaultItems(): OrderItem[] {
    return [
      OrderItemBuilder.create()
        .withProductName('Colombian Coffee')
        .withQuantity(1)
        .withUnitPrice(new Money(12.99, TEST_CURRENCY))
        .build(),
      OrderItemBuilder.create()
        .withProductName('Green Tea')
        .withQuantity(2)
        .withUnitPrice(new Money(8.99, TEST_CURRENCY))
        .build(),
    ];
  }

  withOrderId(orderId: OrderId): OrderBuilder {
    this.orderId = orderId;
    return this;
  }

  withCartId(cartId: CartId): OrderBuilder {
    this.cartId = cartId;
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.status = status;
    return this;
  }

  withCustomerId(customerId: CustomerId): OrderBuilder {
    this.customerId = customerId;
    return this;
  }

  withShippingAddress(address: ShippingAddress): OrderBuilder {
    this.shippingAddress = address;
    return this;
  }

  withItems(items: OrderItem[]): OrderBuilder {
    this.items = items;
    return this;
  }

  withOrderLevelDiscount(discount: Money): OrderBuilder {
    this.orderLevelDiscount = discount;
    return this;
  }

  build(): Order {
    // Calculate total amount: sum of all items minus order-level discount
    const itemsTotal = this.items.reduce((sum, item) => {
      const itemTotal = item.unitPrice.amount * item.quantity.getValue();
      return sum + itemTotal;
    }, 0);

    const totalAmount = new Money(
      itemsTotal - this.orderLevelDiscount.amount,
      TEST_CURRENCY
    );

    // Create order using factory method (always starts as AwaitingPayment)
    const order = Order.create(
      this.orderId,
      this.cartId,
      this.customerId,
      this.items,
      this.shippingAddress,
      this.orderLevelDiscount,
      totalAmount,
    );

    // Use reflection to set non-default status for test purposes
    // This is acceptable for test-only code to avoid complex state machine logic
    if (this.status !== OrderStatus.AwaitingPayment) {
      (order as any)._status = this.status;
    }

    return order;
  }
}
