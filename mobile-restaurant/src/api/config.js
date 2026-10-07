import { API_URL } from './client';

/* Port of Frontend/src/services/api/config.js (only the paths that are set there). */
export const API_BASE_URL = API_URL;

export const API_ENDPOINTS = {
  ADMIN: {
    TERMS_PUBLIC: '/food/pages/terms',
    PRIVACY_PUBLIC: '/food/pages/privacy',
    ABOUT_PUBLIC: '/food/pages/about',
    REFUND_PUBLIC: '/food/pages/refund',
    SHIPPING_PUBLIC: '/food/pages/shipping',
    CANCELLATION_PUBLIC: '/food/pages/cancellation',
    SUPPORT_USER_PUBLIC: '/food/pages/support_user',
    SAFETY_EMERGENCY_CREATE: '/food/user/safety-emergency-reports',
    FEEDBACK_EXPERIENCE_CREATE: '/food/restaurant/feedback-experience',
    BUSINESS_SETTINGS_PUBLIC: '/food/admin/business-settings/public',
  },
  // Empty on the web too: page code only reads these for debug output.
  ORDER: { CREATE: '', LIST: '', DETAILS: '', CANCEL: '', VERIFY_PAYMENT: '', CALCULATE: '' },
  UPLOAD: { MEDIA: '' },
  HERO_BANNER: { TOP_10_PUBLIC: '', GOURMET_PUBLIC: '' },
  DINING: { RESTAURANTS: '', RESTAURANT_BY_SLUG: '', CATEGORIES: '', BOOKING_CREATE: '', BOOKING_MY: '', BOOKING_RESTAURANT: '', BOOKING_STATUS: '', BOOKING_STATUS_RESTAURANT: '', OFFER_BANNERS: '', REVIEW_CREATE: '' },
};

export default { API_BASE_URL, API_ENDPOINTS };