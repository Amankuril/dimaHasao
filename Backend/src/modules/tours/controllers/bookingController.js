/**
 * Tour bookings.
 *
 * Every amount here comes from services/pricing.js. The client sends who is
 * travelling and when — never a price. The quote endpoint exists so the booking
 * screen can *show* a total without computing one, which is what went wrong in
 * food where the charged amount and the verified amount disagreed.
 */
import mongoose from 'mongoose';
import TourPackage from '../models/TourPackage.js';
import TourBooking from '../models/TourBooking.js';
import TourOperator from '../models/TourOperator.js';
import ToursSettings from '../models/ToursSettings.js';
import { quoteBooking } from '../services/pricing.js';
import { publicPackageMatch } from '../services/package.service.js';
import { settleBookingAdvance } from '../services/settlement.service.js';
import { resolveOffer, claimOffer } from '../services/offer.service.js';
import { isRazorpayConfigured } from '../../../core/payments/razorpay.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight, so a date-only value means the same day everywhere. */
const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

/**
 * Everything that must be true before a package can be sold on a given date.
 * Returns a message, or null when the booking is allowed.
 */
const validateDeparture = (pkg, travelDate, travellers) => {
  const date = startOfDay(travelDate);
  if (Number.isNaN(date.getTime())) return 'A valid travel date is required';

  const earliest = startOfDay(Date.now() + (pkg.leadTimeDays || 0) * DAY_MS);
  if (date < earliest) {
    return pkg.leadTimeDays
      ? `This package needs to be booked at least ${pkg.leadTimeDays} day(s) in advance`
      : 'Travel date cannot be in the past';
  }

  if (travellers < pkg.groupSizeMin) {
    return `This package is for a minimum of ${pkg.groupSizeMin} traveller(s)`;
  }
  if (pkg.groupSizeMax && travellers > pkg.groupSizeMax) {
    return `This package takes at most ${pkg.groupSizeMax} traveller(s)`;
  }

  return null;
};

/** Load a sellable package, or throw a controller-friendly error. */
const loadSellablePackage = async (packageId) => {
  if (!mongoose.Types.ObjectId.isValid(packageId)) {
    const error = new Error('Package not found');
    error.statusCode = 404;
    throw error;
  }

  const pkg = await TourPackage.findOne(publicPackageMatch({ _id: packageId }));
  if (!pkg) {
    const error = new Error('Package not found or not available');
    error.statusCode = 404;
    throw error;
  }

  const operator = await TourOperator.findById(pkg.operatorId);
  if (!operator || operator.isBlocked || operator.operatorApprovalStatus !== 'approved') {
    const error = new Error('This package is not available right now');
    error.statusCode = 422;
    throw error;
  }

  return { pkg, operator };
};

/**
 * @route POST /v1/tours/bookings/quote
 * The prices the booking screen displays. No side effects.
 */
export const getBookingQuote = async (req, res) => {
  try {
    const { packageId, travelDate, adults, children, couponCode } = req.body;
    const { pkg } = await loadSellablePackage(packageId);

    const party = { adults: Number(adults) || 1, children: Number(children) || 0 };
    const totalTravellers = party.adults + party.children;

    if (travelDate) {
      const problem = validateDeparture(pkg, travelDate, totalTravellers);
      if (problem) return res.status(400).json({ success: false, message: problem });
    }

    const settings = await ToursSettings.getSettings();

    // Price once without the coupon to learn the fare the discount applies to,
    // then again with it. A coupon that cannot be used is reported, not thrown:
    // a bad code should fail to discount, never block the screen from pricing.
    const undiscounted = quoteBooking({ pkg, party, settings });
    const offer = await resolveOffer({
      code: couponCode,
      baseAmount: undiscounted.baseAmount,
      pkg,
      userId: req.user?._id,
    });
    const quote = offer.discount
      ? quoteBooking({ pkg, party, settings, discount: offer.discount })
      : undiscounted;

    res.json({
      success: true,
      coupon: { code: offer.code, discount: offer.discount, reason: offer.reason },
      quote: {
        pricePerPerson: quote.pricePerPerson,
        childPricePerPerson: quote.childPricePerPerson,
        adults: quote.adults,
        children: quote.children,
        baseAmount: quote.baseAmount,
        discount: quote.discount,
        taxRate: quote.taxRate,
        taxes: quote.taxes,
        totalAmount: quote.totalAmount,
        advancePercent: quote.advancePercent,
        advanceAmount: quote.advanceAmount,
        balanceDue: quote.balanceDue,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Quote error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to price this booking' });
  }
};

/**
 * @route POST /v1/tours/bookings
 * Creates the booking and settles the wallets. Payment integration lands on top
 * of this; `paymentMethod: 'pay_later'` records an unpaid booking.
 */
export const createBooking = async (req, res) => {
  try {
    const settings = await ToursSettings.getSettings();
    if (!settings.platformOpen) {
      return res.status(503).json({ success: false, message: settings.bookingDisabledMessage });
    }

    const {
      packageId, travelDate, adults, children,
      pickupPoint, travellerContact, specialRequest, paymentMethod, couponCode,
    } = req.body;

    const { pkg, operator } = await loadSellablePackage(packageId);

    const party = { adults: Number(adults) || 1, children: Number(children) || 0 };
    const totalTravellers = party.adults + party.children;

    const problem = validateDeparture(pkg, travelDate, totalTravellers);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const undiscounted = quoteBooking({ pkg, party, settings });

    // Here an unusable code is a hard error. Quietly charging the full fare
    // after the screen showed a discount is the payment mismatch this project
    // has already been bitten by — better to say why and let them book without it.
    const offer = await resolveOffer({
      code: couponCode,
      baseAmount: undiscounted.baseAmount,
      pkg,
      userId: req.user._id,
    });
    if (offer.reason) return res.status(400).json({ success: false, message: offer.reason });

    const quote = offer.discount
      ? quoteBooking({ pkg, party, settings, discount: offer.discount })
      : undiscounted;

    const booking = await TourBooking.create({
      bookingId: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userModel: req.user.constructor.modelName === 'FoodUser' ? 'FoodUser' : 'User',
      userId: req.user._id,
      packageId: pkg._id,
      operatorId: operator._id,
      travelDate: startOfDay(travelDate),
      travellers: { adults: quote.adults, children: quote.children },
      totalTravellers: quote.totalTravellers,
      pickupPoint: pickupPoint || pkg.pickupPoints?.[0] || '',
      travellerContact: {
        name: travellerContact?.name || req.user.name || '',
        phone: travellerContact?.phone || req.user.phone || '',
        email: travellerContact?.email || req.user.email || '',
      },
      specialRequest: specialRequest || '',
      pricePerPerson: quote.pricePerPerson,
      childPricePerPerson: quote.childPricePerPerson,
      baseAmount: quote.baseAmount,
      discount: quote.discount,
      couponCode: offer.code || undefined,
      taxRate: quote.taxRate,
      taxes: quote.taxes,
      totalAmount: quote.totalAmount,
      advancePercent: quote.advancePercent,
      advanceAmount: quote.advanceAmount,
      balanceDue: quote.balanceDue,
      adminCommission: quote.adminCommission,
      operatorPayout: quote.operatorPayout,
      paymentMethod: paymentMethod || 'online',
      createdBy: 'user',
    });

    // Counted only now, so browsing a quote never burns a redemption.
    await claimOffer(offer.code);

    res.status(201).json({
      success: true,
      message: 'Booking created. Complete the advance payment to confirm.',
      booking,
      payable: quote.advanceAmount,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Create booking error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to create booking' });
  }
};

/**
 * @route POST /v1/tours/bookings/:id/settle
 *
 * The no-gateway path. Only reachable while Razorpay is unconfigured — with
 * keys present, a booking can only be confirmed through /verify with a valid
 * signature, so this can never become a way to confirm a trip without paying.
 *
 * Scoped to the caller's own booking. It moves money, so resolving it by id
 * alone would let any signed-in user settle a stranger's booking.
 */
export const settleAdvance = async (req, res) => {
  try {
    if (isRazorpayConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Complete the payment through the gateway to confirm this booking.',
      });
    }

    const booking = await TourBooking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const settled = await settleBookingAdvance(booking, {
      paymentId: req.body.paymentId,
      paymentMethod: 'dev_no_gateway',
    });

    res.json({
      success: true,
      message: 'Advance settled',
      booking: settled.booking,
      movement: settled.movement,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Settle advance error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to settle this booking' });
  }
};

/**
 * @route PATCH /v1/tours/bookings/:id/collect-balance
 * Records that the operator took the remaining cash from the traveller.
 *
 * This moves NO money. The platform already took its full cut out of the
 * advance (or booked the shortfall as a wallet debit), and the balance went
 * straight from traveller to operator. Adding a wallet credit here would pay
 * the operator twice.
 */
export const collectBalance = async (req, res) => {
  try {
    const booking = await TourBooking.findOne({ _id: req.params.id, operatorId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.paymentStatus !== 'advance_paid') {
      return res.status(400).json({ success: false, message: 'This booking has no balance outstanding' });
    }

    booking.amountPaid = booking.totalAmount;
    booking.paymentStatus = 'paid';
    booking.balanceCollectedAt = new Date();
    await booking.save();

    res.json({ success: true, message: 'Balance marked as collected', booking });
  } catch (error) {
    console.error('Collect balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this booking' });
  }
};

/** @route GET /v1/tours/bookings/my */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await TourBooking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('packageId', 'title heroImage durationDays durationNights slug')
      .populate('operatorId', 'name agencyName phone')
      .lean();
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your bookings' });
  }
};

/** @route GET /v1/tours/bookings/operator */
export const getOperatorBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { operatorId: req.user._id };
    if (status && status !== 'all') query.bookingStatus = status;

    const bookings = await TourBooking.find(query)
      .sort({ travelDate: 1 })
      .populate('packageId', 'title heroImage')
      .lean();
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get operator bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

/** @route PATCH /v1/tours/bookings/:id/status — operator moves a trip along. */
export const updateBookingStatus = async (req, res) => {
  const ALLOWED = {
    confirmed: ['ongoing', 'cancelled', 'no_show'],
    ongoing: ['completed'],
    pending: ['cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  try {
    const booking = await TourBooking.findOne({ _id: req.params.id, operatorId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { status, reason } = req.body;
    if (!(ALLOWED[booking.bookingStatus] || []).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move a ${booking.bookingStatus} booking to ${status}.`,
      });
    }

    booking.bookingStatus = status;
    if (status === 'cancelled') {
      booking.cancellationReason = reason || 'Cancelled by operator';
      booking.cancelledAt = new Date();
    }
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this booking' });
  }
};
