/* Port of shared/constants/brandLogo.js: the admin console shows the district crest. */
export const DEFAULT_BRAND_LOGO = require('../../assets/images/logo.png');
export const DEFAULT_BRAND_LOGO_PUBLIC = DEFAULT_BRAND_LOGO;
export const CONSUMER_BRAND_LOGO = DEFAULT_BRAND_LOGO;
export const RESTAURANT_BRAND_LOGO = DEFAULT_BRAND_LOGO;
export const HOTEL_BRAND_LOGO = DEFAULT_BRAND_LOGO;
export const DRIVER_BRAND_LOGO = DEFAULT_BRAND_LOGO;
/** The web swaps a missing mark for the crest; here every mark is bundled. */
export const logoFallback = () => {};
