/**
 * What each module offers, in one place.
 *
 * The consumer meets one app: one bottom nav, one profile, one bookings list.
 * But each module still owns real screens behind that — food has a wallet and
 * coupons, taxi has saved addresses and subscriptions — and unifying the nav
 * left those screens routed and working but reachable only from inside their
 * own module. Nothing was deleted; it simply fell off the shared navigation.
 *
 * So this registry names them. Two lists per module:
 *
 *   services — that module's own navigation, the tabs it used to show in its
 *              own bottom bar. These go in **More**.
 *   account  — that module's account screens. These go in **Profile**, under
 *              the module's own sub-section, below the one universal identity.
 *
 * Every path here is absolute and was checked against the route tables, because
 * a module's internal links are relative to its own mount and do not survive
 * being copied out of it. Taxi's own profile still links to `/terms`,
 * `/privacy` and `/refund`, which resolve nowhere — the real routes live under
 * its mount, and that is what is used below.
 *
 * Rows with a `control` instead of a `path` are settings rendered inline
 * rather than links; see ProfileScreen.
 */

/** Food's Veg Mode is stored here, and Food's ProfileContext reads the same keys. */
export const VEG_MODE_KEY = 'userVegMode'
export const VEG_MODE_OPTION_KEY = 'userVegModeOption'

export const MODULE_SECTIONS = [
  {
    id: 'food',
    title: 'Food & Dining',
    subtitle: 'Orders, wallet, coupons & dining',
    icon: 'fa-solid fa-bowl-food',
    tint: 'bg-rose-50 text-rose-600',
    home: '/food/user',
    services: [
      { label: 'Delivery', sub: 'Order in from nearby kitchens', icon: 'fa-solid fa-truck-fast', path: '/food/user' },
      { label: 'Takeaway', sub: 'Order ahead and collect', icon: 'fa-solid fa-bag-shopping', path: '/food/user/takeaway' },
      { label: 'Under ₹250', sub: 'Everything at a lighter price', icon: 'fa-solid fa-tag', path: '/food/user/under-250' },
      { label: 'Dining', sub: 'Book a table at a restaurant', icon: 'fa-solid fa-utensils', path: '/food/user/dining' },
    ],
    account: [
      { label: 'Your orders', sub: 'Past and active food orders', icon: 'fa-solid fa-receipt', path: '/food/user/orders' },
      { label: 'Food wallet', sub: 'Balance and transactions', icon: 'fa-solid fa-wallet', path: '/food/user/wallet' },
      { label: 'Coupons', sub: 'Offers you can apply at checkout', icon: 'fa-solid fa-ticket', path: '/food/user/profile/coupons' },
      { label: 'Veg Mode', sub: 'Filter what you are shown', icon: 'fa-solid fa-leaf', control: 'vegMode' },
      { label: 'Your cart', sub: 'Items waiting to be ordered', icon: 'fa-solid fa-cart-shopping', path: '/food/user/cart' },
      { label: 'Your collections', sub: 'Saved restaurants and dishes', icon: 'fa-solid fa-bookmark', path: '/food/user/profile/favorites' },
      { label: 'Dining reservations', sub: 'Your table bookings', icon: 'fa-solid fa-chair', path: '/food/user/profile/dining-bookings' },
      { label: 'Refer & earn', sub: 'Invite friends, earn credit', icon: 'fa-solid fa-gift', path: '/food/user/profile/refer-earn' },
      { label: 'Food settings', sub: 'Preferences for ordering', icon: 'fa-solid fa-sliders', path: '/food/user/profile/settings' },
      { label: 'Food help & support', sub: 'Order issues and refunds', icon: 'fa-solid fa-headset', path: '/food/user/profile/support' },
      { label: 'Report a safety emergency', sub: 'Escalate an urgent problem', icon: 'fa-solid fa-triangle-exclamation', path: '/food/user/profile/report-safety-emergency' },
    ],
  },
  {
    id: 'taxi',
    title: 'Taxi & Auto',
    subtitle: 'Rides, wallet, addresses & safety',
    icon: 'fa-solid fa-car',
    tint: 'bg-amber-50 text-amber-600',
    home: '/taxi/user',
    services: [
      { label: 'Book a ride', sub: 'Cab, auto or bike', icon: 'fa-solid fa-car-side', path: '/taxi/user' },
      { label: 'My rides', sub: 'City rides and outstation trips', icon: 'fa-solid fa-route', path: '/taxi/user/activity' },
      { label: 'Outstation', sub: 'Intercity and airport trips', icon: 'fa-solid fa-road', path: '/taxi/user/intercity' },
      { label: 'Taxi support', sub: 'Raise a ride complaint', icon: 'fa-solid fa-headset', path: '/taxi/user/support' },
    ],
    account: [
      { label: 'Ride profile settings', sub: 'Ride preferences', icon: 'fa-solid fa-user-gear', path: '/taxi/user/profile/settings' },
      { label: 'Saved addresses', sub: 'Home, office and others', icon: 'fa-solid fa-location-dot', path: '/taxi/user/profile/addresses' },
      { label: 'Taxi wallet', sub: 'Balance and transactions', icon: 'fa-solid fa-wallet', path: '/taxi/user/wallet' },
      { label: 'Payment settings', sub: 'How you pay for rides', icon: 'fa-solid fa-credit-card', path: '/taxi/user/profile/payments' },
      { label: 'Promo codes', sub: 'Ride offers available to you', icon: 'fa-solid fa-percent', path: '/taxi/user/promo' },
      { label: 'Refer & earn', sub: 'Invite friends, earn rewards', icon: 'fa-solid fa-gift', path: '/taxi/user/referral' },
      { label: 'Ride notifications', sub: 'Offers and ride alerts', icon: 'fa-solid fa-bell', path: '/taxi/user/profile/notifications' },
      { label: 'Security & SOS', sub: 'Emergency contacts', icon: 'fa-solid fa-shield-halved', path: '/taxi/user/safety/sos' },
      { label: 'Ride support tickets', sub: 'Track your complaints', icon: 'fa-solid fa-headset', path: '/taxi/user/support/tickets' },
      { label: 'Terms & conditions', sub: 'Service terms', icon: 'fa-solid fa-file-lines', path: '/taxi/terms' },
      { label: 'Privacy policy', sub: 'How your data is handled', icon: 'fa-solid fa-lock', path: '/taxi/privacy' },
      { label: 'Refund policy', sub: 'Refunds and cancellations', icon: 'fa-solid fa-rotate-left', path: '/taxi/refund' },
    ],
  },
  {
    id: 'hotels',
    title: 'Hotels & Stays',
    subtitle: 'Resorts, cottages & homestays',
    icon: 'fa-solid fa-hotel',
    tint: 'bg-violet-50 text-violet-600',
    home: '/app/hotels',
    services: [
      { label: 'Browse stays', sub: 'Resorts, cottages and homestays', icon: 'fa-solid fa-bed', path: '/app/hotels' },
    ],
    account: [
      { label: 'My stays', sub: 'Your hotel bookings', icon: 'fa-solid fa-calendar-check', path: '/app/bookings?tab=hotels' },
    ],
  },
  {
    id: 'tours',
    title: 'Tour Packages',
    subtitle: 'Guided treks & curated journeys',
    icon: 'fa-solid fa-suitcase-rolling',
    tint: 'bg-emerald-50 text-emerald-700',
    home: '/app/packages',
    services: [
      { label: 'Tour packages', sub: 'Guided treks and curated trips', icon: 'fa-solid fa-suitcase-rolling', path: '/app/packages' },
      { label: 'Tourist attractions', sub: 'Places worth the detour', icon: 'fa-solid fa-mountain-sun', path: '/app/places' },
    ],
    account: [
      { label: 'My tour bookings', sub: 'Packages you have booked', icon: 'fa-solid fa-calendar-check', path: '/app/bookings?tab=tours' },
    ],
  },
  {
    id: 'festivals',
    title: 'Events & Festivals',
    subtitle: 'Official passes & cultural events',
    icon: 'fa-solid fa-ticket',
    tint: 'bg-orange-50 text-orange-600',
    home: '/app/festivals',
    services: [
      { label: 'Events & festivals', sub: 'Official government passes', icon: 'fa-solid fa-ticket', path: '/app/festivals' },
    ],
    account: [
      { label: 'My passes', sub: 'Festival passes you hold', icon: 'fa-solid fa-qrcode', path: '/app/bookings?tab=festivals' },
    ],
  },
]

/** Platform-wide rows — these belong to no single module. */
export const PLATFORM_ACCOUNT = [
  { label: 'Help & support', sub: 'Hotlines, tickets and FAQs', icon: 'fa-solid fa-life-ring', path: '/app/support' },
  { label: 'Rate & review', sub: 'Feedback for rides and stays', icon: 'fa-solid fa-star', path: '/app/review' },
]
