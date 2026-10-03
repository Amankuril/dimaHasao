/**
 * Ported verbatim from Frontend/src/modules/Food/utils/foodVariants.js
 * (just the piece FoodCartContext needs).
 */
export const buildCartLineId = (itemId, variantId = '') => `${String(itemId || '')}::${String(variantId || 'base')}`;
