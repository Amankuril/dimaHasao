/**
 * Festivals for the consumer app — ported verbatim from
 * Frontend/src/modules/DimaHasao/services/festivalApi.js.
 */
import apiClient from './api/axios';
import {cachedRead, invalidate, keyFor, TTL} from './cache';

const asArray = value => (Array.isArray(value) ? value : []);
const unwrap = res => res?.data?.data ?? res?.data ?? {};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80';

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
    ticketCategories: asArray(f.ticketCategories).map(c => ({
      id: String(c._id || c.id || ''),
      name: c.name || 'Pass',
      price: Number(c.price) || 0,
      originalPrice: Number(c.originalPrice) || null,
      totalTickets: Number(c.totalTickets) || 0,
      soldTickets: Number(c.soldTickets) || 0,
      remainingTickets: Number(c.remainingTickets) || 0,
      isSoldOut: Boolean(c.isSoldOut),
      maxPerBooking: Number(c.maxPerBooking) || 10,
      perks: asArray(c.perks),
    })),
    bookingOpen: f.bookingOpen !== false,
    bookingClosedReason: f.bookingClosedReason || '',
    bookingClosesAt: f.bookingWindow?.closesAt || null,
    seats: f.seats || {total: 0, booked: 0, available: 0},
    isFeatured: Boolean(f.isFeatured),
  };
};

export const fetchFestivals = async (params = {}) => {
  const body = unwrap(await apiClient.get('/festivals', {params}));
  return asArray(body.festivals).map(adaptFestival);
};

export const fetchFestivalById = id => {
  if (!id) return Promise.resolve(null);
  return cachedRead(
    keyFor('festival:one', id),
    async () => {
      const body = unwrap(await apiClient.get(`/festivals/${encodeURIComponent(id)}`));
      return body.festival ? adaptFestival(body.festival) : null;
    },
    {ttl: TTL.INVENTORY},
  );
};

export const quotePasses = async ({festivalId, ticketCategoryId, ticketCount}) =>
  unwrap(
    await apiClient.post('/festivals/bookings/quote', {festivalId, ticketCategoryId, ticketCount}),
  ).quote;

export const createFestivalBooking = async payload => {
  const result = unwrap(await apiClient.post('/festivals/bookings', payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const checkoutFestivalBasket = async ({festivalId, items, attendee}) => {
  const result = unwrap(await apiClient.post('/festivals/bookings/checkout', {festivalId, items, attendee}));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const createGroupPaymentOrder = async orderGroupId =>
  unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}`));

export const verifyGroupPayment = async (orderGroupId, payload) => {
  const result = unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}/verify`, payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const releaseCheckout = async orderGroupId => {
  const result = unwrap(await apiClient.post(`/festivals/bookings/checkout/${orderGroupId}/release`, {}));
  invalidate('festival:list', 'festival:one');
  return result;
};

export const settleGroupWithoutGateway = async orderGroupId => {
  const result = unwrap(await apiClient.post(`/festivals/payments/orders/${orderGroupId}/settle`, {}));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const createPaymentOrder = async bookingId =>
  unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/order`));

export const verifyPayment = async (bookingId, payload) => {
  const result = unwrap(await apiClient.post(`/festivals/payments/bookings/${bookingId}/verify`, payload));
  invalidate('festival:passes', 'festival:list', 'festival:one');
  return result;
};

export const settleWithoutGateway = async bookingId => {
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
    qrCode: b.qrCode || '',
    orderGroupId: b.orderGroupId || '',
    bookedAt: b.createdAt || null,
  };
};

export const groupPasses = (passes = []) => {
  const groups = new Map();

  for (const pass of passes) {
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

  return [...groups.values()].map(group => ({
    ...group,
    id: group.passes.length === 1 ? group.passes[0].id : group.key,
    categoryLabel: group.passes.map(p => `${p.ticketCount} × ${p.ticketCategory}`).join(', '),
  }));
};

export const fetchMyPasses = () =>
  cachedRead(
    'festival:passes',
    async () => {
      const body = unwrap(await apiClient.get('/festivals/bookings/my'));
      return asArray(body.bookings).map(adaptBooking);
    },
    {ttl: TTL.MINE},
  );

export const cancelFestivalBooking = async (bookingId, reason) => {
  const result = unwrap(await apiClient.post(`/festivals/bookings/${bookingId}/cancel`, {reason}));
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
