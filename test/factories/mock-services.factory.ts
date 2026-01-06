import { OrderPricingService } from '../../src/domain/order/services/order-pricing.service';
import { OrderCreationService } from '../../src/domain/order/services/order-creation.service';
import { DomainEventPublisher } from '../../src/infrastructure/events/domain-event-publisher';
import { Money } from '../../src/domain/order/value-objects/money';

/**
 * Creates a properly typed mock OrderPricingService with sensible defaults
 *
 * Default behavior:
 * - price: resolves to empty PricedOrderData (empty items, zero totals)
 *
 * @param overrides - Optional partial mock to override specific methods
 * @returns Jest-mocked OrderPricingService
 */
export function createMockPricingService(
  overrides?: Partial<jest.Mocked<OrderPricingService>>,
): jest.Mocked<OrderPricingService> {
  const defaults: jest.Mocked<OrderPricingService> = {
    price: jest.fn().mockResolvedValue({
      items: [],
      orderLevelDiscount: new Money(0, 'BRL'),
      orderTotal: new Money(0, 'BRL'),
    }),
  } as jest.Mocked<OrderPricingService>;

  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Creates a properly typed mock OrderCreationService with sensible defaults
 *
 * Default behavior:
 * - createFromCart: returns undefined (tests should override with specific Order)
 * - canConvertCart: returns false
 *
 * @param overrides - Optional partial mock to override specific methods
 * @returns Jest-mocked OrderCreationService
 */
export function createMockOrderCreationService(
  overrides?: Partial<jest.Mocked<OrderCreationService>>,
): jest.Mocked<OrderCreationService> {
  const defaults: jest.Mocked<OrderCreationService> = {
    createFromCart: jest.fn().mockReturnValue(undefined as any),
    canConvertCart: jest.fn().mockReturnValue(false),
  } as jest.Mocked<OrderCreationService>;

  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Creates a properly typed mock DomainEventPublisher with sensible defaults
 *
 * Default behavior:
 * - publishDomainEvents: resolves to undefined
 *
 * @param overrides - Optional partial mock to override specific methods
 * @returns Jest-mocked DomainEventPublisher
 */
export function createMockEventPublisher(
  overrides?: Partial<jest.Mocked<DomainEventPublisher>>,
): jest.Mocked<DomainEventPublisher> {
  const defaults: jest.Mocked<DomainEventPublisher> = {
    publishDomainEvents: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<DomainEventPublisher>;

  return {
    ...defaults,
    ...overrides,
  };
}
