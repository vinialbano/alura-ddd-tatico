import { CustomerId } from '../customer-id';

describe('CustomerId', () => {
  describe('fromString', () => {
    it('should create CustomerId from non-empty string', () => {
      const customerId = CustomerId.fromString('customer-123');

      expect(customerId.getValue()).toBe('customer-123');
    });

    it('should throw error for empty string', () => {
      expect(() => CustomerId.fromString('')).toThrow('ID cannot be empty');
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => CustomerId.fromString('   ')).toThrow('ID cannot be empty');
      expect(() => CustomerId.fromString('\t\n')).toThrow('ID cannot be empty');
    });

    it('should trim whitespace from input', () => {
      const customerId = CustomerId.fromString('  customer-123  ');

      expect(customerId.getValue()).toBe('customer-123');
    });

    it('should accept alphanumeric and special characters', () => {
      const customerId1 = CustomerId.fromString('customer_123');
      const customerId2 = CustomerId.fromString('customer-abc-456');
      const customerId3 = CustomerId.fromString('user@domain.com');

      expect(customerId1.getValue()).toBe('customer_123');
      expect(customerId2.getValue()).toBe('customer-abc-456');
      expect(customerId3.getValue()).toBe('user@domain.com');
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const id1 = CustomerId.fromString('customer-123');
      const id2 = CustomerId.fromString('customer-123');

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = CustomerId.fromString('customer-123');
      const id2 = CustomerId.fromString('customer-456');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle trimmed comparison correctly', () => {
      const id1 = CustomerId.fromString('  customer-123  ');
      const id2 = CustomerId.fromString('customer-123');

      expect(id1.equals(id2)).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should return the underlying customer identifier', () => {
      const customerId = CustomerId.fromString('customer-abc');

      expect(customerId.getValue()).toBe('customer-abc');
    });
  });
});
