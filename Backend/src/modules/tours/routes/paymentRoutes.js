import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

// Both are scoped to the caller's own booking inside the controller.
router.post('/bookings/:id/order', protect, createPaymentOrder);
router.post('/bookings/:id/verify', protect, verifyPayment);

export default router;
