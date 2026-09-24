import { Router } from 'express';
import { enforceModuleAvailability } from '../../../core/platform/moduleAvailability.middleware.js';

import destinationRoutes from './destinationRoutes.js';
import packageRoutes from './packageRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import offerRoutes from './offerRoutes.js';
import supportRoutes from './supportRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import { enforceAdminFeatureAccess } from '../../../core/admin/adminFeatureAccess.middleware.js';

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

/*
 * Destinations live in this module's API but they are the Places directory the
 * consumer app browses at /app/places, not part of the packages business.
 * Closing tour packages was taking Tourist Places down with it, so they follow
 * the places switch instead.
 */
toursRouter.use(enforceModuleAvailability('tours', { exempt: ['/destinations'] }));
toursRouter.use('/destinations', enforceModuleAvailability('places'), destinationRoutes);
toursRouter.use('/packages', packageRoutes);
toursRouter.use('/bookings', bookingRoutes);
toursRouter.use('/offers', offerRoutes);
toursRouter.use('/support', supportRoutes);
toursRouter.use('/reviews', reviewRoutes);
toursRouter.use('/payments', paymentRoutes);
toursRouter.use('/admin', enforceAdminFeatureAccess('tours'), adminRoutes);

export default toursRouter;
