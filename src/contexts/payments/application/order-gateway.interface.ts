export interface OrderGateway {
  /**
   * Called by Payments BC after successful payment processing
   */
  markOrderAsPaid(orderId: string, paymentId: string): Promise<void>;
}

export const ORDER_GATEWAY = Symbol('ORDER_GATEWAY');
