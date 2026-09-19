/**
 * Hotel data for the consumer app.
 *
 * The v1 screens were built against the static `data/hotelData.js` fixtures.
 * This module fetches the real ported HomeZoo backend (`/api/v1/hotel`) and
 * adapts each property into the exact shape those screens already consume, so
 * the approved UI is untouched — only its data source changes.
 */
import axios from 'axios';
// Reads go through the module-scoped client below; authenticated writes use the
// shared client, which attaches the bearer token and handles refresh.
import apiClient from '../../../services/api/axios';
import { cachedRead, invalidate, keyFor, TTL } from './cache';

const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

const hotelClient = axios.create({ baseURL: `${baseURL}/hotel`, timeout: 20000 });

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';

/** Backend propertyType → the label the v1 filter chips expect. */
const TYPE_LABELS = {
  resort: 'Resort',
  hotel: 'Hotel',
  homestay: 'Homestay',
  villa: 'Villa',
  hostel: 'Hostel',
  pg: 'PG',
  tent: 'Camping',
};

/** Amenity strings → the icon rows the UI renders. */
const AMENITY_ICONS = {
  wifi: 'fa-solid fa-wifi',
  parking: 'fa-solid fa-square-parking',
  restaurant: 'fa-solid fa-utensils',
  food: 'fa-solid fa-utensils',
  ac: 'fa-solid fa-snowflake',
  geyser: 'fa-solid fa-temperature-arrow-up',
  'hot water': 'fa-solid fa-temperature-arrow-up',
  tv: 'fa-solid fa-tv',
  power: 'fa-solid fa-bolt',
  'power backup': 'fa-solid fa-bolt',
  bonfire: 'fa-solid fa-fire',
  view: 'fa-solid fa-mountain',
  laundry: 'fa-solid fa-shirt',
  pool: 'fa-solid fa-person-swimming',
};

const iconFor = (amenity) => {
  const key = String(amenity || '').trim().toLowerCase();
  return AMENITY_ICONS[key]
    || Object.entries(AMENITY_ICONS).find(([name]) => key.includes(name))?.[1]
    || 'fa-solid fa-circle-check';
};

const titleCase = (value) =>
  String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const adaptAmenities = (amenities = []) =>
  (Array.isArray(amenities) ? amenities : []).map((amenity, index) => ({
    id: `${String(amenity).toLowerCase().replace(/\s+/g, '-')}-${index}`,
    icon: iconFor(amenity),
    label: titleCase(amenity),
  }));

/** "2 weeks ago" style label, matching what the review card renders. */
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

/** Backend review → the shape the detail screen's review card renders. */
export const adaptReview = (review = {}) => ({
  id: String(review._id || review.id || ''),
  author: review.userId?.name || review.userName || 'Guest',
  rating: Number(review.rating || 0),
  date: relativeDate(review.createdAt),
  avatar: review.userId?.profileImage || review.avatar || '',
  comment: review.comment || '',
});

const adaptRoom = (room = {}, fallbackPrice = 0) => ({
  id: String(room._id || room.id || ''),
  name: room.name || 'Room',
  // v1 renders a short spec line under the room name.
  bedType: titleCase(room.roomCategory || room.inventoryType || ''),
  maxGuests: Number(room.maxAdults || 0) + Number(room.maxChildren || 0) || 2,
  price: Number(room.pricePerNight ?? fallbackPrice) || 0,
  originalPrice: null,
  size: room.size || '',
  image: room.images?.[0] || PLACEHOLDER_IMAGE,
  images: Array.isArray(room.images) && room.images.length ? room.images : [PLACEHOLDER_IMAGE],
  // RoomCard renders these directly as text, so they must stay plain strings —
  // unlike property-level amenities, which the card renders as {icon, label}.
  amenities: (Array.isArray(room.amenities) ? room.amenities : []).map(titleCase),
  availableRooms: Number(room.totalInventory || 0),
  isPopular: false,
  available: room.isActive !== false,
});

/**
 * Backend property → the object v1's hotel screens expect.
 * @param {Object} property
 */
export const adaptProperty = (property = {}) => {
  const id = String(property._id || property.id || '');
  const address = property.address || {};
  const rooms = Array.isArray(property.roomTypes) ? property.roomTypes : [];
  const startingPrice =
    Number(property.startingPrice)
    || rooms.reduce((min, r) => {
      const p = Number(r.pricePerNight || 0);
      return p > 0 && (min === 0 || p < min) ? p : min;
    }, 0);

  const images = [property.coverImage, ...(property.propertyImages || [])].filter(Boolean);

  return {
    id,
    name: property.propertyName || 'Stay',
    slug: id,
    type: TYPE_LABELS[String(property.propertyType || '').toLowerCase()]
      || titleCase(property.propertyType) || 'Stay',
    badge: property.isFeatured ? 'Featured' : '',
    location: [address.area, address.city].filter(Boolean).join(', ') || address.fullAddress || '',
    address: address.fullAddress
      || [address.area, address.city, address.state, address.pincode].filter(Boolean).join(', '),
    // Only shown when the backend actually computed a distance (geo search).
    distanceFromStation: property.distance ? `${(property.distance / 1000).toFixed(1)} km` : '',
    travelTime: '',
    rating: Number(property.avgRating ?? property.averageRating ?? property.rating ?? 0),
    reviewCount: Number(property.totalReviews ?? property.reviewCount ?? 0),
    startingPrice,
    originalPrice: null,
    taxRate: 0.12,
    heroImage: images[0] || PLACEHOLDER_IMAGE,
    images: images.length ? images : [PLACEHOLDER_IMAGE],
    description: property.description || '',
    aboutDetails: Array.isArray(property.houseRules) ? property.houseRules : [],
    amenities: adaptAmenities(property.amenities),
    checkInTime: property.checkInTime || '12:00 PM',
    checkOutTime: property.checkOutTime || '11:00 AM',
    cancellationPolicy: property.cancellationPolicy || 'Cancellation policy as per property terms.',
    rooms: rooms.map((room) => adaptRoom(room, startingPrice)),
    // The detail screen reads `hotel.reviews.length`, so this is never undefined.
    reviews: Array.isArray(property.reviews) ? property.reviews.map(adaptReview) : [],
    nearbyPlaces: property.nearbyPlaces || [],
    coordinates: property.location?.coordinates || null,
  };
};

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  return payload?.properties || payload?.data || payload?.results || [];
};

/**
 * Live stays for the list screen.
 * @param {{search?: string, type?: string, guests?: number}} [params]
 * @returns {Promise<Array>} adapted properties ([] on failure — the screen
 *   shows its empty state rather than breaking)
 */
export const fetchHotels = (params = {}) =>
  cachedRead(keyFor('hotel:properties', params), async () => {
    const query = {};
    if (params.search) query.search = params.search;
    if (params.type && params.type !== 'All') query.type = String(params.type).toLowerCase();
    if (params.guests) query.guests = params.guests;

    const { data } = await hotelClient.get('/properties', { params: query });
    return unwrapList(data).map(adaptProperty);
  });

/**
 * One stay, with its room types.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const fetchHotelById = (id) => {
  if (!id) return Promise.resolve(null);
  return cachedRead(keyFor('hotel:property', id), async () => {
  const [detail, reviews] = await Promise.all([
    hotelClient.get(`/properties/${encodeURIComponent(id)}`),
    // Reviews are a separate endpoint; a failure here must not hide the stay.
    hotelClient
      .get(`/reviews/${encodeURIComponent(id)}`)
      .then((res) => (Array.isArray(res.data) ? res.data : res.data?.reviews || []))
      .catch(() => []),
  ]);

  const payload = detail.data || {};
  const property = payload.property || payload.data || payload;

  if (!property || !(property._id || property.id)) return null;

  // The detail endpoint returns roomTypes as a SIBLING of `property`, while the
  // list aggregation embeds them — so fold them in before adapting.
  const roomTypes = payload.roomTypes || property.roomTypes || [];

  return {
    ...adaptProperty({ ...property, roomTypes }),
    reviews: reviews.map(adaptReview),
  };
  });
};

/* ------------------------------------------------------------------ *
 * Booking (authenticated)
 * ------------------------------------------------------------------ */

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

/**
 * What the stay costs. Server-computed, including seasonal nightly rates,
 * coupons and availability — the screen displays this and never derives a
 * total of its own.
 */
export const quoteStay = async ({ propertyId, roomTypeId, checkInDate, checkOutDate, guests, couponCode }) =>
  unwrap(await apiClient.post('/hotel/bookings/quote', {
    propertyId, roomTypeId, checkInDate, checkOutDate, guests, couponCode,
  })).quote;

/**
 * Create the booking.
 * @returns {Promise<{booking, paymentRequired, order, key}>} `order` is present
 *   when the chosen method needs a gateway round-trip.
 */
export const createHotelBooking = async (payload) => {
  const result = unwrap(await apiClient.post('/hotel/bookings', payload));
  invalidate('hotel:bookings', 'hotel:property', 'hotel:properties');
  return result;
};

/** Confirm a Razorpay payment against a booking. */
export const verifyHotelPayment = async (payload) => {
  const result = unwrap(await apiClient.post('/hotel/payments/verify', payload));
  invalidate('hotel:bookings', 'hotel:property', 'hotel:properties');
  return result;
};

const STAY_STATUS = {
  pending: 'Awaiting Payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  rejected: 'Rejected',
};

const stayDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

/** Backend booking → the card the v1 bookings screen renders. */
export const adaptBooking = (booking = {}) => {
  const property = booking.propertyId && typeof booking.propertyId === 'object' ? booking.propertyId : {};
  const room = booking.roomTypeId && typeof booking.roomTypeId === 'object' ? booking.roomTypeId : {};
  const address = property.address || {};

  return {
    id: booking.bookingId || String(booking._id || ''),
    bookingRef: String(booking._id || ''),
    hotelId: String(property._id || booking.propertyId || ''),
    hotelName: property.propertyName || 'Stay',
    roomName: room.name || 'Room',
    location: [address.area, address.city].filter(Boolean).join(', ') || address.fullAddress || '',
    checkIn: stayDate(booking.checkInDate),
    checkOut: stayDate(booking.checkOutDate),
    nights: Number(booking.totalNights) || 0,
    roomCount: Number(booking.guests?.rooms) || 1,
    guests: `${booking.guests?.adults || 1} Adults${booking.guests?.children ? `, ${booking.guests.children} Children` : ''}`,
    totalAmount: Number(booking.totalAmount) || 0,
    paymentMethod: booking.paymentMethod === 'pay_at_hotel' ? 'Pay at Property' : 'Online',
    paymentStatus: booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid',
    status: STAY_STATUS[booking.bookingStatus] || booking.bookingStatus || 'Confirmed',
    bookingDate: stayDate(booking.createdAt),
    image: property.coverImage || (property.propertyImages || [])[0] || PLACEHOLDER_IMAGE,
    guestName: booking.guestContact?.name || '',
    guestPhone: booking.guestContact?.phone || '',
  };
};

/** The signed-in guest's stays. */
export const fetchMyHotelBookings = () =>
  cachedRead(
    'hotel:bookings',
    async () => {
      const body = unwrap(await apiClient.get('/hotel/bookings/my'));
      const list = Array.isArray(body) ? body : body.bookings || [];
      return list.map(adaptBooking);
    },
    { ttl: TTL.MINE },
  );

export default {
  fetchHotels,
  fetchHotelById,
  adaptProperty,
  quoteStay,
  adaptBooking,
  createHotelBooking,
  verifyHotelPayment,
  fetchMyHotelBookings,
};
