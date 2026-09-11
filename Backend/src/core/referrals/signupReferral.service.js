/**
 * Referral crediting for a brand-new signup.
 *
 * Extracted from the old per-app login service so the unified auth adapters can
 * reuse it instead of each re-implementing the reward rules. Every outcome —
 * credited or rejected — is written to the referral log, so the admin referral
 * reports stay complete.
 */
import mongoose from 'mongoose';
import { FoodUser } from '../users/user.model.js';
import { FoodReferralSettings } from '../../modules/food/admin/models/referralSettings.model.js';
import { FoodReferralLog } from '../../modules/food/admin/models/referralLog.model.js';
import { creditReferralReward } from '../../modules/food/user/services/userWallet.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Credit a referrer for introducing a newly created account.
 *
 * Never throws: a referral problem must not fail the signup that triggered it.
 *
 * @param {Object} params
 * @param {string} params.ref      - Referrer id, as supplied by the client.
 * @param {Object} params.newUser  - The freshly created user document.
 * @param {string} [params.role]   - Referral log role. Defaults to 'USER'.
 * @returns {Promise<{credited: boolean, reason?: string}>}
 */
export const creditSignupReferral = async ({ ref, newUser, role = 'USER' }) => {
    const refRaw = typeof ref === 'string' ? ref.trim() : '';

    if (!refRaw || !newUser?._id) {
        return { credited: false, reason: 'no_ref' };
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(refRaw)) {
            return { credited: false, reason: 'invalid_ref' };
        }

        const referrerId = new mongoose.Types.ObjectId(refRaw);

        // Self-referral.
        if (String(referrerId) === String(newUser._id)) {
            return { credited: false, reason: 'self_referral' };
        }

        const [referrer, settingsDoc] = await Promise.all([
            FoodUser.findById(referrerId).select('_id referralCount').lean(),
            FoodReferralSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean(),
        ]);

        if (!referrer || !settingsDoc) {
            return { credited: false, reason: referrer ? 'no_active_settings' : 'referrer_not_found' };
        }

        const reward = Math.max(0, Number(settingsDoc.referralRewardUser) || 0);
        const limit = Math.max(0, Number(settingsDoc.referralLimitUser) || 0);
        const withinLimit = Number(referrer.referralCount || 0) < limit;

        if (reward <= 0 || limit <= 0 || !withinLimit) {
            const reason = reward <= 0 ? 'reward_disabled' : limit <= 0 ? 'limit_disabled' : 'limit_reached';

            await FoodReferralLog.create({
                referrerId,
                refereeId: newUser._id,
                role,
                rewardAmount: reward,
                status: 'rejected',
                reason,
            });

            return { credited: false, reason };
        }

        newUser.referredBy = referrerId;
        await newUser.save();

        const log = await FoodReferralLog.create({
            referrerId,
            refereeId: newUser._id,
            role,
            rewardAmount: reward,
            status: 'credited',
        });

        await Promise.all([
            FoodUser.updateOne({ _id: referrerId }, { $inc: { referralCount: 1 } }),
            creditReferralReward(referrerId, reward, {
                role,
                refereeId: String(newUser._id),
                referralLogId: String(log._id),
            }),
        ]);

        return { credited: true };
    } catch (error) {
        // Never fail a signup because of referral bookkeeping.
        logger?.warn?.({ err: error }, 'Referral crediting failed');
        return { credited: false, reason: 'error' };
    }
};
