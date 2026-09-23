/**
 * Who is this phone number, across both partner businesses?
 *
 * Restaurant and hotel model identity differently — a restaurant *is* its
 * FoodRestaurant document, while a hotel partner is a Partner account that owns
 * properties — and unifying them would mean re-subjecting every restaurant
 * route. So they stay separate, and the phone number is the join: it is already
 * what both sides look themselves up by.
 */
import { FoodRestaurant } from '../../food/restaurant/models/restaurant.model.js';
import Partner from '../../hotel/models/Partner.js';

/** Statuses that mean a restaurant profile can never be used again. */
const DEAD_RESTAURANT_STATUSES = new Set(['rejected', 'banned', 'deleted']);

/**
 * The restaurant a phone should sign into.
 *
 * `ownerPhone` is NOT unique — only the compound
 * {restaurantNameNormalized, ownerPhoneLast10} is — so one phone can own
 * several restaurants and the bare findOne returns an arbitrary row. Choose
 * deterministically instead: an approved restaurant wins, then the newest.
 */
const findRestaurantForPhone = async (phone) => {
    const matches = await FoodRestaurant.find({
        $or: [{ ownerPhone: phone }, { ownerPhone: { $regex: new RegExp(`${phone}$`) } }],
    }).sort({ createdAt: -1 });

    if (!matches.length) return null;

    return matches.find((r) => r.status === 'approved') || matches[0];
};

/**
 * @param {string} phone - digits-only, already normalized by the OTP service.
 * @returns {Promise<{phone: string, restaurant: Object|null, hotelPartner: Object|null}>}
 */
export const findPartnerProfilesByPhone = async (phone) => {
    const [restaurant, hotelPartner] = await Promise.all([
        findRestaurantForPhone(phone),
        Partner.findOne({ phone }),
    ]);

    return { phone, restaurant, hotelPartner };
};

/** Which businesses this phone actually has, as the client thinks of them. */
export const listProfileKeys = ({ restaurant, hotelPartner } = {}) => [
    ...(restaurant ? ['restaurant'] : []),
    ...(hotelPartner ? ['hotel'] : []),
];

/** True when no existing profile could ever be signed into again. */
export const everyProfileIsDead = ({ restaurant, hotelPartner } = {}) => {
    const restaurantDead = !restaurant || DEAD_RESTAURANT_STATUSES.has(restaurant.status);
    const hotelDead =
        !hotelPartner || hotelPartner.isBlocked || hotelPartner.partnerApprovalStatus === 'rejected';

    return restaurantDead && hotelDead;
};

/**
 * The caller's phone, whichever of the two tokens they presented.
 *
 * The two modules sign different claims — restaurant tokens carry
 * {userId, role:'RESTAURANT'}, partner tokens {id, role:'partner'} — so the
 * subject means a different collection depending on the role.
 */
export const resolveCallerPhone = async (req) => {
    const role = String(req?.user?.role || '').toLowerCase();
    const subject = req?.user?.userId || req?.user?.id || req?.user?._id || '';

    if (!subject) return '';

    if (role === 'restaurant') {
        const restaurant = await FoodRestaurant.findById(subject).select('ownerPhone');
        return String(restaurant?.ownerPhone || '').replace(/\D/g, '').slice(-10);
    }

    if (role === 'partner') {
        const partner = await Partner.findById(subject).select('phone');
        return String(partner?.phone || '').replace(/\D/g, '').slice(-10);
    }

    return '';
};
