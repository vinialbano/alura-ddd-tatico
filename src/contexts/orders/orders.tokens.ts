/**
 * Injection tokens for OrdersModule
 *
 * Separated from orders.module.ts to avoid circular dependencies
 * when application layer classes need to reference these tokens.
 */

export const SHOPPING_CART_REPOSITORY = 'ShoppingCartRepository';
export const ORDER_REPOSITORY = 'OrderRepository';
export const PRICING_GATEWAY = 'PricingGateway';
