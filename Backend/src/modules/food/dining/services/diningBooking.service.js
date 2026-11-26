import mongoose from 'mongoose';
import { FoodDiningBooking } from '../models/diningBooking.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodDiningRestaurant } from '../models/diningRestaurant.model.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../../core/auth/errors.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { notifyOwnersSafely } from '../../orders/services/order.helpers.js';
import { logger } from '../../../../utils/logger.js';

// Format database booking document into the exact JSON shape required by the frontend
function formatBooking(bookingDoc) {
    if (!bookingDoc) return null;
    const booking = bookingDoc.toObject ? bookingDoc.toObject() : bookingDoc;
    
    // Format restaurant details
    let restaurantObj = null;
    if (booking.restaurantId && typeof booking.restaurantId === 'object') {
        const rest = booking.restaurantId;
        const coverImage = Array.isArray(rest.coverImages)
            ? rest.coverImages.map(img => typeof img === 'string' ? img : img?.url || '').find(Boolean)
            : '';
        const profilePhoto = typeof rest.profileImage === 'string'
            ? rest.profileImage
            : (rest.profileImage?.url || '');

        restaurantObj = {
            _id: rest._id,
            id: rest._id,
            name: rest.restaurantName || rest.name || 'Restaurant',
            restaurantName: rest.restaurantName || rest.name || 'Restaurant',
            profileImage: rest.profileImage || null,
            image: coverImage || profilePhoto || '',
            location: rest.location || null,
            slug: rest.slug || ''
        };
    } else if (booking.restaurantId) {
        restaurantObj = {
            _id: booking.restaurantId,
            id: booking.restaurantId,
            name: 'Restaurant',
            restaurantName: 'Restaurant',
            profileImage: null,
            image: '',
            location: null,
            slug: ''
        };
    }

    // Format user details
    let userObj = null;
    if (booking.userId && typeof booking.userId === 'object') {
        const u = booking.userId;
        userObj = {
            _id: u._id,
            id: u._id,
            name: u.name || 'Guest',
            phone: u.phone || '',
            email: u.email || ''
        };
    } else if (booking.userId) {
        userObj = {
            _id: booking.userId,
            id: booking.userId,
            name: 'Guest',
            phone: '',
            email: ''
        };
    }

    return {
        _id: booking._id,
        id: booking._id,
        bookingId: booking.bookingId,
        restaurantId: booking.restaurantId?._id || booking.restaurantId,
        restaurant: restaurantObj,
        userId: booking.userId?._id || booking.userId,
        user: userObj,
        guests: booking.guests,
        date: booking.date,
        timeSlot: booking.timeSlot,
        specialRequest: booking.specialRequest || '',
        status: booking.status || 'pending',
        cancelledBy: booking.cancelledBy || null,
        canCancel: USER_CANCELLABLE.has(booking.status),
        canReview: booking.status === 'completed' && !booking.review?.rating,
        review: booking.review || null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
    };
}

const ACTIVE_STATUSES = ['pending', 'accepted', 'confirmed', 'checked-in'];

/*
 * The only moves a booking can make. 'confirmed' is an old alias of 'accepted'.
 * A finished booking (completed / cancelled / rejected) never moves again.
 */
const RESTAURANT_TRANSITIONS = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['checked-in', 'cancelled'],
    confirmed: ['checked-in', 'cancelled'],
    'checked-in': ['completed'],
};
const USER_CANCELLABLE = new Set(['pending', 'accepted', 'confirmed']);

const STATUS_COPY = {
    accepted: { title: 'Table booking confirmed', body: (b, r) => `${r} confirmed your table for ${b.guests} on ${fmtDate(b.date)}, ${b.timeSlot}.` },
    rejected: { title: 'Table booking declined', body: (b, r) => `${r} could not take your booking for ${fmtDate(b.date)}, ${b.timeSlot}.` },
    cancelled: { title: 'Table booking cancelled', body: (b, r) => `Your booking at ${r} for ${fmtDate(b.date)}, ${b.timeSlot} was cancelled.` },
    'checked-in': { title: 'Checked in', body: (b, r) => `Welcome to ${r}! Enjoy your meal.` },
    completed: { title: 'Thanks for dining with us', body: (b, r) => `How was ${r}? Rate your visit.` },
};

function fmtDate(d) {
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

/** 'YYYY-MM-DD' of a date in India time. */
function istDayKey(d) {
    return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Parses "7:30 PM" / "19:30" into minutes after midnight; null if unreadable. */
function slotMinutes(slot) {
    const m = String(slot || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2]);
    if (m[3]) {
        const pm = m[3].toLowerCase() === 'pm';
        if (h === 12) h = pm ? 12 : 0;
        else if (pm) h += 12;
    }
    return h * 60 + min;
}

async function emitBookingUpdate(booking, { notifyUser = true, notifyRestaurant = false } = {}) {
    try {
        const io = getIO();
        const restaurantName = booking.restaurantId?.restaurantName || 'The restaurant';
        const userId = booking.userId?._id || booking.userId;
        const restaurantId = booking.restaurantId?._id || booking.restaurantId;
        const payload = { bookingId: String(booking._id), displayId: booking.bookingId, status: booking.status };
        if (io) {
            if (notifyUser && userId) io.to(rooms.user(userId)).emit('dining_booking_update', payload);
            if (notifyRestaurant && restaurantId) io.to(rooms.restaurant(restaurantId)).emit('dining_booking_update', payload);
        }
        const copy = STATUS_COPY[booking.status];
        if (notifyUser && copy && userId) {
            await notifyOwnersSafely([{ ownerType: 'USER', ownerId: userId }], {
                title: copy.title,
                body: copy.body(booking, restaurantName),
                data: { type: 'dining_booking_update', bookingId: String(booking._id), status: booking.status, link: '/food/user/bookings' },
            });
        }
        if (notifyRestaurant && restaurantId) {
            await notifyOwnersSafely([{ ownerType: 'RESTAURANT', ownerId: restaurantId }], {
                title: booking.status === 'pending' ? 'New table booking' : 'Table booking cancelled',
                body: `${booking.guests} guest(s) · ${fmtDate(booking.date)}, ${booking.timeSlot} · #${booking.bookingId}`,
                data: { type: 'dining_booking_update', bookingId: String(booking._id), status: booking.status },
            });
        }
    } catch (err) {
        logger.warn(`dining booking notify failed: ${err?.message || err}`);
    }
}

export async function createBooking(userId, payload) {
    const restaurantId = payload.restaurant || payload.restaurantId;
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new ValidationError('Valid Restaurant ID is required');
    }

    const restaurant = await FoodRestaurant.findById(restaurantId).select('restaurantName status diningSettings').lean();
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    if (restaurant.status && restaurant.status !== 'approved') {
        throw new ValidationError('This restaurant is not taking bookings right now');
    }
    const diningProfile = await FoodDiningRestaurant.findOne({ restaurantId }).select('isEnabled maxGuests').lean();
    const diningOn = restaurant.diningSettings?.isEnabled === true || diningProfile?.isEnabled === true;
    if (!diningOn) throw new ValidationError('Table booking is turned off for this restaurant');

    const maxGuests = Number(restaurant.diningSettings?.maxGuests || diningProfile?.maxGuests || 0) || 20;
    const guests = Math.floor(Number(payload.guests));
    if (!Number.isFinite(guests) || guests < 1) throw new ValidationError('Choose how many guests');
    if (guests > maxGuests) throw new ValidationError(`This restaurant takes bookings of up to ${maxGuests} guests`);

    const date = new Date(payload.date);
    if (Number.isNaN(date.getTime())) throw new ValidationError('Choose a valid date');
    const todayKey = istDayKey(new Date());
    const dayKey = istDayKey(date);
    if (dayKey < todayKey) throw new ValidationError('That date has already passed');
    const maxAhead = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    if (dayKey > istDayKey(maxAhead)) throw new ValidationError('Bookings open up to 60 days ahead');

    const timeSlot = String(payload.timeSlot || '').trim();
    if (!timeSlot) throw new ValidationError('Choose a time slot');
    if (dayKey === todayKey) {
        const mins = slotMinutes(timeSlot);
        const nowIst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        if (mins != null && mins < nowIst.getHours() * 60 + nowIst.getMinutes()) {
            throw new ValidationError('That time has already passed today');
        }
    }

    // One live booking per guest per restaurant per slot (a double tap made two).
    const dayStart = new Date(`${dayKey}T00:00:00+05:30`);
    const dayEnd = new Date(`${dayKey}T23:59:59.999+05:30`);
    const duplicate = await FoodDiningBooking.findOne({
        userId,
        restaurantId,
        timeSlot,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ACTIVE_STATUSES },
    }).populate('restaurantId').populate('userId');
    if (duplicate) return formatBooking(duplicate);

    // Display id: TB + 8 digits; retried on the (rare) unique clash.
    let saved = null;
    for (let attempt = 0; attempt < 4 && !saved; attempt += 1) {
        try {
            saved = await FoodDiningBooking.create({
                bookingId: `TB${Math.floor(10000000 + Math.random() * 90000000)}`,
                restaurantId,
                userId,
                guests,
                date: dayStart,
                timeSlot,
                specialRequest: String(payload.specialRequest || '').trim().slice(0, 300),
                status: 'pending',
            });
        } catch (err) {
            if (err?.code !== 11000) throw err;
        }
    }
    if (!saved) throw new ValidationError('Could not create the booking, please try again');

    const populated = await FoodDiningBooking.findById(saved._id).populate('restaurantId').populate('userId');
    await emitBookingUpdate(populated, { notifyUser: false, notifyRestaurant: true });
    return formatBooking(populated);
}

export async function getUserBooking(bookingId, userId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new NotFoundError('Booking not found');
    const doc = await FoodDiningBooking.findOne({ _id: bookingId, userId }).populate('restaurantId').populate('userId');
    if (!doc) throw new NotFoundError('Booking not found');
    return formatBooking(doc);
}

export async function cancelBookingByUser(bookingId, userId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new NotFoundError('Booking not found');
    const updated = await FoodDiningBooking.findOneAndUpdate(
        { _id: bookingId, userId, status: { $in: [...USER_CANCELLABLE] } },
        { $set: { status: 'cancelled', cancelledBy: 'user', cancelledAt: new Date() } },
        { new: true },
    ).populate('restaurantId').populate('userId');
    if (!updated) {
        const existing = await FoodDiningBooking.findOne({ _id: bookingId, userId }).lean();
        if (!existing) throw new NotFoundError('Booking not found');
        if (existing.status === 'cancelled') return getUserBooking(bookingId, userId);
        throw new ValidationError(`A ${existing.status} booking can no longer be cancelled`);
    }
    await emitBookingUpdate(updated, { notifyUser: false, notifyRestaurant: true });
    return formatBooking(updated);
}

export async function listUserBookings(userId) {
    const docs = await FoodDiningBooking.find({ userId })
        .populate('restaurantId')
        .populate('userId')
        .sort({ date: -1, createdAt: -1 });

    return docs.map(formatBooking).filter(Boolean);
}

export async function listRestaurantBookings(restaurantIdentifier, authInfo = {}) {
    let restaurantId = restaurantIdentifier;

    // Resolve restaurant ID if a slug was passed
    if (!mongoose.Types.ObjectId.isValid(restaurantIdentifier)) {
        const rest = await FoodRestaurant.findOne({ slug: restaurantIdentifier }).select('_id').lean();
        if (!rest) return [];
        restaurantId = rest._id;
    }

    // Owner check: role is RESTAURANT and user ID matches restaurant ID
    const isAuthorizedOwner = authInfo.requesterRole === 'RESTAURANT' && 
        String(authInfo.requesterId) === String(restaurantId);

    const docs = await FoodDiningBooking.find({ restaurantId })
        .populate('restaurantId')
        .populate('userId')
        .sort({ date: -1, createdAt: -1 });

    const formatted = docs.map(formatBooking).filter(Boolean);

    // If request is public (availability check), redact user personal details to protect privacy
    if (!isAuthorizedOwner) {
        return formatted.map((b) => ({
            ...b,
            user: {
                _id: b.user?._id || null,
                id: b.user?.id || null,
                name: 'Guest',
                phone: '',
                email: ''
            },
            specialRequest: ''
        }));
    }

    return formatted;
}

export async function updateBookingStatus(bookingId, status, restaurantId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new NotFoundError('Booking not found');
    let next = String(status || '').trim().toLowerCase();
    if (next === 'confirmed') next = 'accepted';
    if (next === 'declined') next = 'rejected';

    const booking = await FoodDiningBooking.findById(bookingId).lean();
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.restaurantId.toString() !== restaurantId.toString()) {
        throw new ForbiddenError('This booking belongs to another restaurant');
    }
    const from = booking.status;
    if (from === next) {
        return formatBooking(await FoodDiningBooking.findById(bookingId).populate('restaurantId').populate('userId'));
    }
    if (!(RESTAURANT_TRANSITIONS[from] || []).includes(next)) {
        throw new ValidationError(`A ${from} booking cannot be moved to ${next}`);
    }
    if (next === 'checked-in' && istDayKey(booking.date) !== istDayKey(new Date())) {
        throw new ValidationError('Guests can only be checked in on the day of the booking');
    }

    // Atomic on the current status so two taps / two devices cannot both act.
    const set = { status: next };
    if (next === 'checked-in') set.checkedInAt = new Date();
    if (next === 'completed') set.completedAt = new Date();
    if (next === 'cancelled' || next === 'rejected') {
        set.cancelledBy = 'restaurant';
        set.cancelledAt = new Date();
    }
    const updated = await FoodDiningBooking.findOneAndUpdate({ _id: bookingId, status: from }, { $set: set }, { new: true })
        .populate('restaurantId')
        .populate('userId');
    if (!updated) throw new ValidationError('This booking changed in the meantime; please refresh');

    await emitBookingUpdate(updated, { notifyUser: true });
    return formatBooking(updated);
}

export async function submitBookingReview(bookingId, userId, rating, comment) {
    const booking = mongoose.Types.ObjectId.isValid(bookingId) ? await FoodDiningBooking.findById(bookingId) : null;
    if (!booking) {
        throw new NotFoundError('Booking not found');
    }

    if (booking.userId.toString() !== userId.toString()) {
        throw new ForbiddenError('Unauthorized feedback submission');
    }
    if (booking.status !== 'completed') {
        throw new ValidationError('You can rate a visit once it is completed');
    }
    if (booking.review?.rating) {
        throw new ValidationError('You have already rated this visit');
    }

    booking.review = {
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        comment: String(comment || '').trim(),
        createdAt: new Date()
    };

    await booking.save();

    const populated = await FoodDiningBooking.findById(booking._id)
        .populate('restaurantId')
        .populate('userId');

    return formatBooking(populated);
}
