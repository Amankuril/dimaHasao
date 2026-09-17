/**
 * Festivals for the consumer app.
 *
 * The approved v1 screens were built against `data/festivalData.js`, and the
 * home screen has been advertising "Passes from ₹250" against fixtures nobody
 * could actually buy. This adapts the real API into the shape those screens
 * already render, so the UI is untouched — only its data source changes.
 */
import apiClient from '../../../services/api/axios';

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
  };
};

/** Every published festival. */
export const fetchFestivals = async (params = {}) => {
  const body = unwrap(await apiClient.get('/festivals', { params }));
  return asArray(body.festivals).map(adaptFestival);
};

/** One festival, by id or slug. */
export const fetchFestivalById = async (id) => {
  if (!id) return null;
  const body = unwrap(await apiClient.get(`/festivals/${encodeURIComponent(id)}`));
  return body.festival ? adaptFestival(body.festival) : null;
};

/** What the passes cost. Server-computed; the screen never derives a total. */
export const quotePasses = async ({ festivalId, ticketCategoryId, ticketCount }) =>
  unwrap(await apiClient.post('/festivals/bookings/quote', {
    festivalId, ticketCategoryId, ticketCount,
  })).quote;

/** Hold the passes. They are not yours until payment lands. */
export const createFestivalBooking = async (payload) =>
  unwrap(await apiClient.post('/festivals/bookings', payload));

export const createPaymentOrder = async (bookingId) =>
  unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/order`));

export const verifyPayment = async (bookingId, payload) =>
  unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/verify`, payload));

/** Refused whenever Razorpay is configured, so it is a dev path only. */
export const settleWithoutGateway = async (bookingId) =>
  unwrap(await apiClient.post(`/festivals/bookings/${bookingId}/settle`, {}));

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
  };
};

export const fetchMyPasses = async () => {
  const body = unwrap(await apiClient.get('/festivals/bookings/my'));
  return asArray(body.bookings).map(adaptBooking);
};

export const cancelFestivalBooking = async (bookingId, reason) =>
  unwrap(await apiClient.post(`/festivals/bookings/${bookingId}/cancel`, { reason }));

export default {
  fetchFestivals,
  fetchFestivalById,
  quotePasses,
  createFestivalBooking,
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
  fetchMyPasses,
  cancelFestivalBooking,
  adaptFestival,
  adaptBooking,
};
