/**
 * Hotel's notification owner types.
 *
 * Registered from this module so core/notifications never imports hotel models
 * — the dependency points module → core, the same way auth audiences work.
 *
 * Hotel stores `fcmTokens` as `{ app, web }` rather than the array shape food
 * and taxi use, so each type supplies a reader for that structure. Absorbing
 * the difference here means no data migration and no divergent send path.
 */
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import { registerNotificationOwner } from '../../../core/notifications/firebase.service.js';

/**
 * @param {Object} doc
 * @param {'web'|'mobile'} [platform] - omitted means "every token"
 * @returns {string[]}
 */
const readHotelTokens = (doc, platform) => {
    const tokens = doc?.fcmTokens;

    if (!tokens) return [];

    // Tolerate the array shape too, in case a record was written by the
    // platform-wide helpers rather than hotel's own code.
    if (Array.isArray(tokens)) return tokens.filter(Boolean);

    if (platform === 'mobile') return [tokens.app].filter(Boolean);
    if (platform === 'web') return [tokens.web].filter(Boolean);

    return [tokens.app, tokens.web].filter(Boolean);
};

const HOTEL_OWNERS = [
    { ownerType: 'HOTEL_USER', model: User, aliases: ['HOTELUSER'] },
    { ownerType: 'HOTEL_PARTNER', model: Partner, aliases: ['PARTNER', 'HOTELPARTNER'] },
    { ownerType: 'HOTEL_ADMIN', model: Admin, aliases: ['HOTELADMIN'] },
];

export const registerHotelNotificationOwners = () => {
    for (const owner of HOTEL_OWNERS) {
        registerNotificationOwner({
            ...owner,
            // Hotel's nested object lives under this one field.
            webField: 'fcmTokens',
            mobileField: 'fcmTokens',
            selectFields: 'fcmTokens',
            readTokens: readHotelTokens,
        });
    }
};
