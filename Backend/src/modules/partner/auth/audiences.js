/**
 * The combined partner login: one phone, one OTP, both businesses.
 *
 * A person who runs a restaurant and a hotel used to keep two accounts that
 * knew nothing about each other. This audience answers for both at once and
 * hands back whichever sessions apply, so the client can show one dashboard,
 * the other, or a switcher between them.
 *
 * It deliberately does NOT merge the accounts. Each module keeps its own model,
 * its own token shape and its own route guards; the only thing shared is the
 * phone number, which is already how both sides find themselves.
 */
import {
    findPartnerProfilesByPhone,
    listProfileKeys,
    everyProfileIsDead,
} from '../services/partnerIdentity.js';
import { issueRestaurantSession } from '../../food/auth/audiences.js';
import {
    createHotelPartnerAccount,
    issueHotelPartnerSession,
} from '../../hotel/auth/audiences.js';
import { registerAuthAudience, NEXT_STEP } from '../../../core/auth/otpAuth/audienceRegistry.js';
import { AuthError } from '../../../core/auth/errors.js';

/**
 * Build the session for whichever profiles exist.
 *
 * Both halves are issued in their own module's native shape — the restaurant
 * access/refresh pair and the partner's 30-day token — because every existing
 * route guard on both sides already expects exactly those claims.
 */
export const issuePartnerSession = async (accounts, ctx = {}) => {
    const { restaurant, hotelPartner } = accounts;

    const [restaurantSession, hotelSession] = await Promise.all([
        restaurant ? issueRestaurantSession(restaurant, ctx) : null,
        hotelPartner ? issueHotelPartnerSession(hotelPartner) : null,
    ]);

    return {
        profiles: listProfileKeys(accounts),
        restaurant: restaurantSession
            ? { ...restaurantSession, status: restaurant.status || 'pending' }
            : null,
        hotel: hotelSession,
    };
};

export const registerPartnerAuthAudiences = () => {
    registerAuthAudience({
        key: 'partner',
        label: 'partner',
        otpScope: 'partner',
        onNewAccount: NEXT_STEP.ONBOARDING,

        /** Null when neither business exists — that answer drives the chooser. */
        findAccount: async (phone) => {
            const accounts = await findPartnerProfilesByPhone(phone);
            return accounts.restaurant || accounts.hotelPartner ? accounts : null;
        },

        /**
         * Only ever creates the hotel half, and only when a name is supplied.
         *
         * verifyOtpForAudience calls createAccount automatically whenever
         * findAccount misses, so returning null for a bare verify is what stops
         * a brand-new number from silently becoming a hotel partner when the
         * person may have come to open a restaurant. Restaurants are created by
         * their own onboarding wizard (POST /food/restaurant/register), never
         * here.
         */
        createAccount: async (phone, payload = {}) => {
            const hotelPartner = await createHotelPartnerAccount(phone, payload);
            return hotelPartner ? { phone, restaurant: null, hotelPartner } : null;
        },

        /**
         * Refuse only when nothing is left to sign into.
         *
         * Each module's own audience is stricter — restaurant refuses anything
         * but `approved`. Here a pending restaurant must still be able to log
         * in, or it would lock its owner out of an approved hotel. The
         * dashboards gate themselves, and the server still refuses every
         * restaurant route behind requireApprovedRestaurant.
         */
        assertCanLogin: (accounts) => {
            if (everyProfileIsDead(accounts)) {
                throw new AuthError(
                    'Your partner account is no longer active. Please contact support.',
                );
            }
        },

        issueSession: issuePartnerSession,
    });
};
