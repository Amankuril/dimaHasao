import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getBookingQuote,
  createBooking,
  getMyBookings,
  getPartnerBookings,
  cancelBooking,
  getPartnerBookingDetail,
  markBookingAsPaid,
  markBookingNoShow,
  markCheckIn,
  markCheckOut,
  getBookingDetail,
  getBookingInvoice,
  getPartnerRevenueReport,
} from '../controllers/bookingController.js';

const router = express.Router();

// Declared before '/:id' routes so 'quote' is never read as a booking id.
router.post('/quote', protect, getBookingQuote);
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/partner', protect, authorizedRoles('partner', 'admin'), getPartnerBookings);
// Declared before '/:id' so "partner" is never read as a booking id.
router.get('/partner/revenue-report', protect, authorizedRoles('partner', 'admin'), getPartnerRevenueReport);
router.get('/:id/invoice', protect, getBookingInvoice);
router.get('/:id/partner-detail', protect, authorizedRoles('partner', 'admin'), getPartnerBookingDetail); // Specific for partners
router.get('/:id', protect, getBookingDetail); // General detail (User)
router.put('/:id/mark-paid', protect, authorizedRoles('partner', 'admin'), markBookingAsPaid);
router.put('/:id/no-show', protect, authorizedRoles('partner', 'admin'), markBookingNoShow);
router.put('/:id/check-in', protect, authorizedRoles('partner', 'admin'), markCheckIn);
router.put('/:id/check-out', protect, authorizedRoles('partner', 'admin'), markCheckOut);
router.post('/:id/cancel', protect, cancelBooking);

export default router;
