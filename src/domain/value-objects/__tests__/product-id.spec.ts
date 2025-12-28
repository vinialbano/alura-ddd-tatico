import { ProductId } from '../product-id';

describe('ProductId', () => {
  describe('fromString', () => {
    it('should create ProductId from non-empty string', () => {
      const productId = ProductId.fromString('product-123');

      expect(productId.getValue()).toBe('product-123');
    });

    it('should throw error for empty string', () => {
      expect(() => ProductId.fromString('')).toThrow('ProductId cannot be empty');
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => ProductId.fromString('   ')).toThrow('ProductId cannot be empty');
      expect(() => ProductId.fromString('\t\n')).toThrow('ProductId cannot be empty');
    });

    it('should trim whitespace from input', () => {
      const productId = ProductId.fromString('  product-456  ');

      expect(productId.getValue()).toBe('product-456');
    });

    it('should accept various product identifier formats', () => {
      const productId1 = ProductId.fromString('PROD-001');
      const productId2 = ProductId.fromString('sku_abc_123');
      const productId3 = ProductId.fromString('item-xyz-789');

      expect(productId1.getValue()).toBe('PROD-001');
      expect(productId2.getValue()).toBe('sku_abc_123');
      expect(productId3.getValue()).toBe('item-xyz-789');
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const id1 = ProductId.fromString('product-123');
      const id2 = ProductId.fromString('product-123');

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = ProductId.fromString('product-123');
      const id2 = ProductId.fromString('product-456');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle trimmed comparison correctly', () => {
      const id1 = ProductId.fromString('  product-123  ');
      const id2 = ProductId.fromString('product-123');

      expect(id1.equals(id2)).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should return the underlying product identifier', () => {
      const productId = ProductId.fromString('product-xyz');

      expect(productId.getValue()).toBe('product-xyz');
    });
  });
});
