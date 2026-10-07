import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';
import Booking from '../models/Booking.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import smsService from '../utils/smsService.js';
import referralService from '../services/referralService.js';
import {
  getRazorpayClient,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../../../core/payments/razorpay.service.js';
import { findPlatformAdmin } from '../models/Admin.js';

// Initialize Razorpay
let razorpay;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    // Shared client — see core/payments/razorpay.service.js
    razorpay = getRazorpayClient();
  } else {
    // For Development without Keys
    console.warn("⚠️ Razorpay Keys missing. Payment features will fail if used.");
    razorpay = {
      orders: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized")),
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized"))
      },
      payments: {
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized")),
        refund: () => Promise.reject(new Error("Razorpay Not Initialized"))
      }
    };
  }
} catch (err) {
  console.error("Razorpay Init Failed:", err.message);
}

const isAdminCaller = (user) => ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase());

/** The guest who made the booking, or an admin. */
const canActOnBooking = (user, booking) =>
  Boolean(user) && (String(booking.userId) === String(user._id) || isAdminCaller(user));

/** Statuses in which a captured payment may still confirm the stay. */
const PAYABLE_BOOKING_STATUSES = ['pending', 'awaiting_payment', 'confirmed'];

const populateForConfirmation = (id) => Booking.findById(id)
  .populate('propertyId')
  .populate('roomTypeId')
  .populate('userId', 'name email phone');

/**
 * @desc    Create Razorpay order for booking payment
 * @route   POST /api/payments/create-order
 * @access  Private
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    // Only the guest who booked (or an admin) may open a payment for it. 404
    // rather than 403, so an outsider cannot probe which booking ids exist.
    if (!booking || !canActOnBooking(req.user, booking)) return res.status(404).json({ message: 'Booking not found' });
    if (booking.paymentStatus === 'paid') return res.status(400).json({ message: 'Booking already paid' });

    let amountInPaise = Math.round(booking.totalAmount * 100);
    if (!amountInPaise || amountInPaise <= 0) return res.status(400).json({ message: 'Invalid booking amount' });

    // WORKAROUND: Razorpay Test Accounts often have a limit (e.g., ₹15,000).
    // If using Test Keys, cap the request amount to ₹10,000 to allow testing the flow.
    const isTestKey = PaymentConfig.razorpayKeyId?.startsWith('rzp_test');
    const MAX_TEST_AMOUNT = 10000 * 100; // ₹10,000

    if (isTestKey && amountInPaise > MAX_TEST_AMOUNT) {
      console.warn(`⚠️ Capping Test Payment of ₹${booking.totalAmount} to ₹10,000 to avoid Razorpay Limit Check.`);
      amountInPaise = MAX_TEST_AMOUNT;
    }

    const options = {
      amount: amountInPaise,
      currency: PaymentConfig.currency,
      receipt: booking._id.toString(),
      notes: {
        bookingId: booking._id.toString(),
        userId: booking.userId.toString(),
        propertyId: booking.propertyId.toString()
      }
    };
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      booking: {
        id: booking._id,
        amount: booking.totalAmount,
        status: booking.bookingStatus,
        paymentStatus: booking.paymentStatus
      },
      razorpayKeyId: PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    res.status(500).json({
      message: 'Failed to create payment order',
      error: error.error?.description || error.message
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature
 * @route   POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // 1. Verify Signature (shared, constant-time)
    if (!verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    /*
     * Bind the payment to the booking it was taken for.
     *
     * A valid signature only proves Razorpay took money against *some* order of
     * ours. This used to mark whichever bookingId the body named as paid, and
     * credit the partner and admin wallets every time it was called — so one
     * cheap payment could confirm any booking, anyone's, and replaying it
     * minted wallet money. Every order this module creates carries
     * notes.bookingId (createBooking and createPaymentOrder), so that, not the
     * request body, decides the booking.
     */
    let order;
    try {
      order = await razorpay.orders.fetch(razorpay_order_id);
    } catch (err) {
      console.error('Verify Payment: order fetch failed:', err.message);
      return res.status(502).json({ message: 'Could not confirm this payment with the gateway. Please retry.' });
    }

    const orderBookingId = String(order?.notes?.bookingId || '');
    if (!orderBookingId || !mongoose.Types.ObjectId.isValid(orderBookingId)) {
      return res.status(400).json({ message: 'This payment is not linked to a booking' });
    }
    if (bookingId && String(bookingId) !== orderBookingId) {
      return res.status(400).json({ message: 'This payment belongs to a different booking' });
    }

    const existing = await Booking.findById(orderBookingId);
    if (!existing || !canActOnBooking(req.user, existing)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    /*
     * Claim the payment atomically. Only the request that flips the booking to
     * paid goes on to credit wallets and notify; a replay or a concurrent
     * duplicate finds it already paid and gets the same answer without moving
     * money again. A booking that was cancelled while the guest was paying is
     * not resurrected — its room has already been released.
     */
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: existing._id,
        paymentStatus: { $nin: ['paid', 'refunded'] },
        bookingStatus: { $in: PAYABLE_BOOKING_STATUSES },
      },
      { $set: { paymentStatus: 'paid', bookingStatus: 'confirmed', paymentId: razorpay_payment_id, paymentMethod: 'razorpay' } },
      { new: true }
    );

    if (!claimed) {
      const current = await Booking.findById(existing._id).select('paymentStatus paymentId bookingStatus');
      if (current?.paymentStatus === 'paid' && current.paymentId === razorpay_payment_id) {
        return res.json({
          success: true,
          message: 'Payment verified successfully',
          booking: await populateForConfirmation(existing._id),
        });
      }
      if (current?.paymentStatus === 'paid') {
        return res.status(409).json({ message: 'This booking is already paid' });
      }
      console.error(`[Payment] Captured ${razorpay_payment_id} for booking ${existing._id} in status ${current?.bookingStatus}; needs a refund`);
      return res.status(409).json({ message: 'This booking can no longer be confirmed. Your payment will be refunded — please contact support.' });
    }

    const booking = claimed;

    // Coupons on online bookings were never counted (createBooking only counts
    // them for bookings confirmed at creation), so count it on confirmation.
    if (booking.couponCode) {
      await Offer.findOneAndUpdate({ code: booking.couponCode }, { $inc: { usageCount: 1 } }).catch((e) => console.error('Offer usage update failed:', e.message));
    }

    const paymentMeta = {
      partnerPayout: booking.partnerPayout,
      adminCommission: booking.adminCommission,
      taxes: booking.taxes,
    };

    // --- PARTNER WALLET CREDIT LOGIC (Common) ---
    try {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      const partnerId = fullBooking.propertyId?.partnerId;

      if (partnerId) {
        let partnerWallet = await Wallet.findOne({ partnerId: partnerId, role: 'partner' });
        if (!partnerWallet) {
          partnerWallet = await Wallet.create({
            partnerId: partnerId,
            role: 'partner',
            balance: 0
          });
        }

        const payout = paymentMeta.partnerPayout || 0;

        if (payout > 0) {
          await partnerWallet.credit(payout, `Payment for Booking #${booking.bookingId}`, booking.bookingId, 'booking_payment');
          console.log(`[Payment] Credited ₹${payout} to Partner ${partnerId}`);
        }
      }
    } catch (err) { console.error("Wallet Credit Failed", err); }

    // --- ADMIN WALLET CREDIT LOGIC ---
    try {
      const commission = paymentMeta.adminCommission || 0;
      const taxes = paymentMeta.taxes || 0;
      const totalAdminCredit = commission + taxes;

      if (totalAdminCredit > 0) {
        // The wallet needs an owner id. This looked for an admin among hotel
        // *users*, whose role is 'user', so it never matched — the admin wallet
        // was never created and commission + tax went uncredited.
        const adminUser = await findPlatformAdmin();

        if (adminUser) {
          let adminWallet = await Wallet.findOne({ role: 'admin' });

          if (!adminWallet) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }

          // Credit the wallet (Commission + Tax)
          await adminWallet.credit(totalAdminCredit, `Commission (₹${commission}) & Tax (₹${taxes}) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_tax');
          console.log(`[Payment] Credited ₹${totalAdminCredit} (Comm: ${commission}, Tax: ${taxes}) to Admin Wallet`);
        } else {
          console.warn("⚠️ No Admin user found. Cannot credit commission/tax.");
        }
      }
    } catch (err) { console.error("Admin Wallet Credit Failed", err); }

    // Return full populated booking for confirmation page
    const populatedBooking = await populateForConfirmation(booking._id);

    // TRIGGER NOTIFICATIONS (ONLINE PAYMENT SUCCESS)
    try {
      const user = populatedBooking.userId;
      const property = populatedBooking.propertyId;

      // 1. User Email
      if (user && user.email) {
        emailService.sendBookingConfirmationEmail(user, populatedBooking).catch(err => console.error('Email trigger failed:', err));
      }

      // 2. User Push
      if (user) {
        notificationService.sendToUser(user._id, {
          title: 'Booking Confirmed!',
          body: `You are going to ${property.name || 'Hotel'}.`
        }, { type: 'booking', bookingId: populatedBooking._id }, 'user').catch(err => console.error('User Push failed:', err));
      }

      // 3. Partner Notifications
      if (property && property.partnerId) {
        // Push
        notificationService.sendToUser(property.partnerId, {
          title: 'New Booking Alert!',
          body: `1 Night, ${populatedBooking.guests.adults} Guests. Check App.`
        }, { type: 'new_booking', bookingId: populatedBooking._id }, 'partner').catch(err => console.error('Partner Push failed:', err));

        // SMS
        // Fetch partner user to get phone
        const PartnerModel = mongoose.model('Partner');
        const partnerUser = await PartnerModel.findById(property.partnerId);
        if (partnerUser && partnerUser.phone) {
          smsService.sendSMS(partnerUser.phone, `New Booking Alert! Booking #${populatedBooking.bookingId} at ${property.name}. Check App for details.`)
            .catch(err => console.error('Partner SMS failed:', err));
        }
      }
    } catch (notifErr) {
      console.error('Notification Trigger Custom Error:', notifErr);
    }

    // REFERRAL: Trigger Referral Reward
    if (populatedBooking.userId) {
      // userId might be an object or ID depending on population. Since we used populate('userId', 'name...'), it is an object.
      const uId = populatedBooking.userId._id || populatedBooking.userId;
      referralService.processBookingCompletion(uId, populatedBooking._id).catch(e => console.error('Referral Trigger Error (Online):', e));
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

/**
 * @desc    Handle Razorpay webhook
 * @route   POST /api/payments/webhook
 * @access  Public (Razorpay)
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    // Shared, constant-time. Keeps hashing the re-serialised body as before;
    // a raw-body verifier would be stricter but changes request handling.
    if (!verifyWebhookSignature({
      body: JSON.stringify(req.body),
      signature,
      secret: process.env.RAZORPAY_WEBHOOK_SECRET || PaymentConfig.razorpayKeySecret,
    })) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`📨 Webhook received: ${event}`);

    // Handle different events
    switch (event) {
      case 'payment.captured':
        // Payment successful
        console.log('Payment captured:', payload.payment.entity.id);
        break;

      case 'payment.failed':
        // Payment failed
        console.log('Payment failed:', payload.payment.entity.id);
        break;

      case 'order.paid':
        // Order paid
        console.log('Order paid:', payload.order.entity.id);
        break;

      default:
        console.log('Unhandled event:', event);
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * @desc    Get payment details
 * @route   GET /api/payments/:paymentId
 * @access  Private
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Admin only (enforced on the route): a raw gateway payment carries the
    // payer's contact details, and this looked up any payment id for any
    // signed-in caller.
    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Get Payment Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch payment details' });
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/payments/refund/:bookingId
 * @access  Admin
 *
 * Any signed-in user could call this for any booking, choose the refund
 * amount, and repeat it; the partner and admin also kept the payout and
 * commission for money that went back. Now: admin only (route), one refund per
 * booking (atomic claim on 'paid'), Razorpay refunds what it actually
 * captured, and the wallet credits made at payment time are reversed the way
 * cancelBooking reverses them.
 */
export const processRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(String(bookingId))) return res.status(404).json({ message: 'Booking not found' });
    const booking = await Booking.findById(bookingId).populate('propertyId', 'partnerId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.paymentStatus !== 'paid') return res.status(400).json({ message: 'Booking not paid' });
    const paymentId = booking.paymentId;
    if (!paymentId) return res.status(400).json({ message: 'Payment ID not found on booking' });

    const previous = {
      bookingStatus: booking.bookingStatus,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
    };
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, paymentStatus: 'paid', paymentId },
      { $set: { paymentStatus: 'refunded', bookingStatus: 'cancelled', cancellationReason: reason, cancelledAt: new Date() } },
      { new: true }
    );
    if (!claimed) return res.status(409).json({ message: 'Booking was already refunded or has changed state' });

    let refund;
    try {
      refund = await razorpay.payments.refund(paymentId, {
        notes: { reason, bookingId: booking._id.toString() }
      });
    } catch (err) {
      // Nothing went back to the guest, so put the booking back as it was.
      await Booking.updateOne({ _id: booking._id, paymentStatus: 'refunded' }, { $set: { paymentStatus: 'paid', ...previous } });
      throw err;
    }

    // Reverse what verifyPayment credited (overdraft-allowed categories, so a
    // partner who already withdrew still carries the debt).
    const partnerId = booking.propertyId?.partnerId;
    if (booking.partnerPayout > 0 && partnerId) {
      const partnerWallet = await Wallet.findOne({ partnerId, role: 'partner' });
      if (partnerWallet) {
        await partnerWallet.debit(booking.partnerPayout, `Reversal (Refund) for Booking #${booking.bookingId}`, booking.bookingId, 'refund_deduction')
          .catch((err) => console.error('Partner Refund Deduction Failed:', err.message));
      }
    }
    const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
    if (adminDeduction > 0) {
      const adminWallet = await Wallet.findOne({ role: 'admin' });
      if (adminWallet) {
        await adminWallet.debit(adminDeduction, `Reversal (Refund) for Booking #${booking.bookingId}`, booking.bookingId, 'refund_deduction')
          .catch((err) => console.error('Admin Refund Deduction Failed:', err.message));
      }
    }

    await AvailabilityLedger.deleteMany({
      source: 'platform',
      referenceId: booking._id
    });
    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Process Refund Error:', error);
    res.status(500).json({ message: 'Refund processing failed', error: error.message });
  }
};
