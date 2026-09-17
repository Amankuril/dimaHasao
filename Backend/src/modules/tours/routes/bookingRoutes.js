import express from 'express';
import { protect, optionalProtect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getBookingQuote,
  createBooking,
  cancelBooking,
  settleAdvance,
  collectBalance,
  getMyBookings,
  getOperatorBookings,
  updateBookingStatus,
} from '../controllers/bookingController.js';

const router = express.Router();

// A quote is public: the booking screen prices a trip before anyone signs in.
// optionalProtect so a signed-in traveller's per-user coupon limit is checked
// on the screen rather than only at checkout.
router.post('/quote', optionalProtect, getBookingQuote);

// Static paths before '/:id/...' so they are never read as ids.
router.get('/my', protect, getMyBookings);
router.get('/operator', protect, authorizedRoles('operator'), getOperatorBookings);

router.post('/', protect, createBooking);
router.post('/:id/settle', protect, settleAdvance);
// The traveller's own cancellation — hotel and festivals both had one.
router.post('/:id/cancel', protect, cancelBooking);
router.patch('/:id/collect-balance', protect, authorizedRoles('operator'), collectBalance);
router.patch('/:id/status', protect, authorizedRoles('operator'), updateBookingStatus);

export default router;
