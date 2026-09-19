import express from 'express';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import {
  getBookingQuote,
  createBooking,
  cancelBooking,
  settleAdvance,
  getMyBookings,
} from '../controllers/bookingController.js';

const router = express.Router();

// A quote is public: the booking screen prices a trip before anyone signs in.
// optionalProtect so a signed-in traveller's per-user coupon limit is checked
// on the screen rather than only at checkout.
router.post('/quote', optionalProtect, getBookingQuote);

// Static paths before '/:id/...' so they are never read as ids.
router.get('/my', protect, getMyBookings);

router.post('/', protect, createBooking);
router.post('/:id/settle', protect, settleAdvance);
// The traveller's own cancellation — hotel and festivals both had one.
router.post('/:id/cancel', protect, cancelBooking);

export default router;
