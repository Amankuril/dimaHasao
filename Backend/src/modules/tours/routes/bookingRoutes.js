import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getBookingQuote,
  createBooking,
  settleAdvance,
  collectBalance,
  getMyBookings,
  getOperatorBookings,
  updateBookingStatus,
} from '../controllers/bookingController.js';

const router = express.Router();

// A quote is public: the booking screen prices a trip before anyone signs in.
router.post('/quote', getBookingQuote);

// Static paths before '/:id/...' so they are never read as ids.
router.get('/my', protect, getMyBookings);
router.get('/operator', protect, authorizedRoles('operator'), getOperatorBookings);

router.post('/', protect, createBooking);
router.post('/:id/settle', protect, settleAdvance);
router.patch('/:id/collect-balance', protect, authorizedRoles('operator'), collectBalance);
router.patch('/:id/status', protect, authorizedRoles('operator'), updateBookingStatus);

export default router;
