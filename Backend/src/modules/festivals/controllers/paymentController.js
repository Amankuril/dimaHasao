/**
 * Festival pass payments.
 *
 * Same shape as the tours payment path: the Razorpay order amount is read from
 * the stored booking, never from the request, and both endpoints are scoped to
 * the caller's own booking.
 */
import FestivalBooking from '../models/FestivalBooking.js';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '../../../core/payments/razorpay.service.js';
import { confirmBookingPayment } from './bookingController.js';

const findOwnBooking = (id, userId) => FestivalBooking.findOne({ _id: id, userId });

/** @route POST /v1/festivals/payments/bookings/:id/order */
export const createPaymentOrder = async (req, res) => {
  try {
    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'This booking is already paid' });
    }

    const amount = Number(booking.totalAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'This booking has nothing to pay' });
    }

    if (!isRazorpayConfigured()) {
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
      notes: { bookingId: booking.bookingId, module: 'festivals', userId: String(booking.userId) },
    });

    res.json({
      success: true,
      gatewayConfigured: true,
      razorpayKeyId: getRazorpayKeyId(),
      order: { id: order.id, amount: order.amount, currency: order.currency },
      booking: { id: booking._id, bookingId: booking.bookingId, totalAmount: booking.totalAmount },
    });
  } catch (error) {
    console.error('Festival create payment order error:', error);
    res.status(500).json({ success: false, message: error.error?.description || 'Could not start the payment' });
  }
};

/** @route POST /v1/festivals/payments/bookings/:id/verify */
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

    const confirmed = await confirmBookingPayment(booking, {
      paymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
    });

    res.json({ success: true, message: 'Payment confirmed', booking: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival verify payment error:', error);
    res.status(status).json({ success: false, message: error.message || 'Could not confirm the payment' });
  }
};

/**
 * @route POST /v1/festivals/bookings/:id/settle
 * The no-gateway path, refused whenever Razorpay is configured — so it can
 * never become a way to get a pass without paying.
 */
export const settleWithoutGateway = async (req, res) => {
  try {
    if (isRazorpayConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Complete the payment through the gateway to confirm this booking.',
      });
    }

    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const confirmed = await confirmBookingPayment(booking, { paymentMethod: 'dev_no_gateway' });
    res.json({ success: true, message: 'Booking confirmed', booking: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival settle error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to confirm this booking' });
  }
};

export default { createPaymentOrder, verifyPayment, settleWithoutGateway };
