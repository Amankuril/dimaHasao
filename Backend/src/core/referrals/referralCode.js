/**
 * A referral code a person can read out.
 *
 * Accounts used to carry their own ObjectId as their referral code, so the
 * Referrals screen showed a 24-character hex string and the share text asked a
 * friend to type it. Both login paths now mint a short code from the tail of
 * the number and the id instead.
 *
 * Resolution accepts either form, because links shared before this change
 * carry an ObjectId and must keep working.
 */
import mongoose from 'mongoose';

/** `DH` + last four of the phone + last four of the id, e.g. DH3670DADE. */
export const buildReferralCode = (user) => {
  const phonePart = String(user?.phone || '').replace(/\D/g, '').slice(-4);
  const idPart = String(user?._id || '').slice(-4).toUpperCase();
  return `DH${phonePart}${idPart}`.replace(/\W/g, '');
};

/** True when the stored code is missing, or is just the account's id. */
export const needsReferralCode = (user) =>
  !user?.referralCode || mongoose.Types.ObjectId.isValid(String(user.referralCode));

/**
 * Give the account a readable code if it does not have one yet.
 *
 * Never throws: a referral code is not worth failing a login over.
 *
 * @param {Object} user a mongoose user document
 * @returns {Promise<string>} the code the account now holds
 */
export const ensureReferralCode = async (user) => {
  if (!user?._id) return '';

  if (!needsReferralCode(user)) {
    return String(user.referralCode);
  }

  try {
    user.referralCode = buildReferralCode(user);
    await user.save();
  } catch {
    // Leave whatever was there; the screen falls back to hiding the code.
  }

  return String(user.referralCode || '');
};

/**
 * Find the account behind a referral code.
 *
 * @param {Object} Model the user model to search
 * @param {string} raw   a readable code or a legacy ObjectId
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
export const resolveReferrerId = async (Model, raw) => {
  const value = String(raw || '').trim();
  if (!value) return null;

  const byCode = await Model.findOne({ referralCode: value.toUpperCase() }).select('_id').lean();
  if (byCode?._id) return byCode._id;

  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
};
