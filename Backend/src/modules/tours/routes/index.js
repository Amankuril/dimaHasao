import { Router } from 'express';

import operatorRoutes from './operatorRoutes.js';
import packageRoutes from './packageRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import walletRoutes from './walletRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';

/**
 * Tours & Travels. Operator sign-in rides the shared OTP service at
 * /v1/auth/otp with the `tours-operator` audience, so there is no auth
 * sub-router here — only the resources.
 */
export const toursRouter = Router();

toursRouter.get('/health', (_req, res) => res.json({ success: true, module: 'tours' }));

toursRouter.use('/operators', operatorRoutes);
toursRouter.use('/packages', packageRoutes);
toursRouter.use('/bookings', bookingRoutes);
toursRouter.use('/wallet', walletRoutes);
toursRouter.use('/reviews', reviewRoutes);
toursRouter.use('/payments', paymentRoutes);
toursRouter.use('/admin', adminRoutes);

export default toursRouter;
