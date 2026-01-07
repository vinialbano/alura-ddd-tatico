import { OrderRepository } from '../../src/domain/order/order.repository';
import { ShoppingCartRepository } from '../../src/domain/shopping-cart/shopping-cart.repository';
import { DomainEventPublisher } from '../../src/infrastructure/events/domain-event-publisher';

/**
 * Creates a properly typed mock OrderRepository with sensible defaults
 *
 * Default behavior:
 * - save: resolves to undefined
 * - findById: resolves to null
 * - findByCartId: resolves to null
 *
 * @param overrides - Optional partial mock to override specific methods
 * @returns Jest-mocked OrderRepository
 */
export function createMockOrderRepository(
  overrides?: Partial<jest.Mocked<OrderRepository>>,
): jest.Mocked<OrderRepository> {
  const defaults: jest.Mocked<OrderRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCartId: jest.fn().mockResolvedValue(null),
  };

  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Creates a properly typed mock ShoppingCartRepository with sensible defaults
 *
 * Default behavior:
 * - save: resolves to undefined
 * - findById: resolves to null
 * - findByCustomerId: resolves to empty array
 * - delete: resolves to undefined
 *
 * @param overrides - Optional partial mock to override specific methods
 * @returns Jest-mocked ShoppingCartRepository
 */
export function createMockCartRepository(
  overrides?: Partial<jest.Mocked<ShoppingCartRepository>>,
): jest.Mocked<ShoppingCartRepository> {
  const defaults: jest.Mocked<ShoppingCartRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCustomerId: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
  };

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
