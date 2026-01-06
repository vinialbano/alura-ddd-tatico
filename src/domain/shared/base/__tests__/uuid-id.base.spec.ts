import { UuidId } from '../uuid-id.base';

/**
 * Concrete implementation for testing UuidId base class
 */
class TestUuidId extends UuidId {
  static create(value: string): TestUuidId {
    return new TestUuidId(value);
  }

  static generate(): TestUuidId {
    return new TestUuidId(UuidId.generateUuid());
  }
}

describe('UuidId Base Class', () => {
  describe('constructor', () => {
    it('should create a UUID ID with valid UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = TestUuidId.create(validUuid);
      expect(id.getValue()).toBe(validUuid);
    });

    it('should normalize UUID to lowercase', () => {
      const mixedCaseUuid = '550E8400-E29B-41D4-A716-446655440000';
      const id = TestUuidId.create(mixedCaseUuid);
      expect(id.getValue()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => TestUuidId.create('not-a-uuid')).toThrow(
        'Invalid UUID format',
      );
    });

    it('should throw error for UUID without hyphens', () => {
      expect(() =>
        TestUuidId.create('550e8400e29b41d4a716446655440000'),
      ).toThrow('Invalid UUID format');
    });

    it('should throw error for empty string', () => {
      expect(() => TestUuidId.create('')).toThrow('ID cannot be empty');
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => TestUuidId.create('   ')).toThrow(
        'ID cannot be empty',
      );
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID', () => {
      const id = TestUuidId.generate();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(id.getValue())).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const id1 = TestUuidId.generate();
      const id2 = TestUuidId.generate();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for UUIDs with same value', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = TestUuidId.create(uuid);
      const id2 = TestUuidId.create(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return true for case-insensitive comparison', () => {
      const id1 = TestUuidId.create('550e8400-e29b-41d4-a716-446655440000');
      const id2 = TestUuidId.create('550E8400-E29B-41D4-A716-446655440000');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different UUIDs', () => {
      const id1 = TestUuidId.create('550e8400-e29b-41d4-a716-446655440000');
      const id2 = TestUuidId.create('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
