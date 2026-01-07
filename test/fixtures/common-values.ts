import { ShippingAddress } from '../../src/domain/order/value-objects/shipping-address';
import { ProductId } from '../../src/domain/shared/value-objects/product-id';
import { CustomerId } from '../../src/domain/shared/value-objects/customer-id';

/**
 * Common test fixtures to reduce duplication across test files.
 * These represent realistic test data used in multiple test scenarios.
 */

// Standard US shipping address for general testing
export const TEST_ADDRESS_US = new ShippingAddress({
  street: '123 Main St',
  city: 'Springfield',
  stateOrProvince: 'IL',
  postalCode: '62701',
  country: 'USA',
});

// International shipping address for edge cases
export const TEST_ADDRESS_INTL = new ShippingAddress({
  street: '456 Oak Avenue',
  city: 'Toronto',
  stateOrProvince: 'ON',
  postalCode: 'M5H 2N2',
  country: 'Canada',
});

// Common product IDs from Catalog context
export const TEST_PRODUCT_COFFEE = ProductId.fromString('COFFEE-COL-001');
export const TEST_PRODUCT_TEA = ProductId.fromString('TEA-GREEN-002');
export const TEST_PRODUCT_SNACKS = ProductId.fromString('SNACKS-CHIPS-003');

// Common customer IDs
export const TEST_CUSTOMER_JOHN = CustomerId.fromString('customer-john-123');
export const TEST_CUSTOMER_JANE = CustomerId.fromString('customer-jane-456');

// Common test currency
export const TEST_CURRENCY = 'USD';
