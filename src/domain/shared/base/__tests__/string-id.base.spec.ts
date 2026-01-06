import { StringId } from '../string-id.base';

/**
 * Concrete implementation for testing StringId base class
 */
class TestStringId extends StringId {
  static create(value: string): TestStringId {
    return new TestStringId(value);
  }
}

describe('StringId Base Class', () => {
  describe('constructor', () => {
    it('should create a string ID with valid non-empty value', () => {
      const id = TestStringId.create('test-id-123');
      expect(id.getValue()).toBe('test-id-123');
    });

    it('should trim whitespace from the value', () => {
      const id = TestStringId.create('  spaced-id  ');
      expect(id.getValue()).toBe('spaced-id');
    });

    it('should throw error for empty string', () => {
      expect(() => TestStringId.create('')).toThrow(
        'ID cannot be empty',
      );
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => TestStringId.create('   ')).toThrow(
        'ID cannot be empty',
      );
    });

    it('should throw error for null value', () => {
      expect(() => TestStringId.create(null as any)).toThrow(
        'ID cannot be empty',
      );
    });

    it('should throw error for undefined value', () => {
      expect(() => TestStringId.create(undefined as any)).toThrow(
        'ID cannot be empty',
      );
    });
  });

  describe('getValue', () => {
    it('should return the internal string value', () => {
      const id = TestStringId.create('my-value');
      expect(id.getValue()).toBe('my-value');
    });
  });

  describe('equals', () => {
    it('should return true for IDs with same value', () => {
      const id1 = TestStringId.create('same-id');
      const id2 = TestStringId.create('same-id');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for IDs with different values', () => {
      const id1 = TestStringId.create('id-one');
      const id2 = TestStringId.create('id-two');
      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle comparison after whitespace trimming', () => {
      const id1 = TestStringId.create('  trimmed  ');
      const id2 = TestStringId.create('trimmed');
      expect(id1.equals(id2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the string representation', () => {
      const id = TestStringId.create('to-string-test');
      expect(id.toString()).toBe('to-string-test');
    });
  });
});
