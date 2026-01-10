/**
 * Integration Message Envelope
 * Wrapper for messages exchanged between bounded contexts via message bus
 */
export interface IntegrationMessage<T> {
  messageId: string;
  topic: string;
  timestamp: Date;
  payload: T;
  correlationId: string;
}

export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  cartId: string;
  items: Array<{
    productId: string;
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

export interface PaymentApprovedPayload {
  orderId: string;
  paymentId: string;
  approvedAmount: number;
  currency: string;
  timestamp: string;
}
