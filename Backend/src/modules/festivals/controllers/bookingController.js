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
import Festival from '../models/Festival.js';
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

    const { category } = await loadCategory(festivalId, ticketCategoryId);

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
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival quote error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to price these passes' });
  }
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

    if (count > category.maxPerBooking) {
      return res.status(400).json({
        success: false,
        message: `Up to ${category.maxPerBooking} passes per booking`,
      });
    }

    const pricing = priceTickets(category, count);

    // The seat take and the availability check are one operation: the update
    // only matches while enough passes remain.
    const claimed = await Festival.findOneAndUpdate(
      {
        _id: festival._id,
        isActive: true,
        ticketCategories: { $elemMatch: { _id: category._id, isActive: true } },
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
                        cond: { $eq: ['$$c._id', category._id] },
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
      { new: true, arrayFilters: [{ 'cat._id': category._id }] },
    );

    if (!claimed) {
      const fresh = await Festival.findById(festival._id).lean();
      const current = fresh?.ticketCategories?.find((c) => String(c._id) === String(category._id));
      const remaining = current ? Math.max(0, current.totalTickets - current.soldTickets) : 0;
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

/** Give the held passes back. Used on cancel and on abandoned payment. */
export const releaseHold = async (booking) => {
  await Festival.updateOne(
    { _id: booking.festivalId },
    { $inc: { 'ticketCategories.$[cat].soldTickets': -booking.ticketCount } },
    { arrayFilters: [{ 'cat._id': booking.ticketCategoryId }] },
  );
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
