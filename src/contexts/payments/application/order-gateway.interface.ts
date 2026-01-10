export interface OrderGateway {
  /**
   * Mark an order as paid
   * Called by Payments BC after successful payment processing
   */
  markOrderAsPaid(orderId: string, paymentId: string): Promise<void>;
}

export const ORDER_GATEWAY = Symbol('ORDER_GATEWAY');
