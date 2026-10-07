/**
 * What happens when money for a hotel booking or wallet top-up is captured.
 *
 * Two doors lead here: the app's checkout callback (POST /payments/verify,
 * POST /wallet/verify-add-money) and Razorpay's webhook. The webhook used to
 * log the event and do nothing, so a guest who paid and then closed the app
 * before the callback ran was charged with the booking left unpaid. Both doors
 * now run the same code, and the first one to claim the payment does the work
 * — the claim is a conditional write, so the other finds it done and moves no
 * money twice.
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Offer from '../models/Offer.js';
import { findPlatformAdmin } from '../models/Admin.js';
import emailService from './emailService.js';
import notificationService from './notificationService.js';
import referralService from './referralService.js';
import smsService from '../utils/smsService.js';
import { getRazorpayClient } from '../../../core/payments/razorpay.service.js';

/** Statuses in which a captured payment may still confirm the stay. */
export const PAYABLE_BOOKING_STATUSES = ['pending', 'awaiting_payment', 'confirmed'];

export const populateForConfirmation = (id) => Booking.findById(id)
  .populate('propertyId')
  .populate('roomTypeId')
  .populate('userId', 'name email phone');

const creditPartnerAndAdmin = async (booking) => {
  try {
    const fullBooking = await Booking.findById(booking._id).populate('propertyId');
    const partnerId = fullBooking.propertyId?.partnerId;
    const payout = booking.partnerPayout || 0;
    if (partnerId && payout > 0) {
      let partnerWallet = await Wallet.findOne({ partnerId, role: 'partner' });
      if (!partnerWallet) partnerWallet = await Wallet.create({ partnerId, role: 'partner', balance: 0 });
      await partnerWallet.credit(payout, `Payment for Booking #${booking.bookingId}`, booking.bookingId, 'booking_payment');
      console.log(`[Payment] Credited ₹${payout} to Partner ${partnerId}`);
    }
  } catch (err) { console.error('Wallet Credit Failed', err); }

  try {
    const commission = booking.adminCommission || 0;
    const taxes = booking.taxes || 0;
    const totalAdminCredit = commission + taxes;
    if (totalAdminCredit > 0) {
      // The wallet needs an owner id; the admin lives in the platform admin
      // collection (looking among hotel users never matched).
      const adminUser = await findPlatformAdmin();
      if (adminUser) {
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) adminWallet = await Wallet.create({ partnerId: adminUser._id, role: 'admin', balance: 0 });
        await adminWallet.credit(totalAdminCredit, `Commission (₹${commission}) & Tax (₹${taxes}) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_tax');
        console.log(`[Payment] Credited ₹${totalAdminCredit} (Comm: ${commission}, Tax: ${taxes}) to Admin Wallet`);
      } else {
        console.warn('⚠️ No Admin user found. Cannot credit commission/tax.');
      }
    }
  } catch (err) { console.error('Admin Wallet Credit Failed', err); }
};

const notifyConfirmed = async (populatedBooking) => {
  try {
    const user = populatedBooking.userId;
    const property = populatedBooking.propertyId;

    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user, populatedBooking).catch((err) => console.error('Email trigger failed:', err));
    }
    if (user) {
      notificationService.sendToUser(user._id, {
        title: 'Booking Confirmed!',
        body: `You are going to ${property?.name || 'Hotel'}.`,
      }, { type: 'booking', bookingId: populatedBooking._id }, 'user').catch((err) => console.error('User Push failed:', err));
    }
    if (property && property.partnerId) {
      notificationService.sendToUser(property.partnerId, {
        title: 'New Booking Alert!',
        body: `1 Night, ${populatedBooking.guests?.adults} Guests. Check App.`,
      }, { type: 'new_booking', bookingId: populatedBooking._id }, 'partner').catch((err) => console.error('Partner Push failed:', err));

      const PartnerModel = mongoose.model('Partner');
      const partnerUser = await PartnerModel.findById(property.partnerId);
      if (partnerUser && partnerUser.phone) {
        smsService.sendSMS(partnerUser.phone, `New Booking Alert! Booking #${populatedBooking.bookingId} at ${property.name}. Check App for details.`)
          .catch((err) => console.error('Partner SMS failed:', err));
      }
    }
  } catch (notifErr) {
    console.error('Notification Trigger Custom Error:', notifErr);
  }

  if (populatedBooking.userId) {
    const uId = populatedBooking.userId._id || populatedBooking.userId;
    referralService.processBookingCompletion(uId, populatedBooking._id).catch((e) => console.error('Referral Trigger Error (Online):', e));
  }
};

/**
 * Mark a booking paid by this payment and run everything that follows, once.
 *
 * @returns {Promise<{ outcome: 'confirmed'|'already_paid'|'paid_other'|'not_payable'|'not_found', booking: object|null }>}
 *   'confirmed' only for the call that won the claim; every other caller gets
 *   the state it found without moving money.
 */
export const settleBookingPayment = async ({ bookingId, paymentId }) => {
  const claimed = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      paymentStatus: { $nin: ['paid', 'refunded'] },
      bookingStatus: { $in: PAYABLE_BOOKING_STATUSES },
    },
    { $set: { paymentStatus: 'paid', bookingStatus: 'confirmed', paymentId, paymentMethod: 'razorpay' } },
    { new: true },
  );

  if (!claimed) {
    const current = await Booking.findById(bookingId).select('paymentStatus paymentId bookingStatus');
    if (!current) return { outcome: 'not_found', booking: null };
    if (current.paymentStatus === 'paid' && current.paymentId === paymentId) {
      return { outcome: 'already_paid', booking: await populateForConfirmation(bookingId) };
    }
    if (current.paymentStatus === 'paid') return { outcome: 'paid_other', booking: current };
    console.error(`[Payment] Captured ${paymentId} for booking ${bookingId} in status ${current.bookingStatus}; needs a refund`);
    return { outcome: 'not_payable', booking: current };
  }

  // Coupons on online bookings are counted on confirmation (createBooking only
  // counts them for bookings confirmed at creation).
  if (claimed.couponCode) {
    await Offer.findOneAndUpdate({ code: claimed.couponCode }, { $inc: { usageCount: 1 } })
      .catch((e) => console.error('Offer usage update failed:', e.message));
  }

  await creditPartnerAndAdmin(claimed);
  const populated = await populateForConfirmation(claimed._id);
  await notifyConfirmed(populated);
  return { outcome: 'confirmed', booking: populated };
};

/**
 * Credit a wallet top-up once per payment id.
 *
 * The payment id is the ledger reference and is unique for top-ups (see
 * models/Transaction.js), so a callback and a webhook racing on the same
 * payment cannot both land.
 *
 * @returns {Promise<{ credited: boolean, balance: number }>}
 */
export const creditTopupOnce = async ({ ownerId, role, paymentId, amount }) => {
  let wallet = await Wallet.findOne({ partnerId: ownerId, role });
  if (!wallet) wallet = await Wallet.create({ partnerId: ownerId, role, balance: 0 });

  if (await Transaction.exists({ category: 'topup', reference: paymentId })) {
    return { credited: false, balance: wallet.balance };
  }
  try {
    await wallet.credit(amount, 'Wallet Top-up', paymentId, 'topup');
    return { credited: true, balance: wallet.balance };
  } catch (err) {
    // Lost the race: the unique index refused our ledger row and credit()
    // already reversed the $inc.
    if (err?.code === 11000) {
      const fresh = await Wallet.findById(wallet._id).select('balance');
      return { credited: false, balance: fresh?.balance ?? wallet.balance };
    }
    throw err;
  }
};

const TOPUP_ROLES = new Set(['user', 'partner', 'admin']);

/**
 * Webhook entry: a payment was captured on one of our Razorpay orders. Settles
 * it if the order belongs to hotel (a booking or a wallet top-up).
 *
 * @param {{ id: string, order_id: string, amount: number, status: string }} payment - Razorpay payment entity
 * @returns {Promise<boolean>} whether hotel recognised the order
 */
export const handleCapturedPayment = async (payment) => {
  if (!payment?.order_id || !payment?.id) return false;
  const razorpay = getRazorpayClient();
  if (!razorpay) return false;

  const order = await razorpay.orders.fetch(payment.order_id);
  const notes = order?.notes || {};

  if (notes.type === 'wallet_topup') {
    const role = TOPUP_ROLES.has(String(notes.role || '')) ? String(notes.role) : 'user';
    if (!mongoose.Types.ObjectId.isValid(String(notes.userId || ''))) return false;
    const amount = (Number(payment.amount) || 0) / 100;
    if (amount <= 0) return true;
    const { credited } = await creditTopupOnce({ ownerId: notes.userId, role: role === 'admin' ? 'admin' : role, paymentId: payment.id, amount });
    console.log(`[Webhook] Hotel top-up ${payment.id} ${credited ? 'credited' : 'already credited'}`);
    return true;
  }

  // Hotel booking orders carry propertyId next to bookingId (tours and
  // festivals carry `module` instead), which keeps this from claiming theirs.
  const bookingId = String(notes.bookingId || '');
  if (bookingId && notes.propertyId && mongoose.Types.ObjectId.isValid(bookingId)) {
    const { outcome } = await settleBookingPayment({ bookingId, paymentId: payment.id });
    console.log(`[Webhook] Hotel booking ${bookingId} payment ${payment.id}: ${outcome}`);
    return true;
  }
  return false;
};
