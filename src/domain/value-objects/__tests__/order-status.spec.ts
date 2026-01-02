import { OrderStatus } from '../order-status';

describe('OrderStatus', () => {
  describe('static instances', () => {
    it('should have AwaitingPayment instance', () => {
      expect(OrderStatus.AwaitingPayment).toBeDefined();
      expect(OrderStatus.AwaitingPayment.toString()).toBe('AWAITING_PAYMENT');
    });

    it('should have Paid instance', () => {
      expect(OrderStatus.Paid).toBeDefined();
      expect(OrderStatus.Paid.toString()).toBe('PAID');
    });

    it('should have Cancelled instance', () => {
      expect(OrderStatus.Cancelled).toBeDefined();
      expect(OrderStatus.Cancelled.toString()).toBe('CANCELLED');
    });
  });

  describe('equality', () => {
    it('should be equal when comparing same static instance', () => {
      const status1 = OrderStatus.AwaitingPayment;
      const status2 = OrderStatus.AwaitingPayment;

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal when comparing different static instances', () => {
      const status1 = OrderStatus.AwaitingPayment;
      const status2 = OrderStatus.Paid;

      expect(status1.equals(status2)).toBe(false);
    });

    it('should handle all three states correctly', () => {
      expect(OrderStatus.AwaitingPayment.equals(OrderStatus.Paid)).toBe(false);
      expect(OrderStatus.AwaitingPayment.equals(OrderStatus.Cancelled)).toBe(
        false,
      );
      expect(OrderStatus.Paid.equals(OrderStatus.Cancelled)).toBe(false);
      expect(OrderStatus.Cancelled.equals(OrderStatus.Cancelled)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return AWAITING_PAYMENT for AwaitingPayment', () => {
      expect(OrderStatus.AwaitingPayment.toString()).toBe('AWAITING_PAYMENT');
    });

    it('should return PAID for Paid', () => {
      expect(OrderStatus.Paid.toString()).toBe('PAID');
    });

    it('should return CANCELLED for Cancelled', () => {
      expect(OrderStatus.Cancelled.toString()).toBe('CANCELLED');
    });
  });

  describe('immutability', () => {
    it('should always return same instance for static properties', () => {
      const ref1 = OrderStatus.AwaitingPayment;
      const ref2 = OrderStatus.AwaitingPayment;

      expect(ref1).toBe(ref2);
    });
  });
});
