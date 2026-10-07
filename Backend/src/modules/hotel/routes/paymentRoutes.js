import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
  processRefund
} from '../controllers/paymentController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', protect, createPaymentOrder);

// Verify payment
router.post('/verify', protect, verifyPayment);

// Razorpay webhook (no auth needed, signature verified)
router.post('/webhook', handleWebhook);

// Get payment details
router.get('/:paymentId', protect, authorizedRoles('admin', 'superadmin'), getPaymentDetails);

// Process refund
router.post('/refund/:bookingId', protect, authorizedRoles('admin', 'superadmin'), processRefund);

export default router;
