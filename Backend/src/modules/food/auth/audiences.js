/**
 * Auth audiences owned by the food module's models.
 *
 * - `user`       — the consumer super-app (food + taxi + hotel + tours share
 *                  this one account, and one token covers all of them).
 * - `restaurant` — the restaurant partner app.
 * - `delivery`   — the delivery partner app.
 *
 * Each adapter only answers "who is this phone?" and "mint a session for this
 * account"; core drives the OTP flow and owns the shared vocabulary.
 */
import ms from 'ms';
import { FoodUser } from '../../../core/users/user.model.js';
import { FoodRestaurant } from '../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../delivery/models/deliveryPartner.model.js';
import { FoodRefreshToken } from '../../../core/refreshTokens/refreshToken.model.js';
import { signAccessToken, signRefreshToken } from '../../../core/auth/token.util.js';
import { buildUnifiedUserSession } from '../../../core/auth/unifiedUserSession.js';
import { registerAuthAudience, NEXT_STEP } from '../../../core/auth/otpAuth/audienceRegistry.js';
import { AuthError } from '../../../core/auth/errors.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

// Mirrors the role strings auth.service.js signs into tokens; the shared
// constants module is empty, so these are kept in step with it by hand.
const ROLES = {
    RESTAURANT: 'RESTAURANT',
    DELIVERY_PARTNER: 'DELIVERY_PARTNER',
};

/** Best-effort: a slow refresh-token write must not block a login. */
const persistRefreshToken = async (userId, token) => {
    try {
        await FoodRefreshToken.create({
            userId,
            token,
            expiresAt: new Date(Date.now() + ms(config.jwtRefreshExpiresIn || '7d')),
        });
    } catch (error) {
        logger.warn(`[OtpAuth] refresh token persistence skipped: ${error.message}`);
    }
};

/**
 * Register the device's push token on the account.
 *
 * The per-app login flows each did this inline; keeping it here means every
 * audience that opts in behaves the same, and a push-token write never blocks
 * or fails a login.
 */
const saveFcmToken = async (Model, account, { fcmToken, platform } = {}) => {
    if (!fcmToken) return;

    const field = platform === 'mobile' ? 'fcmTokenMobile' : 'fcmTokens';

    try {
        await Model.updateOne(
            { _id: account._id },
            { $addToSet: { [field]: String(fcmToken).trim() } },
        );
    } catch (error) {
        logger.warn(`[OtpAuth] FCM token save skipped: ${error.message}`);
    }
};

const hasUsableName = (account) => {
    const name = String(account?.name || '').trim().toLowerCase();
    return Boolean(name) && name !== 'null';
};

export const registerFoodAuthAudiences = () => {
    // ── Consumer super-app ────────────────────────────────────────────────
    registerAuthAudience({
        key: 'user',
        label: 'user',
        otpScope: 'user',
        // A new number only needs a display name, not a whole onboarding flow.
        onNewAccount: NEXT_STEP.COLLECT_NAME,

        findAccount: async (phone) => {
            const user = await FoodUser.findOne({ phone });

            // An account with no name yet is treated as still signing up, so an
            // abandoned signup re-prompts instead of stranding the user.
            return user && hasUsableName(user) ? user : null;
        },

        assertCanLogin: (user) => {
            if (user.isActive === false) {
                throw new AuthError('Your account has been deactivated. Please contact support.');
            }
        },

        // The name arrives with the verify call, so signup completes in one step.
        createAccount: async (phone, { name } = {}) => {
            const trimmed = String(name || '').trim();
            if (!trimmed) return null;

            const existing = await FoodUser.findOne({ phone });
            if (existing) {
                existing.name = trimmed;
                existing.isVerified = true;
                await existing.save();
                return existing;
            }

            return FoodUser.create({ phone, name: trimmed, isVerified: true });
        },

        issueSession: async (user, ctx) => {
            if (!user.isVerified) {
                user.isVerified = true;
                await user.save();
            }

            await saveFcmToken(FoodUser, user, ctx);

            // One token for food, taxi, hotel and tours.
            const session = buildUnifiedUserSession(user);
            await persistRefreshToken(user._id, session.refreshToken);

            return {
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                user: user.toObject(),
                taxiAuth: session.taxiAuth,
            };
        },
    });

    // ── Restaurant partner app ────────────────────────────────────────────
    registerAuthAudience({
        key: 'restaurant',
        label: 'restaurant',
        otpScope: 'restaurant',
        onNewAccount: NEXT_STEP.ONBOARDING,

        findAccount: (phone) =>
            FoodRestaurant.findOne({
                $or: [{ ownerPhone: phone }, { ownerPhone: { $regex: new RegExp(`${phone}$`) } }],
            }),

        assertCanLogin: (restaurant) => {
            if (restaurant.status && restaurant.status !== 'approved') {
                throw new AuthError(
                    restaurant.status === 'pending'
                        ? 'Your restaurant registration is pending approval.'
                        : 'Your restaurant registration has been rejected. Please contact support.',
                );
            }
        },

        issueSession: async (restaurant, ctx) => {
            await saveFcmToken(FoodRestaurant, restaurant, ctx);

            const payload = { userId: restaurant._id.toString(), role: ROLES.RESTAURANT };
            const accessToken = signAccessToken(payload);
            const refreshToken = signRefreshToken(payload);
            await persistRefreshToken(restaurant._id, refreshToken);

            return { accessToken, refreshToken, user: restaurant };
        },
    });

    // ── Delivery partner app ──────────────────────────────────────────────
    registerAuthAudience({
        key: 'delivery',
        label: 'delivery partner',
        otpScope: 'delivery',
        onNewAccount: NEXT_STEP.ONBOARDING,

        findAccount: (phone) =>
            FoodDeliveryPartner.findOne({
                $or: [{ phone }, { phone: { $regex: new RegExp(`${phone}$`) } }],
            }),

        assertCanLogin: (partner) => {
            if (partner.isActive === false || partner.isBlocked) {
                throw new AuthError('Your account is not active. Please contact support.');
            }
        },

        issueSession: async (partner, ctx) => {
            await saveFcmToken(FoodDeliveryPartner, partner, ctx);

            const payload = { userId: partner._id.toString(), role: ROLES.DELIVERY_PARTNER };
            const accessToken = signAccessToken(payload);
            const refreshToken = signRefreshToken(payload);
            await persistRefreshToken(partner._id, refreshToken);

            return { accessToken, refreshToken, user: partner };
        },
    });
};
