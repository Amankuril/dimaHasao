import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../../core/auth/auth.middleware.js';
import { loadAdmin } from '../../../core/admin/admin.controller.js';
import { protect } from '../../tours/middlewares/authMiddleware.js';
import {
  getPublicFestivals,
  getFestivalDetail,
  getAdminFestivals,
  createFestival,
  updateFestival,
  toggleFestival,
  deleteFestival,
} from '../controllers/festivalController.js';
import {
  getBookingQuote,
  createBooking,
  checkoutBasket,
  releaseCheckout,
  getMyBookings,
  cancelBooking,
  getAdminBookings,
  getFestivalBookingSummary,
  cancelBookingAsAdmin,
  verifyPass,
} from '../controllers/bookingController.js';
import {
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
  createGroupPaymentOrder,
  verifyGroupPayment,
  settleGroupWithoutGateway,
} from '../controllers/paymentController.js';

export const festivalsRouter = Router();

festivalsRouter.get('/health', (_req, res) => res.json({ success: true, module: 'festivals' }));

/* Admin — declared before '/:id' so "admin" is never read as a festival id. */
const admin = Router();
admin.use(authMiddleware, requireAdmin, loadAdmin);
admin.get('/', getAdminFestivals);
admin.post('/', createFestival);
admin.get('/bookings', getAdminBookings);
admin.post('/bookings/verify', verifyPass);
admin.post('/bookings/:id/cancel', cancelBookingAsAdmin);
// Before '/:id' so "bookings" is never read as part of a festival id path.
admin.get('/:id/bookings', getFestivalBookingSummary);
admin.put('/:id', updateFestival);
admin.patch('/:id/active', toggleFestival);
admin.delete('/:id', deleteFestival);
festivalsRouter.use('/admin', admin);

/* Bookings — the consumer rides the platform user session. */
const bookings = Router();
bookings.post('/quote', getBookingQuote); // public: the screen prices before sign-in
bookings.get('/my', protect, getMyBookings);
// A whole basket in one call — several categories, one payment.
bookings.post('/checkout', protect, checkoutBasket);
// Hand the seats back when the buyer abandons the payment window.
bookings.post('/checkout/:groupId/release', protect, releaseCheckout);
bookings.post('/', protect, createBooking);
bookings.post('/:id/cancel', protect, cancelBooking);
bookings.post('/:id/settle', protect, settleWithoutGateway);
festivalsRouter.use('/bookings', bookings);

/* Payments */
const payments = Router();
payments.post('/bookings/:id/order', protect, createPaymentOrder);
payments.post('/bookings/:id/verify', protect, verifyPayment);
// One order, one signature, for every booking in a checkout.
payments.post('/orders/:groupId', protect, createGroupPaymentOrder);
payments.post('/orders/:groupId/verify', protect, verifyGroupPayment);
payments.post('/orders/:groupId/settle', protect, settleGroupWithoutGateway);
festivalsRouter.use('/payments', payments);

/* Public catalogue, last so it cannot shadow the routers above. */
festivalsRouter.get('/', getPublicFestivals);
festivalsRouter.get('/:id', getFestivalDetail);

export default festivalsRouter;
