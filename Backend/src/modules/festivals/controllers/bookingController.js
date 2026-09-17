/**
 * Festival pass bookings.
 *
 * Every amount is computed here from the festival's own stored ticket price.
 * The client sends a category and a quantity and never a figure — the same
 * rule the tours and hotel quotes follow, for the same reason.
 *
 * Inventory is the interesting part: a pass allocation is finite, so the seat
 * take is a single conditional update rather than read-then-write. Two buyers
 * racing for the last pass cannot both win.
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import Festival, { bookingWindow, festivalStatus } from '../models/Festival.js';
import FestivalBooking from '../models/FestivalBooking.js';

const bookingRef = () => `FS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
/** Short, unambiguous at a gate, and unguessable. */
const issueQrCode = () => `DH-PASS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

/** Load a sellable festival and the requested category. */
const loadCategory = async (festivalId, categoryId) => {
  if (!mongoose.Types.ObjectId.isValid(festivalId)) {
    const error = new Error('Festival not found');
    error.statusCode = 404;
    throw error;
  }

  const festival = await Festival.findOne({ _id: festivalId, isActive: true });
  if (!festival) {
    const error = new Error('Festival not found or no longer on sale');
    error.statusCode = 404;
    throw error;
  }

  const category = festival.ticketCategories.id(categoryId);
  if (!category || !category.isActive) {
    const error = new Error('That pass is not available');
    error.statusCode = 404;
    throw error;
  }

  return { festival, category };
};

const priceTickets = (category, count) => {
  const pricePerTicket = Number(category.price) || 0;
  const baseAmount = pricePerTicket * count;
  // No tax on festival passes today; the field exists so adding one later does
  // not change the booking shape.
  const taxRate = 0;
  const taxes = Math.round((baseAmount * taxRate) / 100);

  return { pricePerTicket, baseAmount, taxRate, taxes, totalAmount: baseAmount + taxes };
};

/**
 * @route POST /v1/festivals/bookings/quote
 * What the passes cost. No side effects, no inventory taken.
 */
export const getBookingQuote = async (req, res) => {
  try {
    const { festivalId, ticketCategoryId, ticketCount } = req.body;
    const count = Math.max(1, Number(ticketCount) || 1);

    const { festival, category } = await loadCategory(festivalId, ticketCategoryId);

    const window = bookingWindow(festival);
    if (!window.isOpen) {
      return res.status(409).json({ success: false, message: window.reason, bookingOpen: false });
    }

    if (count > category.maxPerBooking) {
      return res.status(400).json({
        success: false,
        message: `Up to ${category.maxPerBooking} passes per booking`,
      });
    }

    const remaining = Math.max(0, category.totalTickets - category.soldTickets);
    if (count > remaining) {
      return res.status(400).json({
        success: false,
        message: remaining === 0 ? 'This pass is sold out' : `Only ${remaining} left`,
      });
    }

    res.json({
      success: true,
      quote: {
        ticketCategoryName: category.name,
        ticketCount: count,
        ...priceTickets(category, count),
        remainingTickets: remaining,
        maxPerBooking: category.maxPerBooking,
        totalSeats: category.totalTickets,
        bookedSeats: category.soldTickets,
      },
      bookingOpen: true,
      bookingClosesAt: window.closesAt,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival quote error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to price these passes' });
  }
};

/**
 * Take `count` seats from one category, or return null if they are not there.
 *
 * The availability check and the decrement are a single conditional update, so
 * a race for the last seat has exactly one winner. Extracted so the single
 * booking and the basket checkout share one implementation — two copies of an
 * inventory guard is how oversells happen.
 */
const claimSeats = async (festivalId, categoryId, count) =>
  Festival.findOneAndUpdate(
    {
      _id: festivalId,
      isActive: true,
      ticketCategories: { $elemMatch: { _id: categoryId, isActive: true } },
      // The availability guard has to be a TOP-LEVEL $expr: Mongo rejects
      // $expr inside $elemMatch ("can only be applied to the top-level
      // document"), so the category is picked out with $filter instead.
      $expr: {
        $gte: [
          {
            $let: {
              vars: {
                cat: {
                  $first: {
                    $filter: {
                      input: '$ticketCategories',
                      as: 'c',
                      cond: { $eq: ['$$c._id', categoryId] },
                    },
                  },
                },
              },
              in: { $subtract: ['$$cat.totalTickets', '$$cat.soldTickets'] },
            },
          },
          count,
        ],
      },
    },
    { $inc: { 'ticketCategories.$[cat].soldTickets': count } },
    { new: true, arrayFilters: [{ 'cat._id': categoryId }] },
  );

/** Hand seats back to a category. */
const releaseSeats = (festivalId, categoryId, count) =>
  Festival.updateOne(
    { _id: festivalId },
    { $inc: { 'ticketCategories.$[cat].soldTickets': -count } },
    { arrayFilters: [{ 'cat._id': categoryId }] },
  );

/** What is left in a category right now, for a useful refusal message. */
const remainingIn = async (festivalId, categoryId) => {
  const fresh = await Festival.findById(festivalId).lean();
  const current = fresh?.ticketCategories?.find((c) => String(c._id) === String(categoryId));
  return current ? Math.max(0, current.totalTickets - current.soldTickets) : 0;
};

/**
 * @route POST /v1/festivals/bookings
 *
 * Takes the inventory up front with a conditional update, so a race for the
 * last pass has exactly one winner. If payment never completes, the hold is
 * released by cancelling the booking.
 */
export const createBooking = async (req, res) => {
  try {
    const { festivalId, ticketCategoryId, ticketCount, attendee } = req.body;
    const count = Math.max(1, Number(ticketCount) || 1);

    const { festival, category } = await loadCategory(festivalId, ticketCategoryId);

    // Checked again here, not only on the quote: a screen left open past the
    // deadline would otherwise still be able to buy.
    const window = bookingWindow(festival);
    if (!window.isOpen) {
      return res.status(409).json({ success: false, message: window.reason });
    }

    if (count > category.maxPerBooking) {
      return res.status(400).json({
        success: false,
        message: `Up to ${category.maxPerBooking} passes per booking`,
      });
    }

    const pricing = priceTickets(category, count);

    const claimed = await claimSeats(festival._id, category._id, count);

    if (!claimed) {
      const remaining = await remainingIn(festival._id, category._id);
      return res.status(409).json({
        success: false,
        message: remaining === 0 ? 'This pass just sold out' : `Only ${remaining} left`,
        remainingTickets: remaining,
      });
    }

    const booking = await FestivalBooking.create({
      bookingId: bookingRef(),
      userId: req.user._id,
      userModel: req.user.constructor.modelName === 'FoodUser' ? 'FoodUser' : 'User',
      festivalId: festival._id,
      ticketCategoryId: category._id,
      ticketCategoryName: category.name,
      festivalName: festival.name,
      festivalDates: festival.dates,
      ticketCount: count,
      ...pricing,
      attendee: {
        name: attendee?.name || req.user.name || '',
        phone: attendee?.phone || req.user.phone || '',
        email: attendee?.email || req.user.email || '',
      },
      paymentMethod: 'razorpay',
    });

    res.status(201).json({
      success: true,
      message: 'Passes held. Complete payment to confirm.',
      booking,
      payable: pricing.totalAmount,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Create festival booking error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to book these passes' });
  }
};

/**
 * @route POST /v1/festivals/bookings/checkout
 *
 * A whole basket in one call: several categories, one payment.
 *
 * Each category still becomes its own booking — they are different
 * entitlements at the gate, each needs its own pass code, and each draws from
 * its own allocation — but they share an `orderGroupId`, so the group is
 * charged once and reads as one purchase in history.
 *
 * Seats are taken one category at a time. If a later one has sold out while
 * the basket sat on screen, every seat already taken for this basket is handed
 * straight back: a partial hold the buyer cannot pay for is worse than a clean
 * refusal, because those seats would sit unavailable until the hold expired.
 */
export const checkoutBasket = async (req, res) => {
  const taken = [];

  try {
    const { festivalId, items, attendee } = req.body;

    const requested = (Array.isArray(items) ? items : [])
      .map((i) => ({
        ticketCategoryId: i?.ticketCategoryId,
        count: Math.max(0, Number(i?.ticketCount) || 0),
      }))
      .filter((i) => i.ticketCategoryId && i.count > 0);

    if (!requested.length) {
      return res.status(400).json({ success: false, message: 'Select at least one pass' });
    }
    // The same category twice would take seats twice and bill twice.
    const unique = new Set(requested.map((i) => String(i.ticketCategoryId)));
    if (unique.size !== requested.length) {
      return res.status(400).json({ success: false, message: 'Each pass category can only appear once' });
    }

    // Validate everything before taking a single seat, so an obviously bad
    // basket never leaves a hold behind.
    // The id is checked for shape first: handing Mongo a malformed one throws a
    // CastError, which surfaced as a 500 rather than "not found".
    if (!mongoose.Types.ObjectId.isValid(festivalId)) {
      return res.status(404).json({ success: false, message: 'Festival not found' });
    }
    const festival = await Festival.findOne({ _id: festivalId, isActive: true });
    if (!festival) return res.status(404).json({ success: false, message: 'Festival not found' });

    const window = bookingWindow(festival);
    if (!window.isOpen) {
      return res.status(409).json({ success: false, message: window.reason });
    }

    const lines = [];
    for (const item of requested) {
      if (!mongoose.Types.ObjectId.isValid(item.ticketCategoryId)) {
        return res.status(404).json({ success: false, message: 'That pass is not available' });
      }
      const category = festival.ticketCategories.id(item.ticketCategoryId);
      if (!category || !category.isActive) {
        return res.status(404).json({ success: false, message: 'That pass is not available' });
      }
      if (item.count > category.maxPerBooking) {
        return res.status(400).json({
          success: false,
          message: `Up to ${category.maxPerBooking} ${category.name} passes per booking`,
        });
      }
      lines.push({ category, count: item.count, pricing: priceTickets(category, item.count) });
    }

    const orderGroupId = `FG-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    for (const line of lines) {
      const claimed = await claimSeats(festival._id, line.category._id, line.count);
      if (!claimed) {
        const remaining = await remainingIn(festival._id, line.category._id);
        // Hand back everything this basket has taken so far.
        for (const held of taken) {
          await releaseSeats(festival._id, held.categoryId, held.count);
        }
        return res.status(409).json({
          success: false,
          message: remaining === 0
            ? `${line.category.name} just sold out`
            : `Only ${remaining} ${line.category.name} passes left`,
          ticketCategoryId: line.category._id,
          remainingTickets: remaining,
        });
      }
      taken.push({ categoryId: line.category._id, count: line.count });
    }

    const who = {
      name: attendee?.name || req.user.name || '',
      phone: attendee?.phone || req.user.phone || '',
      email: attendee?.email || req.user.email || '',
    };

    const bookings = await FestivalBooking.insertMany(lines.map((line) => ({
      bookingId: bookingRef(),
      orderGroupId,
      userId: req.user._id,
      userModel: req.user.constructor.modelName === 'FoodUser' ? 'FoodUser' : 'User',
      festivalId: festival._id,
      ticketCategoryId: line.category._id,
      ticketCategoryName: line.category.name,
      festivalName: festival.name,
      festivalDates: festival.dates,
      ticketCount: line.count,
      ...line.pricing,
      attendee: who,
      paymentMethod: 'razorpay',
    })));

    const payable = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    res.status(201).json({
      success: true,
      message: 'Passes held. Complete payment to confirm.',
      orderGroupId,
      bookings,
      payable,
      totalTickets: bookings.reduce((sum, b) => sum + b.ticketCount, 0),
    });
  } catch (error) {
    // Anything unexpected after seats were taken must not keep them.
    for (const held of taken) {
      await releaseSeats(req.body?.festivalId, held.categoryId, held.count).catch(() => {});
    }
    console.error('Festival checkout error:', error);
    res.status(500).json({ success: false, message: 'Failed to hold these passes' });
  }
};

/**
 * @route POST /v1/festivals/bookings/checkout/:groupId/release
 *
 * Give a whole basket's seats back when the buyer walks away from the payment
 * window. Without this every abandoned checkout holds its seats indefinitely —
 * the seats read as unavailable to everyone else while nobody has paid for
 * them, and nothing expires them.
 *
 * Paid bookings in the group are left alone, so a partial failure cannot
 * cancel passes somebody already owns.
 */
export const releaseCheckout = async (req, res) => {
  try {
    const bookings = await FestivalBooking.find({
      orderGroupId: req.params.groupId,
      userId: req.user._id,
      paymentStatus: 'pending',
      bookingStatus: { $ne: 'cancelled' },
    });

    for (const booking of bookings) {
      await releaseSeats(booking.festivalId, booking.ticketCategoryId, booking.ticketCount);
      booking.bookingStatus = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancellationReason = 'Payment not completed';
      await booking.save();
    }

    res.json({ success: true, released: bookings.length });
  } catch (error) {
    console.error('Festival release checkout error:', error);
    res.status(500).json({ success: false, message: 'Could not release these passes' });
  }
};

/** Give the held passes back. Used on cancel and on abandoned payment. */
export const releaseHold = async (booking) => {
  await releaseSeats(booking.festivalId, booking.ticketCategoryId, booking.ticketCount);
};

/** Mark a booking paid and issue its QR. Shared by both payment paths. */
export const confirmBookingPayment = async (booking, { paymentId, paymentMethod } = {}) => {
  if (booking.paymentStatus === 'paid') {
    const error = new Error('This booking is already paid');
    error.statusCode = 400;
    throw error;
  }

  booking.paymentStatus = 'paid';
  booking.bookingStatus = 'confirmed';
  booking.amountPaid = booking.totalAmount;
  booking.paymentId = paymentId || booking.paymentId;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  // The gate pass only exists once the money does.
  booking.qrCode = booking.qrCode || issueQrCode();

  await booking.save();
  return booking;
};

/** @route GET /v1/festivals/bookings/my */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await FestivalBooking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('festivalId', 'name dates venue heroImage slug')
      .lean();
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get festival bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your passes' });
  }
};

/** @route POST /v1/festivals/bookings/:id/cancel */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await FestivalBooking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled' });
    }
    if (booking.bookingStatus === 'used') {
      return res.status(400).json({ success: false, message: 'This pass has already been used' });
    }

    booking.bookingStatus = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = String(req.body.reason || '').trim();
    await booking.save();

    // Whether it was paid or only held, the allocation goes back on sale.
    await releaseHold(booking);

    res.json({
      success: true,
      message: booking.paymentStatus === 'paid'
        ? 'Booking cancelled. A refund will be processed separately.'
        : 'Booking cancelled',
      booking,
    });
  } catch (error) {
    console.error('Cancel festival booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel this booking' });
  }
};

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/** @route GET /v1/festivals/admin/bookings */
export const getAdminBookings = async (req, res) => {
  try {
    const { festivalId, status } = req.query;
    const match = {};
    if (festivalId) match.festivalId = festivalId;
    if (status && status !== 'all') match.bookingStatus = status;

    const bookings = await FestivalBooking.find(match)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('festivalId', 'name dates')
      .populate('userId', 'name phone')
      .lean();

    res.json({ success: true, bookings, total: bookings.length });
  } catch (error) {
    console.error('Get admin festival bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

/**
 * @route GET /v1/festivals/admin/:id/bookings
 *
 * Everything an admin needs on one festival: what each category was configured
 * with, where those seats have gone, and every booking behind the numbers.
 *
 * Seat counts are derived from the bookings rather than read off `soldTickets`
 * alone. The counter is a single number that cannot say whether a seat is paid
 * for or merely held by an unpaid booking, and those are very different things
 * when an admin is deciding whether to release stock. `heldSeats` is the gap.
 *
 * Works for a festival that has already ended — that is exactly when someone
 * needs the attendee list.
 */
export const getFestivalBookingSummary = async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id).lean();
    if (!festival) return res.status(404).json({ success: false, message: 'Festival not found' });

    const { status } = req.query;
    const match = { festivalId: festival._id };
    if (status && status !== 'all') match.bookingStatus = status;

    const bookings = await FestivalBooking.find(match)
      .sort({ createdAt: -1 })
      .populate('userId', 'name phone email')
      .lean();

    // Counted over every booking, not the filtered view, so switching the
    // filter never changes the seat numbers.
    const all = status && status !== 'all'
      ? await FestivalBooking.find({ festivalId: festival._id }).select('ticketCategoryId ticketCount bookingStatus paymentStatus totalAmount').lean()
      : bookings;

    const byCategory = new Map();
    let paidSeats = 0;
    let heldSeats = 0;
    let revenue = 0;

    for (const booking of all) {
      const key = String(booking.ticketCategoryId);
      const row = byCategory.get(key) || { paid: 0, held: 0, cancelled: 0, revenue: 0 };

      if (booking.bookingStatus === 'cancelled') {
        row.cancelled += booking.ticketCount;
      } else if (booking.paymentStatus === 'paid') {
        row.paid += booking.ticketCount;
        row.revenue += booking.totalAmount || 0;
        paidSeats += booking.ticketCount;
        revenue += booking.totalAmount || 0;
      } else {
        // Booked but not paid — the seat is out of stock without being sold.
        row.held += booking.ticketCount;
        heldSeats += booking.ticketCount;
      }
      byCategory.set(key, row);
    }

    const categories = (festival.ticketCategories || []).map((c) => {
      const counts = byCategory.get(String(c._id)) || { paid: 0, held: 0, cancelled: 0, revenue: 0 };
      return {
        _id: c._id,
        name: c.name,
        price: c.price,
        isActive: c.isActive,
        maxPerBooking: c.maxPerBooking,
        configuredSeats: c.totalTickets || 0,
        // soldTickets is the counter the atomic take moves; the rest is what
        // the bookings say. They should agree, and a mismatch is worth seeing.
        bookedSeats: c.soldTickets || 0,
        paidSeats: counts.paid,
        heldSeats: counts.held,
        cancelledSeats: counts.cancelled,
        availableSeats: Math.max(0, (c.totalTickets || 0) - (c.soldTickets || 0)),
        revenue: counts.revenue,
      };
    });

    res.json({
      success: true,
      festival: {
        _id: festival._id,
        name: festival.name,
        dates: festival.dates,
        venue: festival.venue,
        startDate: festival.startDate,
        endDate: festival.endDate,
        heroImage: festival.heroImage,
        isActive: festival.isActive,
        status: festivalStatus(festival),
        bookingOpensAt: festival.bookingOpensAt,
        bookingClosesAt: festival.bookingClosesAt,
        bookingOpen: bookingWindow(festival).isOpen,
        bookingClosedReason: bookingWindow(festival).reason,
      },
      categories,
      totals: {
        configuredSeats: categories.reduce((n, c) => n + c.configuredSeats, 0),
        availableSeats: categories.reduce((n, c) => n + c.availableSeats, 0),
        paidSeats,
        heldSeats,
        revenue,
        bookings: all.length,
      },
      bookings,
    });
  } catch (error) {
    console.error('Festival booking summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to load this festival' });
  }
};

/**
 * @route POST /v1/festivals/admin/bookings/verify
 * Gate scan: look a pass up by its QR and mark it used, once.
 */
export const verifyPass = async (req, res) => {
  try {
    const qrCode = String(req.body.qrCode || '').trim().toUpperCase();
    if (!qrCode) return res.status(400).json({ success: false, message: 'Scan a pass first' });

    const booking = await FestivalBooking.findOne({ qrCode }).populate('festivalId', 'name dates venue');
    if (!booking) return res.status(404).json({ success: false, valid: false, message: 'No pass matches that code' });

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, valid: false, message: 'This pass was never paid for', booking });
    }
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ success: false, valid: false, message: 'This pass was cancelled', booking });
    }
    if (booking.bookingStatus === 'used') {
      return res.status(409).json({
        success: false,
        valid: false,
        message: `Already used on ${new Date(booking.usedAt).toLocaleString('en-IN')}`,
        booking,
      });
    }

    booking.bookingStatus = 'used';
    booking.usedAt = new Date();
    await booking.save();

    res.json({ success: true, valid: true, message: 'Pass accepted', booking });
  } catch (error) {
    console.error('Verify festival pass error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify this pass' });
  }
};

export default {
  getBookingQuote,
  createBooking,
  getMyBookings,
  cancelBooking,
  getAdminBookings,
  verifyPass,
  confirmBookingPayment,
  releaseHold,
};
