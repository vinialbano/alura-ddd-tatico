/**
 * Injection tokens for CartModule
 *
 * Separated from cart.module.ts to avoid circular dependencies
 * when application layer classes need to reference these tokens.
 */

export const SHOPPING_CART_REPOSITORY = 'ShoppingCartRepository';
