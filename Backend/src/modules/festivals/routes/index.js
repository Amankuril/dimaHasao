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
  getMyBookings,
  cancelBooking,
  getAdminBookings,
  verifyPass,
} from '../controllers/bookingController.js';
import {
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
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
admin.put('/:id', updateFestival);
admin.patch('/:id/active', toggleFestival);
admin.delete('/:id', deleteFestival);
festivalsRouter.use('/admin', admin);

/* Bookings — the consumer rides the platform user session. */
const bookings = Router();
bookings.post('/quote', getBookingQuote); // public: the screen prices before sign-in
bookings.get('/my', protect, getMyBookings);
bookings.post('/', protect, createBooking);
bookings.post('/:id/cancel', protect, cancelBooking);
bookings.post('/:id/settle', protect, settleWithoutGateway);
festivalsRouter.use('/bookings', bookings);

/* Payments */
const payments = Router();
payments.post('/bookings/:id/order', protect, createPaymentOrder);
payments.post('/bookings/:id/verify', protect, verifyPayment);
festivalsRouter.use('/payments', payments);

/* Public catalogue, last so it cannot shadow the routers above. */
festivalsRouter.get('/', getPublicFestivals);
festivalsRouter.get('/:id', getFestivalDetail);

export default festivalsRouter;
