import { CartId } from '../cart-id';

describe('CartId', () => {
  describe('create', () => {
    it('should generate a unique UUID', () => {
      const id1 = CartId.create();
      const id2 = CartId.create();

      expect(id1.getValue()).toBeDefined();
      expect(id2.getValue()).toBeDefined();
      expect(id1.getValue()).not.toBe(id2.getValue());
      expect(id1.equals(id2)).toBe(false);
    });

    it('should generate valid UUID format', () => {
      const cartId = CartId.create();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(cartId.getValue()).toMatch(uuidRegex);
    });
  });

  describe('fromString', () => {
    it('should create CartId from valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const cartId = CartId.fromString(uuid);

      expect(cartId.getValue()).toBe(uuid);
    });

    it('should throw error for empty string', () => {
      expect(() => CartId.fromString('')).toThrow();
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => CartId.fromString('invalid-uuid')).toThrow();
      expect(() => CartId.fromString('not-a-uuid-at-all')).toThrow();
      expect(() => CartId.fromString('123')).toThrow();
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => CartId.fromString('   ')).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for same UUID values', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const id1 = CartId.fromString(uuid);
      const id2 = CartId.fromString(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different UUID values', () => {
      const id1 = CartId.create();
      const id2 = CartId.create();

      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle case-insensitive comparison', () => {
      const id1 = CartId.fromString('123e4567-e89b-12d3-a456-426614174000');
      const id2 = CartId.fromString('123E4567-E89B-12D3-A456-426614174000');

      expect(id1.equals(id2)).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should return the underlying UUID value', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const cartId = CartId.fromString(uuid);

      expect(cartId.getValue()).toBe(uuid);
    });
  });
});
