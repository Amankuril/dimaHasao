import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { quoteStay, claimAvailability, releaseAvailability } from '../services/bookingPricing.service.js';
import { buildInvoice } from '../services/invoiceService.js';
import { istCalendarDay } from '../utils/nightlyPricing.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
// The shared client, not the razorpay package: this file called
// getRazorpayClient() without importing it, so every online booking died with
// a ReferenceError and returned "Failed to initiate payment gateway". The same
// miss was already fixed in walletController and paymentController.
import { getRazorpayClient, getRazorpayKeyId } from '../../../core/payments/razorpay.service.js';
import PaymentConfig from '../config/payment.config.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
// Used by the partner booking alert below. Its absence meant every one of those
// alerts died as a ReferenceError inside the surrounding catch — the same miss
// as getRazorpayClient in this file.
import smsService from '../utils/smsService.js';
import notificationService from '../services/notificationService.js';
import referralService from '../services/referralService.js';
import User from '../models/User.js';
import { findPlatformAdmin } from '../models/Admin.js';

// Helper: Trigger Notifications
const triggerBookingNotifications = async (booking) => {
  try {
    const fullBooking = await Booking.findById(booking._id)
      .populate('userId')
      .populate('propertyId');

    if (!fullBooking) return;

    const user = fullBooking.userId;
    const property = fullBooking.propertyId;

    // 1. User Email
    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user, fullBooking).catch(err => console.error('Email trigger failed:', err));
    }

    // 2. User Push
    if (user) {
      notificationService.sendToUser(user._id, {
        title: 'Booking Confirmed!',
        body: `You are going to ${property ? property.propertyName : 'Hotel'}.`
      }, { type: 'booking', bookingId: fullBooking._id }, 'user').catch(err => console.error('User Push failed:', err));
    }

    // 3. Partner Notifications
    if (property && property.partnerId) {
      // Push
      notificationService.sendToUser(property.partnerId, {
        title: 'New Booking Alert!',
        body: `${fullBooking.totalNights} Night, ${fullBooking.guests.adults} Guests. Check App.`
      }, { type: 'new_booking', bookingId: fullBooking._id }, 'partner').catch(err => console.error('Partner Push failed:', err));

      // SMS
      // Need to find Partner Phone. Property has partnerId, need to fetch Partner User.
      try {
        const Partner = (await import('../models/Partner.js')).default;
        const partner = await Partner.findById(property.partnerId);
        if (partner && partner.phone) {
          smsService.sendSMS(partner.phone, `New Booking Alert! ${fullBooking.totalNights} Night, ${fullBooking.guests.adults} Guests. Check App.`)
            .catch(e => console.error('Partner SMS failed:', e));
        }
      } catch (smsErr) {
        console.error('Partner SMS Lookup Error:', smsErr);
      }
    }

  } catch (err) {
    console.error('Trigger Notification Error:', err);
  }
};

/**
 * @route POST /api/v1/hotel/bookings/quote
 *
 * What the stay costs, with no side effects. The booking screen displays this
 * rather than deriving its own total — the previous screen invented a 12% GST
 * and a flat ₹99 service fee the server never charged.
 */
export const getBookingQuote = async (req, res) => {
  try {
    const { propertyId, roomTypeId, checkInDate, checkOutDate, guests, couponCode } = req.body;

    if (!propertyId || !roomTypeId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    const settings = await PlatformSettings.getSettings();
    const quote = await quoteStay({
      property,
      roomType,
      checkInDate,
      checkOutDate,
      guests: guests || {},
      couponCode,
      userId: req.user._id,
      settings,
    });

    res.json({
      success: true,
      quote: {
        totalNights: quote.totalNights,
        rooms: quote.units,
        pricePerNight: quote.pricePerNight,
        baseAmount: quote.baseAmount,
        nightlyBreakdown: quote.nightlyBreakdown,
        extraCharges: quote.extraCharges,
        grossAmount: quote.grossAmount,
        taxRate: quote.gstRate,
        taxes: quote.taxes,
        discount: quote.discount,
        couponCode: quote.couponCode,
        couponMessage: quote.couponMessage,
        totalAmount: quote.totalAmount,
        availableUnits: quote.availableUnits,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Hotel quote error:', error);
    res.status(status).json({ message: error.message || 'Failed to price this stay' });
  }
};

export const createBooking = async (req, res) => {
  /*
   * Inventory and wallet money taken by this request before the booking is
   * saved. Every early return and every throw after the claim must give them
   * back: an "Insufficient wallet balance" or a gateway failure used to leave
   * the room held forever by a booking that was never written.
   */
  let heldLedgerId = null;
  let debitedUserWallet = null;
  let debitedAmount = 0;
  let bookingSaved = false;
  const rollback = async (bookingRef) => {
    if (bookingSaved) return;
    if (heldLedgerId) {
      await AvailabilityLedger.deleteOne({ _id: heldLedgerId }).catch((e) => console.error('Release held inventory failed:', e.message));
      heldLedgerId = null;
    }
    if (debitedUserWallet && debitedAmount > 0) {
      await debitedUserWallet
        .credit(debitedAmount, `Reversal of unfinished booking #${bookingRef}`, bookingRef, 'refund')
        .catch((e) => console.error('Wallet reversal for unfinished booking failed:', e.message));
      debitedUserWallet = null;
    }
  };

  try {
    const {
      propertyId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guests,
      paymentMethod,
      bookingUnit,
      couponCode,
      useWallet,
      walletDeduction
    } = req.body;

    // Whitelisted so an unrecognised method cannot slip past the settlement
    // branches below and leave a booking in an undefined payment state.
    const ALLOWED_PAYMENT_METHODS = ['razorpay', 'online', 'wallet', 'pay_at_hotel'];
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Unsupported payment method. Use one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    // Fetch Property
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (!roomTypeId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    const roomType = roomTypeId ? await RoomType.findById(roomTypeId) : null;
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    // --- CONTINUE STANDARD BOOKING FLOW ---
    // Fetch Settings
    const settings = await PlatformSettings.getSettings();

    // Every figure below comes from one implementation, shared with the quote
    // endpoint so the price shown and the price charged cannot drift apart.
    const quote = await quoteStay({
      property,
      roomType,
      checkInDate,
      checkOutDate,
      guests,
      couponCode,
      userId: req.user._id,
      settings,
    });

    const {
      totalNights, units, pricePerNight, baseAmount, nightlyBreakdown,
      extraAdultPrice, extraChildPrice, extraCharges, grossAmount,
      taxes, totalAmount, adminCommission, partnerPayout,
    } = quote;
    const discountAmount = quote.discount;
    const appliedCoupon = quote.couponCode;

    /*
     * Take the inventory before writing the booking.
     *
     * Nothing here consumed inventory before: the quote reported availableUnits
     * and the booking ignored it, so the room type's capacity was never
     * enforced at all. Claim first, and if it fails nothing is written.
     */
    const claim = await claimAvailability({
      propertyId: property._id,
      roomTypeId: roomType._id,
      // quoteStay returns totals, not the parsed dates, so parse them here.
      checkIn: new Date(checkInDate),
      checkOut: new Date(checkOutDate),
      // The rooms the quote priced. This claimed 1 and a second ledger row for
      // `units` was written after save, so every booking consumed units + 1.
      units,
      roomType,
    });

    if (!claim.ok) {
      return res.status(409).json({
        message: claim.availableUnits > 0
          ? `Only ${claim.availableUnits} of these rooms are left for those dates`
          : 'Those dates are fully booked for this room type',
        availableUnits: claim.availableUnits,
        totalInventory: claim.totalInventory,
      });
    }
    heldLedgerId = claim.ledgerId;

    const bookingId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    /*
     * Which model the booking's `userId` points at.
     *
     * Hotel's User is a shim over the platform's FoodUser, so a consumer now
     * reports its model name as 'FoodUser' — a value this schema's enum does
     * not allow, which failed every booking with a validation error. Both names
     * are registered against the same `users` collection (see
     * core/users/user.model.js), so a consumer is recorded as 'User', which is
     * what the enum and every existing booking already use.
     */
    const userModel = req.user.constructor.modelName === 'Partner' ? 'Partner' : 'User';

    // Create Booking Object
    const booking = new Booking({
      bookingId,
      userModel,
      userId: req.user._id,
      propertyId,
      propertyType: property.propertyType.toLowerCase(),
      roomTypeId,
      bookingUnit: bookingUnit || 'room',
      checkInDate,
      checkOutDate,
      totalNights,
      guests: {
        adults: guests.adults || 1,
        children: guests.children || 0
      },
      pricePerNight,
      baseAmount,
      nightlyBreakdown,
      extraAdultPrice,
      extraChildPrice,
      extraCharges,
      taxes,
      adminCommission,
      partnerPayout,
      discount: discountAmount,
      couponCode: appliedCoupon,
      totalAmount,
      paymentMethod,
      bookingStatus: 'confirmed', // Razorpay drops this to pending below
      // Defaults to unpaid. Only an explicit settlement path — a wallet debit,
      // or a verified gateway payment — may mark this paid. It used to default
      // to 'paid' for every method except pay_at_hotel, so a booking sent with
      // paymentMethod 'upi' was created fully paid with no money taken.
      paymentStatus: 'pending'
    });

    /*
     * How much of the bill the guest's wallet covers.
     *
     * Paying by wallet always takes the whole total. A part-payment must be a
     * real amount no larger than the bill: `walletDeduction` is client input,
     * and a token 1 used to settle a 'wallet' booking of any size, while a
     * negative or overlong value distorted what the gateway was asked for.
     */
    let walletAmount = 0;
    if (paymentMethod === 'wallet') {
      walletAmount = totalAmount;
    } else if (useWallet && walletDeduction !== undefined && walletDeduction !== null && ['online', 'razorpay'].includes(paymentMethod)) {
      const requested = Number(walletDeduction);
      if (!Number.isFinite(requested) || requested <= 0 || requested > totalAmount) {
        await rollback(bookingId);
        return res.status(400).json({ message: 'Invalid wallet amount for this booking' });
      }
      walletAmount = requested;
    }
    const gatewayAmount = totalAmount - walletAmount;

    // Handle Wallet Payment (Partial or Full)
    if (walletAmount > 0) {
      const wallet = await Wallet.findOne({ partnerId: req.user._id, role: 'user' });
      if (!wallet) {
        await rollback(bookingId);
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      // The model's debit refuses an overdraft atomically, so a concurrent
      // spend cannot slip between a balance check and the debit.
      try {
        await wallet.debit(walletAmount, `Booking #${bookingId}`, bookingId, 'booking');
      } catch (err) {
        await rollback(bookingId);
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      debitedUserWallet = wallet;
      debitedAmount = walletAmount;

      if (gatewayAmount <= 0) {
        booking.paymentStatus = 'paid';

        // --- DISTRIBUTE TO PARTNER & ADMIN (Immediate Settlement for Wallet Payment) ---

        // 1. Credit Partner
        if (partnerPayout > 0 && property.partnerId) {
          let partnerWallet = await Wallet.findOne({ partnerId: property.partnerId, role: 'partner' });
          if (!partnerWallet) {
            // Auto-create if missing (Safe-guard)
            partnerWallet = await Wallet.create({
              partnerId: property.partnerId,
              role: 'partner',
              balance: 0
            });
          }

          await partnerWallet.credit(partnerPayout, `Payment for Booking #${bookingId}`, bookingId, 'booking_payment');

          // NOTIFICATION: Wallet Credit
          notificationService.sendToUser(property.partnerId, {
            title: 'Wallet Credited',
            body: `Wallet Credited: ₹${partnerPayout} for Booking #${bookingId}`
          }, { type: 'wallet_credit', bookingId: booking._id }, 'partner').catch(e => console.error(e));
        }

        // 2. Credit Admin (Commission + Tax)
        const totalAdminCredit = (adminCommission || 0) + (taxes || 0);
        if (totalAdminCredit > 0) {
          // Find Admin Wallet (assuming single admin wallet or specific logic)
          let adminWallet = await Wallet.findOne({ role: 'admin' });

          // If no admin wallet exists, we might need to find an admin user to create one
          if (!adminWallet) {
            // Looked for an admin among hotel *users* before, whose role is
            // 'user' — so it never matched, the admin wallet was never created,
            // and commission + tax went uncredited. The admin lives in the
            // platform admin collection.
            const adminUser = await findPlatformAdmin();
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(totalAdminCredit, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        }

        // REFERRAL: Trigger Referral Reward (Immediate Wallet Payment)
        referralService.processBookingCompletion(req.user._id, booking._id).catch(e => console.error('Referral Trigger Error (Wallet):', e));
      }
    }

    // Handle Online Payment (Razorpay)
    //
    // A booking is only ever marked paid here by money this server took (the
    // wallet above) or, later, by a verified gateway payment. There used to be
    // a branch that trusted `paymentDetails.paymentId` from the request body
    // as proof of payment, so any string confirmed the stay as paid.
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay' || paymentMethod === 'online') {
      if (gatewayAmount > 0) {
        try {
          // Shared client — see core/payments/razorpay.service.js
          const instance = getRazorpayClient();
          if (!instance) throw new Error('Razorpay is not configured');

          const options = {
            amount: Math.round(gatewayAmount * 100), // amount in paisa
            currency: PaymentConfig.currency || "INR",
            receipt: bookingId,
            notes: {
              bookingId: booking._id.toString(),
              userId: req.user._id.toString(),
              propertyId: propertyId.toString(),
              roomTypeId: roomTypeId.toString(),
              bookingUnit: (bookingUnit || 'room').toString(),
              rooms: units.toString(), // Pass rooms count for ledger
              // Store financial info for verification consistency
              adminCommission: adminCommission.toString(),
              partnerPayout: partnerPayout.toString(),
              taxes: taxes.toString(),
              discount: discountAmount.toString(),
              totalAmount: totalAmount.toString(),
              walletUsedAmount: walletAmount.toString(),
              type: 'booking_init'
            }
          };

          razorpayOrder = await instance.orders.create(options);

          // Set status to awaiting_payment so it doesn't show in user's list until paid
          booking.bookingStatus = 'awaiting_payment';
          booking.paymentStatus = 'pending';
        } catch (error) {
          console.error("Razorpay Order Creation Failed:", error);
          await rollback(bookingId);
          return res.status(500).json({ message: "Failed to initiate payment gateway" });
        }
      } else {
        // Fully paid by wallet above.
        booking.paymentStatus = 'paid';
        booking.bookingStatus = 'confirmed';
      }
    }

    // Handle Pay at Hotel (Partner Deduction)
    if (paymentMethod === 'pay_at_hotel') {
      const deductionAmount = (taxes || 0) + (adminCommission || 0);

      if (deductionAmount > 0 && property.partnerId) {
        // 1. Debit Partner
        let partnerWallet = await Wallet.findOne({ partnerId: property.partnerId, role: 'partner' });
        if (!partnerWallet) {
          partnerWallet = await Wallet.create({
            partnerId: property.partnerId,
            role: 'partner',
            balance: 0
          });
        }

        // Check balance (Optional: enforce positive balance?)
        // We will proceed with debit, which might throw if insufficient balance 
        // depending on Wallet implementation. 
        // If we want to allow overdraft, we should check Wallet.js.
        // Assuming standard debit for now.
        try {
          await partnerWallet.debit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_deduction');

          // 2. Credit Admin
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            // Looked for an admin among hotel *users* before, whose role is
            // 'user' — so it never matched, the admin wallet was never created,
            // and commission + tax went uncredited. The admin lives in the
            // platform admin collection.
            const adminUser = await findPlatformAdmin();
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        } catch (err) {
          console.error("Pay at Hotel Wallet Deduction Failed:", err.message);
          // Optionally: revert booking? Or just log? 
          // For now, we log.
        }
      }
    }

    await booking.save();
    bookingSaved = true;

    // Point the inventory claim at the booking now that it has an id, so the
    // existing cancellation cleanup (which deletes by referenceId) releases it.
    // That claim is the booking's only inventory row — a second one used to be
    // created here, double-counting every booking against the room type.
    if (claim.ledgerId) {
      await AvailabilityLedger.updateOne({ _id: claim.ledgerId }, { $set: { referenceId: booking._id } });
    }

    // Increment Offer Usage if applied and confirmed
    if (appliedCoupon && booking.bookingStatus === 'confirmed') {
      await Offer.findOneAndUpdate({ code: appliedCoupon }, { $inc: { usageCount: 1 } });
    }

    // Trigger Notifications (only if confirmed)
    if (booking.bookingStatus === 'confirmed') {
      triggerBookingNotifications(booking);
    }

    // Populate booking details for frontend confirmation page
    const populatedBooking = await Booking.findById(booking._id)
      .populate('propertyId')
      .populate('roomTypeId');

    res.status(201).json({
      success: true,
      booking: populatedBooking,
      paymentRequired: !!razorpayOrder,
      order: razorpayOrder,
      key: getRazorpayKeyId() || PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    // quoteStay raises the "no rooms left" / "bad dates" cases with a
    // statusCode. Those used to be inline 400s and must stay 400s, or the guest
    // sees "Server error" when they simply asked for more rooms than exist.
    await rollback('unsaved');
    const status = error.statusCode || 500;
    if (status === 500) console.error('Create Booking Error:', error);
    res.status(status).json({ message: error.message || 'Server error creating booking' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'upcoming', 'ongoing', 'completed', 'cancelled'
    const query = { userId: req.user._id };

    if (type === 'upcoming') {
      // Upcoming: Confirmed. NOT checked-in.
      // Hiding 'pending'/'awaiting_payment' to ensure only finalized bookings appear
      query.bookingStatus = { $in: ['confirmed'] };
    } else if (type === 'ongoing') {
      // Ongoing: Checked In
      query.bookingStatus = 'checked_in';
    } else if (type === 'completed') {
      // Completed: Checked Out (and legacy completed)
      query.bookingStatus = { $in: ['completed', 'checked_out'] };
    } else if (type === 'cancelled') {
      // Cancelled, No Show, Rejected
      query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
    }

    const bookings = await Booking.find(query)
      .populate('propertyId', 'propertyName address location coverImage avgRating')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (e) {
    console.error('Get My Bookings Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('roomTypeId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow User (Owner) or Admin/Partner (if needed, but separate endpoints exist usually)
    // For this specific 'user' endpoint, strictly check ownership
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (e) {
    console.error('Get Booking Detail Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerBookings = async (req, res) => {
  try {
    // 1. Find all properties owned by this partner
    const properties = await Property.find({ partnerId: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // 2. Find bookings for these properties
    const { status } = req.query;
    const query = { propertyId: { $in: propertyIds } };

    if (status) {
      if (status === 'upcoming') {
        query.bookingStatus = 'confirmed';
      } else if (status === 'in_house') {
        query.bookingStatus = 'checked_in';
      } else if (status === 'completed') {
        query.bookingStatus = { $in: ['completed', 'checked_out'] };
      } else if (status === 'cancelled') {
        query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
      } else {
        // Direct status match fallback
        query.bookingStatus = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName address location coverImage')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get Partner Bookings Error:', error);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

export const getPartnerBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('propertyId') // Need full property for partnerId check
      .populate('roomTypeId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership
    // Ensure propertyId is populated and has partnerId
    if (!booking.propertyId || !booking.propertyId.partnerId) {
      // Fallback or error if data consistency issue
      return res.status(403).json({ message: 'Booking data invalid (property link missing)' });
    }

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get Partner Booking Detail Error:', error);
    res.status(500).json({ message: 'Server error fetching booking details' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('propertyId', 'partnerId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    /*
     * Who may cancel this stay.
     *
     * The ownership test was here but its rejection was commented out, so the
     * check ran and then did nothing: any signed-in user could cancel anyone
     * else's booking by id, which released the room, moved commission between
     * the partner and admin wallets, and sent the guest a cancellation.
     *
     * Three parties have a legitimate reason: the guest who booked it, the
     * partner whose property it is, and an admin.
     */
    const callerId = String(req.user._id);
    const role = String(req.user.role || '').toLowerCase();
    const isGuest = String(booking.userId) === callerId;
    const isPartner = role === 'partner' && String(booking.propertyId?.partnerId || '') === callerId;
    const isAdmin = ['admin', 'superadmin'].includes(role);

    if (!isGuest && !isPartner && !isAdmin) {
      // 404 rather than 403: confirming the id exists tells an outsider that
      // somebody's booking is there to attack.
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    /*
     * Claim the cancellation atomically, and only before the stay starts.
     *
     * This was read-then-save and only refused 'cancelled', so a checked-out
     * or completed stay could still be cancelled for a full refund, and two
     * concurrent cancels both passed the check and both refunded. The status
     * precondition makes exactly one request win.
     */
    const CANCELLABLE = ['pending', 'awaiting_payment', 'confirmed'];
    if (!CANCELLABLE.includes(booking.bookingStatus)) {
      return res.status(400).json({ message: `A ${booking.bookingStatus.replace(/_/g, ' ')} booking cannot be cancelled` });
    }
    const wasPaid = booking.paymentStatus === 'paid';
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, bookingStatus: { $in: CANCELLABLE } },
      { $set: { bookingStatus: 'cancelled', cancellationReason: req.body.reason || 'User cancelled', cancelledAt: new Date() } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ message: 'Booking was already cancelled or has changed state' });
    }
    booking.set({ bookingStatus: claimed.bookingStatus, cancellationReason: claimed.cancellationReason, cancelledAt: claimed.cancelledAt });
    booking.unmarkModified('bookingStatus');
    booking.unmarkModified('cancellationReason');
    booking.unmarkModified('cancelledAt');

    // --- WALLET REVERSAL LOGIC ---
    // Pay at Hotel: Reverse Commission Deduction (Refund Partner, Debit Admin)
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      // Fetch full booking for partnerId
      const fullBooking = await Booking.findById(booking._id).populate('propertyId').populate('userId');

      if (refundAmount > 0 && fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner (Refund)
          await partnerWallet.credit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin (Refund)
          await adminWallet.debit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }

      // Release Inventory
      await AvailabilityLedger.deleteMany({ referenceId: booking._id });

      // Trigger Cancellation Notifications
      if (fullBooking) {
        if (fullBooking.userId && fullBooking.userId.email) {
          emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, 0)
            .catch(e => console.error('Cancel Email failed', e));
        }

        if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
          notificationService.sendToUser(fullBooking.propertyId.partnerId, {
            title: 'Booking Cancelled',
            body: `Booking #${fullBooking.bookingId} Cancelled by User. Inventory released.`
          }, { type: 'booking_cancelled', bookingId: booking._id }, 'partner').catch(e => console.error('Cancel Push failed', e));
        }
      }

      return res.json({ success: true, message: 'Booking cancelled successfully (Pay at Hotel - Commission Refunded)', booking });
    }

    // 1. Refund User (If paid)
    if (wasPaid) {
      // A Razorpay-paid booking only had its commission reversed here — the
      // guest's money never actually came back, because nothing called the
      // real refund (POST /api/payments/refund/:bookingId, processRefund in
      // paymentController.js). Wallet-credit refunds are only correct when
      // the booking was paid FROM the wallet in the first place, since then
      // the money never left the platform.
      const isGatewayPayment = ['razorpay', 'online'].includes(String(booking.paymentMethod || '').toLowerCase())
        && booking.paymentId;

      let refundedViaGateway = false;
      if (isGatewayPayment) {
        try {
          const instance = getRazorpayClient();
          // No amount: Razorpay refunds what was actually captured. Sending
          // totalAmount failed whenever less was charged (wallet part-payment,
          // the test-key cap) and fell through to crediting the full total.
          await instance.payments.refund(booking.paymentId, {
            notes: { reason: booking.cancellationReason, bookingId: booking._id.toString() },
          });
          await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: 'refunded' } });
          booking.paymentStatus = 'refunded';
          booking.unmarkModified('paymentStatus');
          refundedViaGateway = true;
        } catch (err) {
          console.error('Razorpay refund failed during booking cancellation:', err.message);
        }
      }

      if (!refundedViaGateway) {
        let userWallet = await Wallet.findOne({ partnerId: booking.userId, role: 'user' });

        // Auto-create wallet if it doesn't exist
        if (!userWallet) {
          userWallet = await Wallet.create({
            partnerId: booking.userId,
            role: 'user',
            balance: 0
          });
        }

        await userWallet.credit(booking.totalAmount, `Refund for Booking #${booking.bookingId}`, booking.bookingId, 'refund');
      }
    }

    // 2. Deduct Partner (If payout was credited)
    // We assume payout is credited on 'confirmed'/'paid'. 
    // Check if Partner Payout > 0
    // wasPaid, not the live status: a gateway refund above has already moved
    // it to 'refunded', which skipped both reversals and left the partner and
    // admin holding money the guest got back.
    if (booking.partnerPayout > 0 && wasPaid) {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        if (partnerWallet) {
          try {
            await partnerWallet.debit(
              booking.partnerPayout,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Partner Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // 3. Deduct Admin (Commission + Tax)
    if (wasPaid) {
      const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
      if (adminDeduction > 0) {
        const adminWallet = await Wallet.findOne({ role: 'admin' });
        if (adminWallet) {
          try {
            await adminWallet.debit(
              adminDeduction,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Admin Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // Trigger Cancellation Notifications
    const fullBooking = await Booking.findById(booking._id).populate('userId').populate('propertyId');
    if (fullBooking) {
      if (fullBooking.userId && fullBooking.userId.email) {
        emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, booking.paymentStatus === 'paid' ? booking.totalAmount : 0)
          .catch(e => console.error('Cancel Email failed', e));
      }

      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        notificationService.sendToUser(fullBooking.propertyId.partnerId, {
          title: 'Booking Cancelled',
          body: `Booking #${fullBooking.bookingId} Cancelled by User. Inventory released.`
        }, { type: 'booking_cancelled', bookingId: booking._id }, 'partner').catch(e => console.error('Cancel Push failed', e));
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (e) {
    console.error('Cancel Booking Error:', e);
    res.status(500).json({ message: e.message });
  }
};

// Mark Booking as Paid (Pay at Hotel)
export const markBookingAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as paid.', booking });
    }

    // Update Status
    booking.paymentStatus = 'paid';
    await booking.save();

    // Trigger Notification
    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Payment Received',
        body: `Your payment for booking #${booking.bookingId} has been confirmed by the hotel.`
      }, { type: 'payment_received', bookingId: booking._id }, 'user').catch(console.error);
    }

    // REFERRAL: Trigger Referral Reward (Pay At Hotel Marked Paid)
    if (booking.userId) {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error (PayAtHotel):', e));
    }

    res.json({ success: true, message: 'Marked as Paid', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Mark as No Show
export const markBookingNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'no_show') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as No Show.', booking });
    }

    /*
     * Only a confirmed stay whose check-in day has arrived can be a no-show,
     * and only once.
     *
     * This was read-then-save with no status rule, so a cancelled, checked-out
     * or not-yet-due booking could be marked too, and two concurrent requests
     * (or a re-mark after a status flip) each ran the commission reversal
     * below again. The conditional update lets exactly one request through.
     */
    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Only a confirmed booking can be marked as No Show.' });
    }
    if (istCalendarDay(new Date()) < istCalendarDay(booking.checkInDate)) {
      return res.status(400).json({ message: 'A booking can only be marked as No Show from its check-in date.' });
    }
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, bookingStatus: 'confirmed' },
      { $set: { bookingStatus: 'no_show' } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ message: 'Booking has changed state. Please refresh.' });
    }
    booking.bookingStatus = 'no_show';
    booking.unmarkModified('bookingStatus');

    // REVERSE DEDUCTION (Pay At Hotel)
    // "partner ke wallet se tax and fees plus admin commission deduct hua h voh uske wallet me vps se credit ho jayega"
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      if (refundAmount > 0 && booking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner
          await partnerWallet.credit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin
          await adminWallet.debit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }
    }
    // HANDLE PAY NOW / ONLINE / WALLET (Partner Earning Deducted -> Admin Credit)
    else if (['online', 'razorpay', 'wallet'].includes(booking.paymentMethod) && booking.paymentStatus === 'paid') {
      const deductionAmount = booking.partnerPayout || 0;

      if (deductionAmount > 0 && booking.propertyId.partnerId) {
        let partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });

        // Ensure Admin Wallet
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          // Looked for an admin among hotel *users* before, whose role is
          // 'user' — so it never matched, the admin wallet was never
          // created, and commission + tax went uncredited.
          const adminUser = await findPlatformAdmin();
          if (adminUser) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }
        }

        if (partnerWallet && adminWallet) {
          try {
            // Debit Partner (Earning Reversal/Penalty)
            await partnerWallet.debit(deductionAmount, `No Show Penalty for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_penalty');

            // Credit Admin (Funds retained by platform)
            await adminWallet.credit(deductionAmount, `No Show Credit (from Partner) for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_credit');

          } catch (err) {
            console.error("No Show Wallet Deduction Failed (Pay Now):", err.message);
          }
        }
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    res.json({ success: true, message: 'Marked as No Show. Inventory released and commission refunded.', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Check-In Booking
export const markCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Booking must be confirmed to check in.' });
    }

    booking.bookingStatus = 'checked_in';
    await booking.save();

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked In Successfully',
        body: 'Welcome! Enjoy your stay.'
      }, { type: 'check_in', bookingId: booking._id }, 'user').catch(console.error);
    }

    res.json({ success: true, message: 'Checked In Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check-Out Booking
export const markCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'checked_in') {
      return res.status(400).json({ message: 'Booking must be checked-in to check out.' });
    }

    // Determine if payment is required
    if (booking.paymentStatus !== 'paid') {
      // Allow Partner to override? Or strict? 
      // Let's go strict for now but allow if query param ?force=true
      if (req.query.force !== 'true') {
        return res.status(400).json({ message: 'Payment Pending. Please Mark Paid first.', requirePayment: true });
      }
    }

    booking.bookingStatus = 'checked_out';
    // booking.actualCheckOutDate = new Date(); // Ideally add to schema
    await booking.save();

    // --- RELEASE INVENTORY (Early Checkout) ---
    try {
      const ledger = await AvailabilityLedger.findOne({ referenceId: booking._id });
      if (ledger) {
        const now = new Date();
        // If checking out earlier than the blocked end date, free up the rest
        if (now < new Date(ledger.endDate)) {
          ledger.endDate = now;
          await ledger.save();
          console.log(`[Inventory] Released inventory for Booking ${booking.bookingId} (Early Checkout)`);
        }
      }
    } catch (invErr) {
      console.error('Inventory Release Failed during Check-out:', invErr);
    }

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked Out Successfully',
        body: 'Thank you for staying with us!'
      }, { type: 'check_out', bookingId: booking._id }, 'user').catch(console.error);
    }

    // Referral Trigger (if not already done)
    if (booking.userId && booking.paymentStatus === 'paid') {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error:', e));
    }

    res.json({ success: true, message: 'Checked Out Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Digital invoice for a booking
 * @route   GET /api/hotel/bookings/:id/invoice
 * @access  Private (the guest, the property's partner, or an admin)
 *
 * Settlement figures (commission, payout) are stripped from the guest's copy —
 * what the platform takes is between the platform and the partner.
 */
export const getBookingInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findById(id)
      .populate('propertyId')
      .populate('roomTypeId')
      .populate('userId', 'name phone email');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const property = booking.propertyId;
    const viewerId = String(req.user._id);
    const isGuest = String(booking.userId?._id || booking.userId) === viewerId;
    const isPartner = String(property?.partnerId || '') === viewerId;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isGuest && !isPartner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    const Partner = (await import('../models/Partner.js')).default;
    const [partner, settings] = await Promise.all([
      property?.partnerId ? Partner.findById(property.partnerId).select('name phone email') : null,
      PlatformSettings.getSettings(),
    ]);

    const invoice = buildInvoice({
      booking,
      property,
      roomType: booking.roomTypeId,
      guest: booking.userId,
      partner,
      settings,
    });

    if (!isPartner && !isAdmin) delete invoice.settlement;

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get Booking Invoice Error:', error);
    res.status(500).json({ message: 'Failed to build invoice' });
  }
};

/**
 * @desc    Revenue and settlement report for the signed-in partner
 * @route   GET /api/hotel/bookings/partner/revenue-report?from=&to=
 * @access  Private (Partner)
 *
 * Only bookings that were actually paid count towards revenue; a confirmed
 * pay-at-hotel booking that was never collected would otherwise inflate it.
 */
export const getPartnerRevenueReport = async (req, res) => {
  try {
    const properties = await Property.find({ partnerId: req.user._id }).select('_id propertyName');
    const propertyIds = properties.map((p) => p._id);

    if (propertyIds.length === 0) {
      return res.json({
        success: true,
        range: { from: null, to: null },
        totals: { bookings: 0, gross: 0, taxes: 0, discount: 0, commission: 0, payout: 0 },
        byMonth: [],
        byProperty: [],
      });
    }

    // A date-only "to" parses as midnight, which would exclude everything that
    // happened on that day — including today's bookings on the default range.
    // Run it to the end of the day instead.
    const endOfDay = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
        date.setUTCHours(23, 59, 59, 999);
      }
      return date;
    };

    const to = req.query.to ? endOfDay(req.query.to) : new Date();
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: 'Invalid from/to date' });
    }

    const match = {
      propertyId: { $in: propertyIds },
      paymentStatus: 'paid',
      bookingStatus: { $nin: ['cancelled', 'rejected'] },
      createdAt: { $gte: from, $lte: to },
    };

    const sums = {
      bookings: { $sum: 1 },
      gross: { $sum: '$totalAmount' },
      taxes: { $sum: '$taxes' },
      discount: { $sum: '$discount' },
      commission: { $sum: '$adminCommission' },
      payout: { $sum: '$partnerPayout' },
    };

    const [totalsRows, byMonth, byProperty] = await Promise.all([
      Booking.aggregate([{ $match: match }, { $group: { _id: null, ...sums } }]),
      Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            ...sums,
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Booking.aggregate([
        { $match: match },
        { $group: { _id: '$propertyId', ...sums } },
        { $sort: { payout: -1 } },
      ]),
    ]);

    const empty = { bookings: 0, gross: 0, taxes: 0, discount: 0, commission: 0, payout: 0 };
    const strip = ({ _id, ...rest }) => rest;
    const nameById = new Map(properties.map((p) => [String(p._id), p.propertyName]));

    res.json({
      success: true,
      range: { from, to },
      totals: totalsRows.length > 0 ? strip(totalsRows[0]) : empty,
      byMonth: byMonth.map((row) => ({
        year: row._id.year,
        month: row._id.month,
        label: `${String(row._id.month).padStart(2, '0')}/${row._id.year}`,
        ...strip(row),
      })),
      byProperty: byProperty.map((row) => ({
        propertyId: row._id,
        propertyName: nameById.get(String(row._id)) || 'Property',
        ...strip(row),
      })),
    });
  } catch (error) {
    console.error('Get Partner Revenue Report Error:', error);
    res.status(500).json({ message: 'Failed to build revenue report' });
  }
};
