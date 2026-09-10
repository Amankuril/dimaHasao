import { Router } from 'express';

import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import offerRoutes from './offerRoutes.js';
import walletRoutes from './walletRoutes.js';
import propertyRoutes from './propertyRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import availabilityRoutes from './availabilityRoutes.js';
import hotelRoutes from './hotelRoutes.js';
import categoryRoutes from './categoryRoutes.js';

// Hotel / property module (ported from HomeZoo). Sub-paths mirror the original
// service so the partner panel and admin screens keep working unchanged; the
// whole tree is mounted under /v1/hotel by the root router.
export const hotelRouter = Router();

hotelRouter.use('/users', userRoutes);
hotelRouter.use('/admin', adminRoutes);
hotelRouter.use('/offers', offerRoutes);
hotelRouter.use('/wallet', walletRoutes);
hotelRouter.use('/properties', propertyRoutes);
hotelRouter.use('/bookings', bookingRoutes);
hotelRouter.use('/reviews', reviewRoutes);
hotelRouter.use('/payments', paymentRoutes);
hotelRouter.use('/availability', availabilityRoutes);
hotelRouter.use('/hotels', hotelRoutes);
// Partner-specific endpoints share the hotel router upstream (e.g. /partners/fcm-token).
hotelRouter.use('/partners', hotelRoutes);
hotelRouter.use('/categories', categoryRoutes);

export default hotelRouter;
