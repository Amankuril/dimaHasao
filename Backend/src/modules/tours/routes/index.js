import { Router } from 'express';

import destinationRoutes from './destinationRoutes.js';
import packageRoutes from './packageRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import offerRoutes from './offerRoutes.js';
import supportRoutes from './supportRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';

/**
 * Tours & Travels.
 *
 * Single-vendor: the district runs its own tours, exactly as it runs its own
 * festivals, so there is no operator to sign in, no wallet to credit and no
 * payout to settle. Everything here is created and managed by an admin, and a
 * booking is a straight sale to the platform.
 */
export const toursRouter = Router();

toursRouter.get('/health', (_req, res) => res.json({ success: true, module: 'tours' }));

toursRouter.use('/destinations', destinationRoutes);
toursRouter.use('/packages', packageRoutes);
toursRouter.use('/bookings', bookingRoutes);
toursRouter.use('/offers', offerRoutes);
toursRouter.use('/support', supportRoutes);
toursRouter.use('/reviews', reviewRoutes);
toursRouter.use('/payments', paymentRoutes);
toursRouter.use('/admin', adminRoutes);

export default toursRouter;
