/**
 * Tours' notification owner types.
 *
 * Registered from this module so core/notifications never imports tour models
 * — the dependency points module → core, the same way auth audiences and
 * hotel's owners do.
 *
 * TourOperator stores `fcmTokens` as `{ app, web }`, the same nested shape
 * hotel uses rather than the array food and taxi use, so the reader below
 * absorbs the difference and the registration names each leaf.
 *
 * Until this existed the model had the field and notify.service.js read it,
 * but nothing could ever write one: the platform-wide /fcm-tokens route
 * rejected an operator token, so tours push had no way to reach a device.
 */
import TourOperator from '../models/TourOperator.js';
import { registerNotificationOwner } from '../../../core/notifications/firebase.service.js';

/**
 * @param {Object} doc
 * @param {'web'|'mobile'} [platform] - omitted means "every token"
 * @returns {string[]}
 */
const readTourTokens = (doc, platform) => {
    const tokens = doc?.fcmTokens;

    if (!tokens) return [];

    // Tolerate the array shape too, in case a record was written by the
    // platform-wide helpers rather than tours' own code.
    if (Array.isArray(tokens)) return tokens.filter(Boolean);

    if (platform === 'mobile') return [tokens.app].filter(Boolean);
    if (platform === 'web') return [tokens.web].filter(Boolean);

    return [tokens.app, tokens.web].filter(Boolean);
};

export const registerToursNotificationOwners = () => {
    registerNotificationOwner({
        ownerType: 'TOURS_OPERATOR',
        model: TourOperator,
        aliases: ['OPERATOR', 'TOURSOPERATOR', 'TOUR_OPERATOR'],
        // Leaves, not the parent object — see hotel/notifications/owners.js.
        webField: 'fcmTokens.web',
        mobileField: 'fcmTokens.app',
        selectFields: 'fcmTokens',
        readTokens: readTourTokens,
    });
};
