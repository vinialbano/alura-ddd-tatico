import { ShippingAddress } from '../shipping-address';

describe('ShippingAddress', () => {
  describe('creation', () => {
    it('should create shipping address with all required fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address.street).toBe('123 Main St');
      expect(address.city).toBe('Springfield');
      expect(address.stateOrProvince).toBe('IL');
      expect(address.postalCode).toBe('62701');
      expect(address.country).toBe('USA');
      expect(address.addressLine2).toBeUndefined();
      expect(address.deliveryInstructions).toBeUndefined();
    });

    it('should create shipping address with optional fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });

      expect(address.addressLine2).toBe('Apt 4B');
      expect(address.deliveryInstructions).toBe('Ring doorbell twice');
    });

    it('should reject empty street', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('Street cannot be empty');
    });

    it('should reject street exceeding 200 characters', () => {
      const longStreet = 'A'.repeat(201);
      expect(
        () =>
          new ShippingAddress({
            street: longStreet,
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('Street cannot exceed 200 characters');
    });

    it('should accept street with exactly 200 characters', () => {
      const maxStreet = 'A'.repeat(200);
      const address = new ShippingAddress({
        street: maxStreet,
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address.street).toBe(maxStreet);
    });

    it('should reject addressLine2 exceeding 200 characters', () => {
      const longAddressLine2 = 'A'.repeat(201);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            addressLine2: longAddressLine2,
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('Address line 2 cannot exceed 200 characters');
    });

    it('should reject empty city', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: '',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('City cannot be empty');
    });

    it('should reject city exceeding 100 characters', () => {
      const longCity = 'A'.repeat(101);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: longCity,
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('City cannot exceed 100 characters');
    });

    it('should reject empty stateOrProvince', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: '',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('State or province cannot be empty');
    });

    it('should reject stateOrProvince exceeding 100 characters', () => {
      const longState = 'A'.repeat(101);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: longState,
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('State or province cannot exceed 100 characters');
    });

    it('should reject empty postalCode', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '',
            country: 'USA',
          }),
      ).toThrow('Postal code cannot be empty');
    });

    it('should reject postalCode exceeding 20 characters', () => {
      const longPostalCode = 'A'.repeat(21);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: longPostalCode,
            country: 'USA',
          }),
      ).toThrow('Postal code cannot exceed 20 characters');
    });

    it('should reject empty country', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: '',
          }),
      ).toThrow('Country cannot be empty');
    });

    it('should reject country with less than 2 characters', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'A',
          }),
      ).toThrow('Country must be at least 2 characters');
    });

    it('should accept country with exactly 2 characters', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'US',
      });

      expect(address.country).toBe('US');
    });

    it('should reject country exceeding 100 characters', () => {
      const longCountry = 'A'.repeat(101);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: longCountry,
          }),
      ).toThrow('Country cannot exceed 100 characters');
    });

    it('should reject deliveryInstructions exceeding 500 characters', () => {
      const longInstructions = 'A'.repeat(501);
      expect(
        () =>
          new ShippingAddress({
            street: '123 Main St',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
            deliveryInstructions: longInstructions,
          }),
      ).toThrow('Delivery instructions cannot exceed 500 characters');
    });

    it('should trim whitespace from all required fields', () => {
      const address = new ShippingAddress({
        street: '  123 Main St  ',
        city: '  Springfield  ',
        stateOrProvince: '  IL  ',
        postalCode: '  62701  ',
        country: '  USA  ',
      });

      expect(address.street).toBe('123 Main St');
      expect(address.city).toBe('Springfield');
      expect(address.stateOrProvince).toBe('IL');
      expect(address.postalCode).toBe('62701');
      expect(address.country).toBe('USA');
    });

    it('should trim whitespace from optional fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: '  Apt 4B  ',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: '  Ring doorbell twice  ',
      });

      expect(address.addressLine2).toBe('Apt 4B');
      expect(address.deliveryInstructions).toBe('Ring doorbell twice');
    });

    it('should reject required fields that are only whitespace', () => {
      expect(
        () =>
          new ShippingAddress({
            street: '   ',
            city: 'Springfield',
            stateOrProvince: 'IL',
            postalCode: '62701',
            country: 'USA',
          }),
      ).toThrow('Street cannot be empty');
    });

    it('should treat empty optional fields as undefined', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: '',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: '   ',
      });

      expect(address.addressLine2).toBeUndefined();
      expect(address.deliveryInstructions).toBeUndefined();
    });
  });

  describe('equality', () => {
    it('should be equal when all fields match', () => {
      const address1 = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });
      const address2 = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address1.equals(address2)).toBe(true);
    });

    it('should be equal when all fields match including optional fields', () => {
      const address1 = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });
      const address2 = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });

      expect(address1.equals(address2)).toBe(true);
    });

    it('should not be equal when streets differ', () => {
      const address1 = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });
      const address2 = new ShippingAddress({
        street: '456 Oak Ave',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address1.equals(address2)).toBe(false);
    });

    it('should not be equal when optional fields differ', () => {
      const address1 = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });
      const address2 = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address1.equals(address2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format address as single line without optional fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address.toString()).toBe(
        '123 Main St, Springfield, IL 62701, USA',
      );
    });

    it('should format address as single line with addressLine2', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address.toString()).toBe(
        '123 Main St, Apt 4B, Springfield, IL 62701, USA',
      );
    });

    it('should not include deliveryInstructions in toString', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });

      expect(address.toString()).toBe(
        '123 Main St, Springfield, IL 62701, USA',
      );
    });
  });

  describe('toFullString', () => {
    it('should format address as multi-line without optional fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      const expected = `123 Main St
Springfield, IL 62701
USA`;

      expect(address.toFullString()).toBe(expected);
    });

    it('should format address as multi-line with addressLine2', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      const expected = `123 Main St
Apt 4B
Springfield, IL 62701
USA`;

      expect(address.toFullString()).toBe(expected);
    });

    it('should format address as multi-line with deliveryInstructions', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });

      const expected = `123 Main St
Springfield, IL 62701
USA
Delivery: Ring doorbell twice`;

      expect(address.toFullString()).toBe(expected);
    });

    it('should format address as multi-line with all optional fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
        deliveryInstructions: 'Ring doorbell twice',
      });

      const expected = `123 Main St
Apt 4B
Springfield, IL 62701
USA
Delivery: Ring doorbell twice`;

      expect(address.toFullString()).toBe(expected);
    });
  });

  describe('immutability', () => {
    it('should have readonly fields', () => {
      const address = new ShippingAddress({
        street: '123 Main St',
        city: 'Springfield',
        stateOrProvince: 'IL',
        postalCode: '62701',
        country: 'USA',
      });

      expect(address.street).toBe('123 Main St');
      expect(address.city).toBe('Springfield');
      expect(address.stateOrProvince).toBe('IL');
      expect(address.postalCode).toBe('62701');
      expect(address.country).toBe('USA');
    });
  });
});
