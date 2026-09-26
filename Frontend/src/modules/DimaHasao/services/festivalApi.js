/**
 * Festivals for the consumer app.
 *
 * The approved v1 screens were built against `data/festivalData.js`, and the
 * home screen has been advertising "Passes from ₹250" against fixtures nobody
 * could actually buy. This adapts the real API into the shape those screens
 * already render, so the UI is untouched — only its data source changes.
 */
import apiClient from '../../../services/api/axios';
import { cachedRead, invalidate, keyFor, TTL } from './cache';

const asArray = (value) => (Array.isArray(value) ? value : []);
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80';

/** Backend festival → the object the v1 festival screens expect. */
export const adaptFestival = (f = {}) => {
  const images = [f.heroImage, ...asArray(f.images)].filter(Boolean);

  return {
    id: String(f._id || f.id || ''),
    slug: f.slug || '',
    name: f.name || 'Festival',
    tagline: f.tagline || '',
    dates: f.dates || '',
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    venue: f.venue || '',
    location: f.location || '',
    organizer: f.organizer || '',
    description: f.description || '',
    highlights: asArray(f.highlights),
    heroImage: images[0] || PLACEHOLDER_IMAGE,
    images: images.length ? images : [PLACEHOLDER_IMAGE],
    ticketCategories: asArray(f.ticketCategories).map((c) => ({
      id: String(c._id || c.id || ''),
      name: c.name || 'Pass',
      price: Number(c.price) || 0,
      originalPrice: Number(c.originalPrice) || null,
      totalTickets: Number(c.totalTickets) || 0,
      soldTickets: Number(c.soldTickets) || 0,
      // Derived server-side; the schema's virtuals do not survive a lean read.
      remainingTickets: Number(c.remainingTickets) || 0,
      isSoldOut: Boolean(c.isSoldOut),
      maxPerBooking: Number(c.maxPerBooking) || 10,
      perks: asArray(c.perks),
    })),
    // Whether passes can be bought right now, and why not. The server decides
    // this and enforces the same rule on the booking, so the screen never
    // offers a sale that will be refused.
    bookingOpen: f.bookingOpen !== false,
    bookingClosedReason: f.bookingClosedReason || '',
    bookingClosesAt: f.bookingWindow?.closesAt || null,
    seats: f.seats || { total: 0, booked: 0, available: 0 },
    // Admin-picked spotlight for the list screen's top banner.
    isFeatured: Boolean(f.isFeatured),
  };
};

/** Every published festival. */
export const fetchFestivals = async (params = {}) => {
  const body = unwrap(await apiClient.get('/festivals', { params }));
  return asArray(body.festivals).map(adaptFestival);
};

/** One festival, by id or slug. */
export const fetchFestivalById = (id) => {
  if (!id) return Promise.resolve(null);
  // Inventory TTL: this screen is where seats are chosen, so a stale count
  // here is a booking that fails at checkout.
  return cachedRead(
    keyFor('festival:one', id),
    async () => {
      const body = unwrap(await apiClient.get(`/festivals/${encodeURIComponent(id)}`));
      return body.festival ? adaptFestival(body.festival) : null;
    },
    { ttl: TTL.INVENTORY },
  );
};

/** What the passes cost. Server-computed; the screen never derives a total. */
export const quotePasses = async ({ festivalId, ticketCategoryId, ticketCount }) =>
  unwrap(await apiClient.post('/festivals/bookings/quote', {
    festivalId, ticketCategoryId, ticketCount,
  })).quote;

/** Hold the passes. They are not yours until payment lands. */
export const createFestivalBooking = async (payload) => {
  const result = unwrap(await apiClient.post('/festivals/bookings', payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

/**
 * A whole basket in one call — several categories, one payment.
 *
 * Replaces looping createFestivalBooking per category, which opened a separate
 * Razorpay window for each one.
 */
export const checkoutFestivalBasket = async ({ festivalId, items, attendee }) => {
  const result = unwrap(await apiClient.post('/festivals/bookings/checkout', { festivalId, items, attendee }));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

/** One gateway order covering every booking in a checkout. */
export const createGroupPaymentOrder = async (orderGroupId) =>
  unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}`));

/** One signature, every booking in the basket confirmed. */
export const verifyGroupPayment = async (orderGroupId, payload) => {
  const result = unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}/verify`, payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

/** Hand a basket's held seats back when the buyer abandons the payment. */
export const releaseCheckout = async (orderGroupId) => {
  const result = unwrap(await apiClient.post(`/festivals/bookings/checkout/${orderGroupId}/release`, {}));
  invalidate('festival:list', 'festival:one');
  return result;
};

/** Refused whenever Razorpay is configured, so it is a dev path only. */
export const settleGroupWithoutGateway = async (orderGroupId) => {
  const result = unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}/settle`, {}));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const createPaymentOrder = async (bookingId) =>
  unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/order`));

export const verifyPayment = async (bookingId, payload) => {
  const result = unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/verify`, payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

/** Refused whenever Razorpay is configured, so it is a dev path only. */
export const settleWithoutGateway = async (bookingId) => {
  const result = unwrap(await apiClient.post(`/festivals/bookings/${bookingId}/settle`, {}));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

const STATUS_LABELS = {
  pending: 'Awaiting Payment',
  confirmed: 'Confirmed',
  used: 'Used',
  cancelled: 'Cancelled',
};

/** Backend booking → the pass card the v1 bookings screen renders. */
export const adaptBooking = (b = {}) => {
  const festival = b.festivalId && typeof b.festivalId === 'object' ? b.festivalId : {};

  return {
    id: b.bookingId || String(b._id || ''),
    bookingRef: String(b._id || ''),
    festivalId: String(festival._id || b.festivalId || ''),
    festivalName: b.festivalName || festival.name || 'Festival',
    dates: b.festivalDates || festival.dates || '',
    venue: festival.venue || '',
    image: festival.heroImage || PLACEHOLDER_IMAGE,
    ticketCategory: b.ticketCategoryName || 'Pass',
    ticketCount: Number(b.ticketCount) || 0,
    totalAmount: Number(b.totalAmount) || 0,
    amountPaid: Number(b.amountPaid) || 0,
    paymentStatus: b.paymentStatus || 'pending',
    status: STATUS_LABELS[b.bookingStatus] || b.bookingStatus || 'Confirmed',
    // Only a paid booking carries one; the card must not print a fake code.
    qrCode: b.qrCode || '',
    // Which checkout this came from. Older bookings have none, so they group
    // as themselves.
    orderGroupId: b.orderGroupId || '',
    bookedAt: b.createdAt || null,
  };
};

/**
 * One checkout, one card.
 *
 * A basket spanning three categories is three bookings — each needs its own
 * pass code at the gate — but the buyer made one purchase and paid once, so
 * history reads better as a single entry with the categories inside it.
 */
export const groupPasses = (passes = []) => {
  const groups = new Map();

  for (const pass of passes) {
    // A booking with no group id is its own group, which is what pre-grouping
    // bookings and any single-category purchase should look like anyway.
    const key = pass.orderGroupId || `single:${pass.id}`;
    const group = groups.get(key) || {
      key,
      festivalId: pass.festivalId,
      festivalName: pass.festivalName,
      dates: pass.dates,
      venue: pass.venue,
      image: pass.image,
      status: pass.status,
      bookedAt: pass.bookedAt,
      passes: [],
      ticketCount: 0,
      totalAmount: 0,
    };

    group.passes.push(pass);
    group.ticketCount += pass.ticketCount;
    group.totalAmount += pass.totalAmount;
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    // The reference a buyer quotes for the whole purchase.
    id: group.passes.length === 1 ? group.passes[0].id : group.key,
    categoryLabel: group.passes.map((p) => `${p.ticketCount} × ${p.ticketCategory}`).join(', '),
  }));
};

export const fetchMyPasses = () =>
  cachedRead(
    'festival:passes',
    async () => {
      const body = unwrap(await apiClient.get('/festivals/bookings/my'));
      return asArray(body.bookings).map(adaptBooking);
    },
    { ttl: TTL.MINE },
  );

export const cancelFestivalBooking = async (bookingId, reason) => {
  const result = unwrap(await apiClient.post(`/festivals/bookings/${bookingId}/cancel`, { reason }));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export default {
  fetchFestivals,
  fetchFestivalById,
  quotePasses,
  createFestivalBooking,
  checkoutFestivalBasket,
  createGroupPaymentOrder,
  verifyGroupPayment,
  settleGroupWithoutGateway,
  releaseCheckout,
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
  fetchMyPasses,
  groupPasses,
  cancelFestivalBooking,
  adaptFestival,
  adaptBooking,
};
