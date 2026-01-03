/**
 * MoneyDTO
 *
 * Data Transfer Object for Money value object representation in HTTP responses
 */
export class MoneyDTO {
  amount!: number;
  currency!: string;

  constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }
}

/**
 * ProductSnapshotDTO
 *
 * Data Transfer Object for ProductSnapshot value object in HTTP responses
 */
export class ProductSnapshotDTO {
  name!: string;
  description!: string;
  sku!: string;

  constructor(name: string, description: string, sku: string) {
    this.name = name;
    this.description = description;
    this.sku = sku;
  }
}

/**
 * OrderItemDTO
 *
 * Data Transfer Object for OrderItem entity in HTTP responses
 */
export class OrderItemDTO {
  productSnapshot!: ProductSnapshotDTO;
  quantity!: number;
  unitPrice!: MoneyDTO;
  itemDiscount!: MoneyDTO;
  lineTotal!: MoneyDTO;

  constructor(
    productSnapshot: ProductSnapshotDTO,
    quantity: number,
    unitPrice: MoneyDTO,
    itemDiscount: MoneyDTO,
    lineTotal: MoneyDTO,
  ) {
    this.productSnapshot = productSnapshot;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
    this.itemDiscount = itemDiscount;
    this.lineTotal = lineTotal;
  }
}

/**
 * ShippingAddressResponseDTO
 *
 * Data Transfer Object for ShippingAddress value object in HTTP responses
 */
export class ShippingAddressResponseDTO {
  street!: string;
  addressLine2?: string;
  city!: string;
  stateOrProvince!: string;
  postalCode!: string;
  country!: string;
  deliveryInstructions?: string;

  constructor(data: {
    street: string;
    addressLine2?: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    country: string;
    deliveryInstructions?: string;
  }) {
    this.street = data.street;
    this.addressLine2 = data.addressLine2;
    this.city = data.city;
    this.stateOrProvince = data.stateOrProvince;
    this.postalCode = data.postalCode;
    this.country = data.country;
    this.deliveryInstructions = data.deliveryInstructions;
  }
}

/**
 * OrderResponseDTO
 *
 * Complete order representation for HTTP responses
 * Used for GET /orders/:id and POST /orders/checkout responses
 */
export class OrderResponseDTO {
  id!: string;
  cartId!: string;
  customerId!: string;
  items!: OrderItemDTO[];
  shippingAddress!: ShippingAddressResponseDTO;
  status!: string;
  orderLevelDiscount!: MoneyDTO;
  totalAmount!: MoneyDTO;
  paymentId!: string | null;
  cancellationReason!: string | null;
  createdAt!: Date;

  constructor(data: {
    id: string;
    cartId: string;
    customerId: string;
    items: OrderItemDTO[];
    shippingAddress: ShippingAddressResponseDTO;
    status: string;
    orderLevelDiscount: MoneyDTO;
    totalAmount: MoneyDTO;
    paymentId: string | null;
    cancellationReason: string | null;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.cartId = data.cartId;
    this.customerId = data.customerId;
    this.items = data.items;
    this.shippingAddress = data.shippingAddress;
    this.status = data.status;
    this.orderLevelDiscount = data.orderLevelDiscount;
    this.totalAmount = data.totalAmount;
    this.paymentId = data.paymentId;
    this.cancellationReason = data.cancellationReason;
    this.createdAt = data.createdAt;
  }
}
