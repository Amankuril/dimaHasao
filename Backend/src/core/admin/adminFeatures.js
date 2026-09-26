/**
 * What a sub-admin can be granted, for every module.
 *
 * One catalogue drives three things that used to disagree: the checkboxes the
 * Global admin renders, what gets stored on the admin, and what the server
 * enforces. Adding a feature here is the whole job — there is no second list.
 *
 * `paths` are API paths as the request arrives at each module's admin mount,
 * not the frontend routes. Enforcement happens on the server, so the frontend
 * path a sidebar happens to use is irrelevant and would drift.
 *
 * Matching is longest-prefix-wins, so a specific entry ('/restaurants/
 * joining-request') beats the general one ('/restaurants') and a module can be
 * granular where its API is and coarse where it is not.
 */
import { ADMIN_MODULES } from './adminHierarchy.constants.js';

export const FEATURE_ACTIONS = ['view', 'create', 'edit', 'delete'];

/**
 * Paths under an admin mount that every signed-in admin may call regardless of
 * grants. These are the chrome a panel needs to render at all — badge counts,
 * the profile of whoever is signed in, a global search box. Denying them means
 * a sub-admin sees a broken shell rather than a restricted one.
 */
export const ALWAYS_ALLOWED_PATHS = [
  '/sidebar-badges',
  '/dashboard-stats',
  // Taxi and tours name their landing dashboard '/dashboard' rather than
  // '/dashboard-stats' — without this a subadmin granted either module could
  // never open the panel's own home screen, no matter what else they hold.
  '/dashboard',
  '/global-search',
  '/business-settings',
  '/customization-settings',
  '/me',
  '/meta',
  '/profile',
  '/status',
  '/permissions',
  '/common',
  '/countries',
  '/upload-image',
  '/fcm-token',
  '/notifications',
];

/**
 * @param {string[]} [legacy] - resource names this feature also answers for in
 *   the older string-permission checks. Taxi's admin services assert things
 *   like `drivers.view` against `admin.permissions`, so a grant here has to
 *   produce those strings too or the grant looks made but does not work.
 */
const feature = (key, label, paths, legacy = []) => ({ key, label, paths, legacy });

export const ADMIN_FEATURES = {
  [ADMIN_MODULES.FOOD]: [
    feature('orders', 'Orders', ['/orders']),
    feature('restaurants', 'Restaurants', ['/restaurants']),
    feature('restaurant_joining', 'Restaurant joining requests', ['/restaurants/joining-request']),
    feature('restaurant_commission', 'Restaurant commission', ['/restaurant-commissions']),
    feature('restaurant_settings', 'Restaurant settings', ['/restaurant-settings']),
    feature('top_restaurants', 'Top restaurants', ['/top-restaurants']),
    feature('restaurant_withdrawals', 'Restaurant withdrawals', ['/withdrawals']),
    feature('foods', 'Foods', ['/foods']),
    feature('addons', 'Addons', ['/addons']),
    feature('categories', 'Categories', ['/categories']),
    feature('pricing', 'Pricing management', ['/pricing', '/fee-settings']),
    feature('zones', 'Zone setup', ['/zones']),
    feature('offers', 'Coupons & offers', ['/offers']),
    feature('customers', 'Customers', ['/customers']),
    feature('delivery', 'Delivery partners', ['/delivery']),
    feature('delivery_cash', 'Delivery cash limit', ['/delivery-cash-limit']),
    feature('delivery_emergency', 'Delivery emergency help', ['/delivery-emergency-help']),
    feature('dining', 'Dining', ['/dining']),
    feature('support_tickets', 'Support tickets', ['/support-tickets']),
    feature('contact_messages', 'User feedback', ['/contact-messages', '/feedback-experiences']),
    feature('safety_reports', 'Safety emergency reports', ['/safety-emergency-reports']),
    feature('reports', 'Reports', ['/reports']),
    feature('referral_settings', 'Referral settings', ['/referral-settings']),
    feature('landing_pages', 'Landing & social pages', ['/pages-social-media']),
    feature('archived_accounts', 'Archived accounts', ['/archived-accounts']),
  ],

  [ADMIN_MODULES.TAXI]: [
    feature('drivers', 'Drivers', ['/drivers'], ['drivers.view']),
    feature('driver_ratings', 'Driver ratings', ['/driver-ratings'], ['drivers.view']),
    feature('users', 'Riders', ['/users'], ['users.view']),
    feature('rides', 'Rides & requests', ['/ongoing-rides', '/ride-requests', '/trips'], ['trips.view', 'ongoing.view']),
    feature('vehicle_types', 'Vehicle types & packages', ['/types', '/vehicle_preference'], ['vehicle_types.view', 'rental.view']),
    feature('pricing', 'Pricing & preferences', ['/preferences'], ['set_prices.view']),
    feature('zones', 'Zones', ['/zones'], ['zones.view']),
    feature('service_locations', 'Service locations', ['/service-locations'], ['service_locations.view']),
    feature('airports', 'Airports', ['/airports'], ['airports.view']),
    feature('wallet', 'Wallet & payouts', ['/wallet', '/payment-methods'], ['wallet.view', 'earnings.view']),
    feature('referrals', 'Referrals', ['/referrals', '/referral'], ['referrals.view']),
    feature('safety', 'Safety', ['/safety'], ['support.view']),
    feature('reports', 'Reports', ['/reports'], ['reports.view']),
    feature('general_settings', 'General settings', ['/general-settings'], ['settings.view']),
    feature('integration_settings', 'Integration settings', ['/integration-settings'], ['settings.view']),
    feature('notification_channels', 'Notification channels', ['/notification-channels']),
    feature('admin_management', 'Admin management', ['/admin-management', '/roles'], ['subadmins.manage']),
    // Both nav items the taxi panel shows for this area — Promo Code and Push
    // Notifications — are gated client-side on the single legacy string
    // 'promotions.view' (Frontend/.../AdminLayout.jsx), so either feature has
    // to emit it or the grant here would produce a sidebar that never shows up.
    feature('promo_codes', 'Promo codes', ['/promos', '/promotions'], ['promotions.view']),
    feature('banners', 'Banners & push notifications', ['/banners', '/push-notifications'], ['promotions.view']),
    feature('onboarding', 'Onboarding screens', ['/on-boarding', '/on-boarding-driver']),
  ],

  [ADMIN_MODULES.HOTEL]: [
    feature('properties', 'Properties', ['/properties', '/hotels', '/hotel-details', '/hotel-status', '/update-hotel-status', '/delete-hotel']),
    feature('property_requests', 'Property requests', ['/property-requests', '/verify-documents']),
    feature('room_types', 'Room types', ['/room-types']),
    feature('bookings', 'Bookings', ['/bookings', '/booking-details', '/booking-status', '/update-booking-status']),
    feature('partners', 'Partners', ['/partners', '/partner-details', '/update-partner-approval', '/update-partner-status', '/delete-partner']),
    feature('users', 'Users', ['/users', '/user-details', '/update-user-status', '/delete-user']),
    feature('reviews', 'Reviews', ['/reviews', '/delete-review', '/update-review-status']),
    feature('finance', 'Finance', ['/finance', '/wallets', '/withdrawals']),
    feature('offers', 'Offers', ['/offers']),
    feature('legal_pages', 'Legal pages', ['/legal-pages']),
    feature('contact_messages', 'Contact messages', ['/contact-messages']),
    feature('platform_settings', 'Platform settings', ['/platform-settings']),
  ],

  [ADMIN_MODULES.TOURS]: [
    feature('packages', 'Packages', ['/packages']),
    feature('bookings', 'Bookings', ['/bookings']),
    feature('destinations', 'Destinations', ['/destinations']),
    feature('offers', 'Offers', ['/offers']),
    feature('reviews', 'Reviews', ['/reviews']),
    feature('settings', 'Settings', ['/settings']),
  ],
};

/** `food.orders` — namespaced so one flat store covers every module. */
export const featureKey = (module, key) => `${module}.${key}`;

/** The catalogue as the Global admin renders it. */
export const listAdminFeatures = () =>
  Object.entries(ADMIN_FEATURES).map(([module, features]) => ({
    module,
    features: features.map(({ key, label }) => ({ key, label, permission: featureKey(module, key) })),
  }));

/** HTTP method → the action it needs. */
export const actionForMethod = (method = '') => {
  switch (String(method).toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'edit';
    case 'DELETE':
      return 'delete';
    default:
      return 'view';
  }
};

const normalizePath = (value = '') => {
  const path = String(value || '').split('?')[0].replace(/\/+$/, '');
  return path.startsWith('/') ? path || '/' : `/${path}`;
};

export const isAlwaysAllowedPath = (path) => {
  const normalized = normalizePath(path);
  return ALWAYS_ALLOWED_PATHS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
};

/**
 * Which feature owns this path, longest prefix first.
 *
 * @returns {string|null} the namespaced key, e.g. 'food.restaurants'
 */
export const findFeatureForPath = (module, path) => {
  const features = ADMIN_FEATURES[module];
  if (!features) return null;

  const normalized = normalizePath(path);
  let best = null;
  let bestLength = -1;

  for (const entry of features) {
    for (const rawPrefix of entry.paths) {
      const prefix = normalizePath(rawPrefix);
      const matches = normalized === prefix || normalized.startsWith(`${prefix}/`);

      if (matches && prefix.length > bestLength) {
        best = featureKey(module, entry.key);
        bestLength = prefix.length;
      }
    }
  }

  return best;
};

/** Every valid permission key, for validating what the UI sends back. */
export const ALL_FEATURE_KEYS = Object.entries(ADMIN_FEATURES).flatMap(([module, features]) =>
  features.map((entry) => featureKey(module, entry.key)),
);

/**
 * Keep only real keys and real actions.
 *
 * The UI posts whatever its checkboxes hold; storing an unknown key would be a
 * grant that nothing ever checks, which reads as access but is not.
 */
export const normalizeFeaturePermissions = (input = {}) => {
  const result = {};

  for (const [key, actions] of Object.entries(input || {})) {
    if (!ALL_FEATURE_KEYS.includes(key) || !actions || typeof actions !== 'object') continue;

    const granted = {};
    for (const action of FEATURE_ACTIONS) {
      if (actions[action]) granted[action] = true;
    }

    if (Object.keys(granted).length) result[key] = granted;
  }

  return result;
};

/** Does this admin hold `action` on `permission`? */
export const hasFeatureAction = (featurePermissions = {}, permission, action = 'view') =>
  Boolean(permission && featurePermissions?.[permission]?.[action]);

/**
 * The module-local string permissions a set of feature grants implies.
 *
 * Taxi keeps its own permission vocabulary and its own checker — a literal
 * `permissions.includes('drivers.view')` against the admin's string array, not
 * the core resource/action matcher. So a grant made here has to be written in
 * that vocabulary too, or the taxi panel refuses an admin the Global screen
 * says is allowed. The `legacy` field on each feature is that translation, and
 * it is written from the same source so the two cannot drift.
 *
 * `subadmins.manage` is the one write-shaped key, so it is only emitted when a
 * write action is actually granted.
 */
export const deriveLegacyPermissions = (featurePermissions = {}) => {
  const legacy = new Set();
  let hasAnyTaxiGrant = false;

  for (const [permission, actions] of Object.entries(featurePermissions || {})) {
    const [module, key] = String(permission).split('.');
    const entry = (ADMIN_FEATURES[module] || []).find((item) => item.key === key);
    if (!entry) continue;

    const canWrite = Boolean(actions?.create || actions?.edit || actions?.delete);
    if (!actions?.view && !canWrite) continue;

    if (module === ADMIN_MODULES.TAXI) hasAnyTaxiGrant = true;

    for (const name of entry.legacy || []) {
      if (name.endsWith('.manage') && !canWrite) continue;
      legacy.add(name);
    }
  }

  // The taxi panel asks for this before it will render at all, so any admin
  // with a taxi grant needs it or they land on an error instead of the parts
  // they were given.
  if (hasAnyTaxiGrant) legacy.add('dashboard.view');

  return [...legacy];
};
