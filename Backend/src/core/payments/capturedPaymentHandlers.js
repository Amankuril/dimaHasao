/**
 * Modules that settle their own Razorpay orders from the shared webhook.
 *
 * The platform has one Razorpay account, so Razorpay may be pointed at the
 * core webhook only. That handled food orders and dropped everything else, so
 * a hotel guest who paid and closed the app before the checkout callback ran
 * stayed unpaid. A module registers a handler here (the way hotel registers its
 * notification owners); for a captured payment that is not a food order, core
 * asks each handler in turn and the first that recognises the order settles it.
 * Core never imports module models.
 */
const handlers = [];

/** @param {(payment: object) => Promise<boolean>} handler - resolves true when it owned the order */
export const registerCapturedPaymentHandler = (handler) => {
    if (typeof handler === 'function' && !handlers.includes(handler)) handlers.push(handler);
};

/** @returns {Promise<boolean>} whether any module recognised the payment's order */
export const dispatchCapturedPayment = async (payment) => {
    for (const handler of handlers) {
        if (await handler(payment)) return true;
    }
    return false;
};
