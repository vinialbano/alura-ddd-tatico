import { OrderItem } from '../../src/domain/order/order-item';
import { ProductSnapshot } from '../../src/domain/order/value-objects/product-snapshot';
import { Quantity } from '../../src/domain/shared/value-objects/quantity';
import { Money } from '../../src/domain/order/value-objects/money';
import { TEST_CURRENCY } from '../fixtures/common-values';

/**
 * Test builder for OrderItem with sensible defaults.
 * Test-only - no validation, allows invalid states for edge case testing.
 */
export class OrderItemBuilder {
  private productName: string = 'Test Product';
  private productDescription: string = 'Test product description';
  private productSku: string = 'SKU-TEST-001';
  private quantity: number = 1;
  private unitPrice: Money = new Money(10.0, TEST_CURRENCY);
  private itemDiscount: Money = new Money(0, TEST_CURRENCY);

  private constructor() {}

  static create(): OrderItemBuilder {
    return new OrderItemBuilder();
  }

  withProductName(name: string): OrderItemBuilder {
    this.productName = name;
    this.productSku = `SKU-${name.replace(/\s+/g, '-').toUpperCase()}`;
    return this;
  }

  withQuantity(quantity: number): OrderItemBuilder {
    this.quantity = quantity;
    return this;
  }

  withUnitPrice(price: Money): OrderItemBuilder {
    this.unitPrice = price;
    return this;
  }

  withItemDiscount(discount: Money): OrderItemBuilder {
    this.itemDiscount = discount;
    return this;
  }

  build(): OrderItem {
    const productSnapshot = new ProductSnapshot({
      name: this.productName,
      description: this.productDescription,
      sku: this.productSku,
    });

    return OrderItem.create(
      productSnapshot,
      Quantity.of(this.quantity),
      this.unitPrice,
      this.itemDiscount,
    );
  }
}
