import { ProductSnapshot } from '../product-snapshot';

describe('ProductSnapshot', () => {
  describe('creation', () => {
    it('should create product snapshot with valid fields', () => {
      const snapshot = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot.name).toBe('Premium Coffee Beans');
      expect(snapshot.description).toBe(
        'Single-origin Arabica beans from Colombia, medium roast',
      );
      expect(snapshot.sku).toBe('COFFEE-COL-001');
    });

    it('should reject empty name', () => {
      expect(
        () =>
          new ProductSnapshot({
            name: '',
            description: 'Test description',
            sku: 'TEST-001',
          }),
      ).toThrow('Product name cannot be empty');
    });

    it('should reject name exceeding 200 characters', () => {
      const longName = 'A'.repeat(201);
      expect(
        () =>
          new ProductSnapshot({
            name: longName,
            description: 'Test description',
            sku: 'TEST-001',
          }),
      ).toThrow('Product name cannot exceed 200 characters');
    });

    it('should accept name with exactly 200 characters', () => {
      const maxName = 'A'.repeat(200);
      const snapshot = new ProductSnapshot({
        name: maxName,
        description: 'Test description',
        sku: 'TEST-001',
      });

      expect(snapshot.name).toBe(maxName);
    });

    it('should reject empty description', () => {
      expect(
        () =>
          new ProductSnapshot({
            name: 'Test Product',
            description: '',
            sku: 'TEST-001',
          }),
      ).toThrow('Product description cannot be empty');
    });

    it('should reject description exceeding 1000 characters', () => {
      const longDescription = 'A'.repeat(1001);
      expect(
        () =>
          new ProductSnapshot({
            name: 'Test Product',
            description: longDescription,
            sku: 'TEST-001',
          }),
      ).toThrow('Product description cannot exceed 1000 characters');
    });

    it('should accept description with exactly 1000 characters', () => {
      const maxDescription = 'A'.repeat(1000);
      const snapshot = new ProductSnapshot({
        name: 'Test Product',
        description: maxDescription,
        sku: 'TEST-001',
      });

      expect(snapshot.description).toBe(maxDescription);
    });

    it('should reject empty sku', () => {
      expect(
        () =>
          new ProductSnapshot({
            name: 'Test Product',
            description: 'Test description',
            sku: '',
          }),
      ).toThrow('Product SKU cannot be empty');
    });

    it('should reject sku exceeding 50 characters', () => {
      const longSku = 'A'.repeat(51);
      expect(
        () =>
          new ProductSnapshot({
            name: 'Test Product',
            description: 'Test description',
            sku: longSku,
          }),
      ).toThrow('Product SKU cannot exceed 50 characters');
    });

    it('should accept sku with exactly 50 characters', () => {
      const maxSku = 'A'.repeat(50);
      const snapshot = new ProductSnapshot({
        name: 'Test Product',
        description: 'Test description',
        sku: maxSku,
      });

      expect(snapshot.sku).toBe(maxSku);
    });

    it('should trim whitespace from all fields', () => {
      const snapshot = new ProductSnapshot({
        name: '  Test Product  ',
        description: '  Test description  ',
        sku: '  TEST-001  ',
      });

      expect(snapshot.name).toBe('Test Product');
      expect(snapshot.description).toBe('Test description');
      expect(snapshot.sku).toBe('TEST-001');
    });

    it('should reject name that is only whitespace', () => {
      expect(
        () =>
          new ProductSnapshot({
            name: '   ',
            description: 'Test description',
            sku: 'TEST-001',
          }),
      ).toThrow('Product name cannot be empty');
    });
  });

  describe('equality', () => {
    it('should be equal when all fields match', () => {
      const snapshot1 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      });
      const snapshot2 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot1.equals(snapshot2)).toBe(true);
    });

    it('should not be equal when names differ', () => {
      const snapshot1 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans',
        sku: 'COFFEE-COL-001',
      });
      const snapshot2 = new ProductSnapshot({
        name: 'Regular Coffee Beans',
        description: 'Single-origin Arabica beans',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot1.equals(snapshot2)).toBe(false);
    });

    it('should not be equal when descriptions differ', () => {
      const snapshot1 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans',
        sku: 'COFFEE-COL-001',
      });
      const snapshot2 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Different description',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot1.equals(snapshot2)).toBe(false);
    });

    it('should not be equal when skus differ', () => {
      const snapshot1 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans',
        sku: 'COFFEE-COL-001',
      });
      const snapshot2 = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans',
        sku: 'COFFEE-COL-002',
      });

      expect(snapshot1.equals(snapshot2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format as "name (SKU: sku)"', () => {
      const snapshot = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot.toString()).toBe(
        'Premium Coffee Beans (SKU: COFFEE-COL-001)',
      );
    });
  });

  describe('immutability', () => {
    it('should have readonly fields', () => {
      const snapshot = new ProductSnapshot({
        name: 'Premium Coffee Beans',
        description: 'Single-origin Arabica beans from Colombia, medium roast',
        sku: 'COFFEE-COL-001',
      });

      expect(snapshot.name).toBe('Premium Coffee Beans');
      expect(snapshot.description).toBe(
        'Single-origin Arabica beans from Colombia, medium roast',
      );
      expect(snapshot.sku).toBe('COFFEE-COL-001');
    });
  });
});
