/**
 * What the platform keeps from one food order.
 *
 * The customer's total splits exactly into restaurant share + rider share +
 * platform profit + tax, so this is the platform's side of that identity:
 *
 *   platform fee + delivery fee + restaurant commission + menu markup
 *     − rider payout − coupon discount
 *
 * Coupons are created only by admins, so the platform funds every discount.
 * Leaving the discount out (as four copies of this formula did) reported a
 * ₹50 coupon order as ₹50 more profit than the platform made.
 *
 * Not clamped at zero: a coupon larger than the platform's take is a real loss,
 * and hiding it as 0 breaks the identity above.
 */
const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export const computePlatformNetProfit = ({ pricing = {}, riderShare = 0, restaurantCommission } = {}) => {
    const commission = restaurantCommission !== undefined ? num(restaurantCommission) : num(pricing.restaurantCommission);
    const profit =
        num(pricing.platformFee) +
        num(pricing.deliveryFee) +
        commission +
        Math.max(0, num(pricing.markupTotal)) -
        num(riderShare) -
        Math.max(0, num(pricing.discount));
    return Math.round(profit * 100) / 100;
};
