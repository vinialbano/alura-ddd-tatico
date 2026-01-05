/**
 * Integration Message Envelope
 * Wrapper for messages exchanged between bounded contexts via message bus
 */
export interface IntegrationMessage<T> {
  /**
   * Unique message identifier (UUID)
   */
  messageId: string;

  /**
   * Message topic (e.g., "order.placed", "payment.approved")
   */
  topic: string;

  /**
   * Timestamp when message was published
   */
  timestamp: Date;

  /**
   * Domain-specific payload (JSON-serializable primitives only)
   */
  payload: T;

  /**
   * Correlation ID for tracing across bounded contexts (typically orderId)
   */
  correlationId: string;
}

/**
 * order.placed integration message payload
 */
export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  cartId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timestamp: string;
}

/**
 * payment.approved integration message payload
 */
export interface PaymentApprovedPayload {
  orderId: string;
  paymentId: string;
  approvedAmount: number;
  currency: string;
  timestamp: string;
}

/**
 * stock.reserved integration message payload
 */
export interface StockReservedPayload {
  orderId: string;
  reservationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  timestamp: string;
}

/**
 * order.paid integration message payload
 */
export interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  timestamp: string;
}

/**
 * order.cancelled integration message payload
 */
export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  previousStatus: string;
  timestamp: string;
}
