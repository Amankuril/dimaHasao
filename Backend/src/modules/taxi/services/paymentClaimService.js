import { ApiError } from '../../../utils/ApiError.js';
import { PaymentClaim } from '../common/models/PaymentClaim.js';

export const paymentClaimKey = (provider, paymentId) =>
  `${String(provider || '').trim().toLowerCase()}:${String(paymentId || '').trim()}`;

/**
 * Run `apply` only if this provider payment has not been claimed before.
 *
 * Returns `{ claimed: true, result }` when this call spent the payment, or
 * `{ claimed: false, existing }` when it was already spent (existing is the
 * earlier claim, so a same-owner retry can be answered idempotently and a
 * different owner refused). If `apply` throws, the claim is released so the
 * payment can be retried.
 */
export const withPaymentClaim = async ({ key, purpose = '', ownerRole = '', ownerId = '' }, apply) => {
  if (!key || key.endsWith(':')) {
    throw new ApiError(400, 'Payment reference is missing');
  }

  try {
    await PaymentClaim.create({ _id: key, purpose, ownerRole, ownerId: String(ownerId || '') });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await PaymentClaim.findById(key).lean();
      return { claimed: false, existing };
    }
    throw error;
  }

  try {
    const result = await apply();
    return { claimed: true, result };
  } catch (error) {
    await PaymentClaim.deleteOne({ _id: key }).catch(() => {});
    throw error;
  }
};

/** A claim that belongs to a different owner or purpose is a replay, not a retry. */
export const assertClaimIsOwn = (existing, { purpose = '', ownerRole = '', ownerId = '' } = {}) => {
  if (
    existing &&
    (String(existing.purpose || '') !== String(purpose || '') ||
      String(existing.ownerRole || '') !== String(ownerRole || '') ||
      String(existing.ownerId || '') !== String(ownerId || ''))
  ) {
    throw new ApiError(409, 'This payment was already used');
  }
};
