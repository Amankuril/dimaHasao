/**
 * Tour packages for the consumer app.
 *
 * The approved v1 screens were built against `data/tourPackageData.js`. This
 * module fetches `/api/v1/tours` and adapts each package into the exact shape
 * those screens already consume, so the UI is untouched — only its data source
 * changes. Same approach as hotelApi.js and foodApi.js.
 *
 * Unlike hotelApi, this uses the shared `apiClient`: tours has authenticated
 * writes (booking, payment, reviews) and apiClient already attaches the bearer
 * token and handles refresh.
 */
import apiClient from '../../../services/api/axios';

const asArray = (value) => (Array.isArray(value) ? value : []);
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

/**
 * Backend `category` → the filter-chip label the v1 list screen shows.
 * The screen filters on `pkg.type`, so this mapping is what makes the chips work.
 */
export const CATEGORY_LABELS = {
  sightseeing: 'Weekend Escapade',
  trekking: 'Trekking & Adventure',
  adventure: 'Trekking & Adventure',
  nature: 'Wildlife & Nature',
  cultural: 'Cultural Heritage',
  family: 'Family Getaway',
  couple: 'Couple Retreat',
  group: 'Group Tour',
};

/** The chips the list screen renders, in order. `All` is prepended by the screen. */
export const PACKAGE_TYPES = [
  'Weekend Escapade',
  'Trekking & Adventure',
  'Wildlife & Nature',
  'Cultural Heritage',
];

/**
 * "2 Days / 1 Night".
 *
 * Derived here rather than read from the model's `durationLabel` virtual:
 * `.lean()` drops virtuals unless mongoose-lean-virtuals is installed, and the
 * list endpoint is lean — so the field arrives as undefined.
 */
const durationLabel = (days, nights) => {
  const d = Number(days) || 1;
  const n = Number(nights ?? Math.max(0, d - 1));
  return `${d} Day${d > 1 ? 's' : ''} / ${n} Night${n === 1 ? '' : 's'}`;
};

const groupSizeLabel = (min, max) => {
  const lo = Number(min) || 1;
  const hi = Number(max) || 0;
  return hi ? `Min ${lo}, Max ${hi}` : `Min ${lo} People`;
};

const relativeDate = (value) => {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) { const w = Math.floor(days / 7); return `${w} week${w > 1 ? 's' : ''} ago`; }
  if (days < 365) { const m = Math.floor(days / 30); return `${m} month${m > 1 ? 's' : ''} ago`; }
  const y = Math.floor(days / 365);
  return `${y} year${y > 1 ? 's' : ''} ago`;
};

export const adaptReview = (review = {}) => ({
  id: String(review._id || review.id || ''),
  author: review.userId?.name || 'Traveller',
  rating: Number(review.rating || 0),
  date: relativeDate(review.createdAt),
  avatar: review.userId?.profileImage || '',
  comment: review.comment || '',
  reply: review.reply || '',
});

/** Backend package → the object the v1 tour screens expect. */
export const adaptPackage = (pkg = {}) => {
  const gallery = asArray(pkg.gallery).filter(Boolean);
  const images = [pkg.heroImage, ...gallery].filter(Boolean);

  return {
    id: String(pkg._id || pkg.id || ''),
    slug: pkg.slug || '',
    title: pkg.title || 'Tour package',
    subtitle: pkg.subtitle || '',
    description: pkg.description || '',

    duration: durationLabel(pkg.durationDays, pkg.durationNights),
    durationDays: Number(pkg.durationDays) || 1,
    type: CATEGORY_LABELS[String(pkg.category || '').toLowerCase()] || 'Weekend Escapade',
    category: pkg.category || '',
    difficulty: pkg.difficulty || 'Easy',
    groupSize: groupSizeLabel(pkg.groupSizeMin, pkg.groupSizeMax),
    groupSizeMin: Number(pkg.groupSizeMin) || 1,
    groupSizeMax: Number(pkg.groupSizeMax) || 0,
    leadTimeDays: Number(pkg.leadTimeDays) || 0,

    rating: Number(pkg.avgRating) || 0,
    reviewCount: Number(pkg.totalReviews) || 0,

    pricePerPerson: Number(pkg.pricePerPerson) || 0,
    originalPrice: Number(pkg.originalPrice) || null,
    childPricePercent: Number(pkg.childPricePercent ?? 60),
    advancePercent: Number(pkg.advancePercent ?? 100),

    heroImage: images[0] || PLACEHOLDER_IMAGE,
    // The detail screen renders `pkg.gallery` as a grid, so it is never empty.
    gallery: images.length ? images : [PLACEHOLDER_IMAGE],

    destinations: asArray(pkg.destinations),
    highlights: asArray(pkg.highlights),
    includes: asArray(pkg.includes).map((item, index) => ({
      id: String(item.id || `inc-${index}`),
      label: item.label || '',
      included: item.included !== false,
    })),
    exclusions: asArray(pkg.exclusions),
    itinerary: asArray(pkg.itinerary).map((day, index) => ({
      day: Number(day.day ?? index + 1),
      title: day.title || '',
      activities: asArray(day.activities),
      mealPlan: day.mealPlan || '',
    })),
    pickupPoints: asArray(pkg.pickupPoints),
    cancellationPolicy: pkg.cancellationPolicy || '',

    operator: pkg.operatorId && typeof pkg.operatorId === 'object'
      ? {
        id: String(pkg.operatorId._id || ''),
        name: pkg.operatorId.agencyName || pkg.operatorId.name || '',
        phone: pkg.operatorId.phone || '',
      }
      : null,

    reviews: asArray(pkg.reviews).map(adaptReview),
  };
};

/**
 * Live packages for the list screen.
 * @param {{search?: string, category?: string, sort?: string}} [params]
 */
export const fetchPackages = async (params = {}) => {
  const query = {};
  if (params.search) query.search = params.search;
  if (params.category && params.category !== 'all') query.category = params.category;
  if (params.sort) query.sort = params.sort;

  const body = unwrap(await apiClient.get('/tours/packages', { params: query }));
  return asArray(body.packages).map(adaptPackage);
};

/** One package, with its approved reviews. */
export const fetchPackageById = async (id) => {
  if (!id) return null;

  const body = unwrap(await apiClient.get(`/tours/packages/${encodeURIComponent(id)}`));
  const pkg = body.package;
  if (!pkg || !(pkg._id || pkg.id)) return null;

  return adaptPackage({ ...pkg, reviews: body.reviews });
};

/**
 * What the trip costs. Server-computed — the screen displays this and never
 * derives a total of its own.
 */
export const quoteBooking = async ({ packageId, travelDate, adults, children, couponCode }) => {
  const data = unwrap(
    await apiClient.post('/tours/bookings/quote', { packageId, travelDate, adults, children, couponCode }),
  );
  // The coupon verdict rides along with the price: the server decides what a
  // code is worth, and an unusable one comes back with a reason rather than an
  // error, so the screen can still show a total.
  return { ...data.quote, coupon: data.coupon || { code: null, discount: 0, reason: null } };
};

/** Promo codes a traveller can use on this package right now. */
export const fetchTourOffers = async (packageId) =>
  unwrap(await apiClient.get('/tours/offers', { params: { packageId } })).offers || [];

/** Create the booking. Returns the booking plus the amount payable now. */
export const createBooking = async (payload) =>
  unwrap(await apiClient.post('/tours/bookings', payload));

/** Open a Razorpay order for the advance. */
export const createPaymentOrder = async (bookingId) =>
  unwrap(await apiClient.post(`/tours/payments/bookings/${bookingId}/order`));

/** Confirm the booking with Razorpay's signature. */
export const verifyPayment = async (bookingId, payload) =>
  unwrap(await apiClient.post(`/tours/payments/bookings/${bookingId}/verify`, payload));

/**
 * Confirm without a gateway. The server refuses this whenever Razorpay *is*
 * configured, so it can never become a way to book a trip without paying.
 */
export const settleWithoutGateway = async (bookingId) =>
  unwrap(await apiClient.post(`/tours/bookings/${bookingId}/settle`, {}));

const STATUS_LABELS = {
  pending: 'Awaiting Payment',
  confirmed: 'Confirmed',
  ongoing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const travelDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be confirmed';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
};

/**
 * Backend booking → the card the v1 bookings screen renders.
 *
 * There is no guide *entity* in this module — a guide is an `includes[]` line
 * item — so the person the traveller actually calls is the operator, and that
 * is what the contact fields carry.
 */
export const adaptBooking = (booking = {}) => {
  const pkg = booking.packageId && typeof booking.packageId === 'object' ? booking.packageId : {};
  const operator = booking.operatorId && typeof booking.operatorId === 'object' ? booking.operatorId : {};
  const party = booking.travellers || {};
  const adults = Number(party.adults) || 0;
  const children = Number(party.children) || 0;

  return {
    id: booking.bookingId || String(booking._id || ''),
    bookingRef: String(booking._id || ''),
    packageId: String(pkg._id || booking.packageId || ''),
    packageTitle: pkg.title || 'Tour package',
    duration: pkg.durationDays
      ? `${pkg.durationDays} Day${pkg.durationDays > 1 ? 's' : ''} / ${pkg.durationNights ?? Math.max(0, pkg.durationDays - 1)} Night${(pkg.durationNights ?? Math.max(0, pkg.durationDays - 1)) === 1 ? '' : 's'}`
      : '',
    image: pkg.heroImage || PLACEHOLDER_IMAGE,

    travelDate: travelDateLabel(booking.travelDate),
    travelers: `${adults} Adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} Child${children === 1 ? '' : 'ren'}` : ''}`,
    pickupPoint: booking.pickupPoint || '',

    operatorName: operator.agencyName || operator.name || 'Your operator',
    operatorPhone: operator.phone || '',

    totalAmount: Number(booking.totalAmount) || 0,
    balanceDue: Number(booking.balanceDue) || 0,
    paymentStatus: booking.paymentStatus || 'pending',

    // `amountPaid` becomes the *full* total once the operator marks the cash
    // balance collected, so it cannot be labelled "paid online". Split it:
    // only the advance ever went through the gateway.
    paidOnline: booking.paymentStatus === 'pending' ? 0 : Number(booking.advanceAmount) || 0,
    collectedInPerson:
      booking.paymentStatus === 'paid' ? Number(booking.balanceDue) || 0 : 0,

    status: STATUS_LABELS[booking.bookingStatus] || booking.bookingStatus || 'Confirmed',
    bookingStatus: booking.bookingStatus || '',
    canReview: booking.bookingStatus === 'completed',
    bookingDate: relativeDate(booking.createdAt),
  };
};

/** The signed-in traveller's tour bookings. */
export const fetchMyBookings = async () => {
  const body = unwrap(await apiClient.get('/tours/bookings/my'));
  return asArray(body.bookings).map(adaptBooking);
};

/* ------------------------------------------------------------------ *
 * Tourist destinations (scope of work section 9)
 * ------------------------------------------------------------------ */

/**
 * Backend destination → the object the v1 places screens expect.
 * `id` and `number` exist because the card renders both.
 */
export const adaptDestination = (d = {}, index = 0) => ({
  id: String(d._id || d.id || ''),
  slug: d.slug || '',
  number: String(index + 1),
  name: d.name || 'Destination',
  subtitle: d.subtitle || '',
  location: d.location || '',
  fullAddress: d.fullAddress || '',
  category: d.category || 'viewpoint',

  distanceFromStation: d.distanceFromStation || '',
  travelTime: d.travelTime || '',
  bestTime: d.bestTime || '',
  idealFor: d.idealFor || '',

  description: d.description || '',
  aboutDetails: asArray(d.aboutDetails),
  guideTips: asArray(d.guideTips),

  mainImage: d.mainImage || PLACEHOLDER_IMAGE,
  heroImage: d.heroImage || d.mainImage || PLACEHOLDER_IMAGE,
  insetImage: d.insetImage || d.mainImage || PLACEHOLDER_IMAGE,
  guideSunsetImage: d.guideSunsetImage || '',
  gallery: asArray(d.gallery),

  tags: asArray(d.tags).map((t) => ({
    icon: t.icon || 'fa-solid fa-location-dot',
    text: t.text || '',
    color: t.color || 'text-emerald-600',
  })),

  coordinates: d.coordinates || null,
});

/** The published destination directory. */
export const fetchDestinations = async (params = {}) => {
  const query = {};
  if (params.category && params.category !== 'all') query.category = params.category;
  if (params.search) query.search = params.search;

  const body = unwrap(await apiClient.get('/tours/destinations', { params: query }));
  return asArray(body.destinations).map(adaptDestination);
};

/** One destination, plus the live tour packages that visit it. */
export const fetchDestinationById = async (id) => {
  if (!id) return null;

  const body = unwrap(await apiClient.get(`/tours/destinations/${encodeURIComponent(id)}`));
  if (!body.destination) return null;

  return {
    ...adaptDestination(body.destination),
    packages: asArray(body.packages).map(adaptPackage),
  };
};

/** Review a completed trip. */
export const createReview = async ({ bookingId, rating, comment }) =>
  unwrap(await apiClient.post('/tours/reviews', { bookingId, rating, comment }));

export default {
  fetchPackages,
  fetchPackageById,
  quoteBooking,
  fetchTourOffers,
  createBooking,
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
  fetchMyBookings,
  createReview,
  adaptPackage,
  adaptBooking,
  adaptDestination,
  fetchDestinations,
  fetchDestinationById,
  PACKAGE_TYPES,
};
