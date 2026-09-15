/**
 * Tour booking payments.
 *
 * The traveller pays the *advance* online, never the full trip value — the
 * balance is collected by the operator on the day. So the Razorpay order is
 * always for `booking.advanceAmount`, read from the stored booking rather than
 * from the request. The client never sends an amount; that mismatch is exactly
 * what went wrong in food, where Razorpay was charged one figure and the
 * verification checked another.
 *
 * Razorpay itself is the shared client in core/payments — one construction,
 * one constant-time signature check.
 */
import TourBooking from '../models/TourBooking.js';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '../../../core/payments/razorpay.service.js';
import { settleBookingAdvance } from '../services/settlement.service.js';

/** The caller's own booking, or null. Never resolve one by id alone. */
const findOwnBooking = (id, userId) => TourBooking.findOne({ _id: id, userId });

/**
 * @route POST /v1/tours/bookings/:id/pay
 * Opens a Razorpay order for the advance on the caller's own booking.
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'This booking is already paid' });
    }

    const amount = Number(booking.advanceAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'This booking has nothing left to pay' });
    }

    if (!isRazorpayConfigured()) {
      // Without keys there is no gateway to open. The client falls back to the
      // dev settle path, which only exists while Razorpay is unconfigured.
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured on this server',
        gatewayConfigured: false,
        payable: amount,
      });
    }

    const order = await getRazorpayClient().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: booking.bookingId,
      notes: {
        bookingId: booking.bookingId,
        module: 'tours',
        userId: String(booking.userId),
      },
    });

    res.json({
      success: true,
      gatewayConfigured: true,
      razorpayKeyId: getRazorpayKeyId(),
      order: { id: order.id, amount: order.amount, currency: order.currency },
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        totalAmount: booking.totalAmount,
        advanceAmount: booking.advanceAmount,
        balanceDue: booking.balanceDue,
      },
    });
  } catch (error) {
    console.error('Tours create payment order error:', error);
    res.status(500).json({
      success: false,
      message: error.error?.description || 'Could not start the payment',
    });
  }
};

/**
 * @route POST /v1/tours/bookings/:id/verify
 * Confirms the booking once Razorpay's signature checks out.
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const settled = await settleBookingAdvance(booking, {
      paymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
    });

    res.json({ success: true, message: 'Payment confirmed', booking: settled.booking, movement: settled.movement });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Tours verify payment error:', error);
    res.status(status).json({ success: false, message: error.message || 'Could not confirm the payment' });
  }
};

export default { createPaymentOrder, verifyPayment };
