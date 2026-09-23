/**
 * Composition root for auth audiences.
 *
 * This is the one place that knows every app exists. The registry and the auth
 * service stay free of module imports, so a module can be added, removed or
 * swapped by editing only this file plus that module's own adapter.
 *
 * Called once at boot from routes/index.js.
 */
import { registerFoodAuthAudiences } from '../../../modules/food/auth/audiences.js';
import { registerTaxiAuthAudiences } from '../../../modules/taxi/auth/audiences.js';
import { registerHotelAuthAudiences } from '../../../modules/hotel/auth/audiences.js';
import { registerPartnerAuthAudiences } from '../../../modules/partner/auth/audiences.js';
import { listAuthAudiences } from './audienceRegistry.js';
import { logger } from '../../../utils/logger.js';

let registered = false;

export const registerAllAuthAudiences = () => {
    if (registered) return listAuthAudiences();

    registerFoodAuthAudiences(); // user, restaurant, delivery
    registerTaxiAuthAudiences(); // taxi-driver
    registerHotelAuthAudiences(); // hotel-partner
    registerPartnerAuthAudiences(); // partner — restaurant + hotel in one login

    registered = true;
    logger.info(`[OtpAuth] audiences registered: ${listAuthAudiences().join(', ')}`);

    return listAuthAudiences();
};
