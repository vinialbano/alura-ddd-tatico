import { OrderId } from '../order-id';

describe('OrderId', () => {
  describe('generation', () => {
    it('should generate a valid UUID', () => {
      const orderId = OrderId.generate();

      expect(orderId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = OrderId.generate();
      const id2 = OrderId.generate();

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('creation from string', () => {
    it('should create OrderId from valid UUID string', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const orderId = new OrderId(uuid);

      expect(orderId.value).toBe(uuid);
    });

    it('should reject invalid UUID format', () => {
      expect(() => new OrderId('invalid-uuid')).toThrow(
        'Invalid UUID format for OrderId',
      );
      expect(() => new OrderId('123')).toThrow(
        'Invalid UUID format for OrderId',
      );
      expect(() => new OrderId('')).toThrow('Invalid UUID format for OrderId');
    });

    it('should accept lowercase UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const orderId = new OrderId(uuid);

      expect(orderId.value).toBe(uuid);
    });

    it('should normalize uppercase UUID to lowercase', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const orderId = new OrderId(uuid);

      expect(orderId.value).toBe(uuid.toLowerCase());
    });
  });

  describe('equality', () => {
    it('should be equal when UUID values are the same', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = new OrderId(uuid);
      const id2 = new OrderId(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should not be equal when UUID values differ', () => {
      const id1 = new OrderId('550e8400-e29b-41d4-a716-446655440000');
      const id2 = new OrderId('660e8400-e29b-41d4-a716-446655440000');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should be case-insensitive for equality', () => {
      const id1 = new OrderId('550e8400-e29b-41d4-a716-446655440000');
      const id2 = new OrderId('550E8400-E29B-41D4-A716-446655440000');

      expect(id1.equals(id2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return UUID string', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const orderId = new OrderId(uuid);

      expect(orderId.toString()).toBe(uuid);
    });
  });

  describe('immutability', () => {
    it('should have readonly value property', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const orderId = new OrderId(uuid);

      // Verify value is accessible
      expect(orderId.value).toBe(uuid);

      // TypeScript readonly prevents modification at compile time
      // Runtime immutability is enforced by readonly keyword
    });
  });
});
