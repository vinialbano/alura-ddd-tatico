/**
 * Injection tokens for OrderModule
 *
 * Separated from order.module.ts to avoid circular dependencies
 * when application layer classes need to reference these tokens.
 */

export const ORDER_REPOSITORY = 'OrderRepository';
export const CATALOG_GATEWAY = 'CatalogGateway';
export const PRICING_GATEWAY = 'PricingGateway';
