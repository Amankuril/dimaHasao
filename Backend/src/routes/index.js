import express from 'express';
import authRoutes from '../core/auth/auth.routes.js';
import otpAuthRoutes from '../core/auth/otpAuth/otpAuth.routes.js';
import { registerAllAuthAudiences } from '../core/auth/otpAuth/registerAudiences.js';
import { registerHotelNotificationOwners } from '../modules/hotel/notifications/owners.js';
import deliveryRoutes from '../modules/food/delivery/routes/delivery.routes.js';
import restaurantRoutes from '../modules/food/restaurant/routes/restaurant.routes.js';
import landingRoutes from '../modules/food/landing/routes/landing.routes.js';
import { getPublicDiningCategories, getPublicDiningRestaurants } from '../modules/food/dining/controllers/diningPublic.controller.js';
import uploadRoutes from '../modules/uploads/routes/upload.routes.js';
import platformAdminRoutes from '../core/admin/admin.routes.js';
import { festivalsRouter } from '../modules/festivals/routes/index.js';
import restaurantAdminRoutes from '../modules/food/admin/routes/admin.routes.js';
import userRoutes from '../modules/food/user/routes/user.routes.js';
import foodCartRoutes from '../modules/food/user/routes/foodCart.routes.js';
import orderUserRoutes from '../modules/food/orders/routes/order.routes.user.js';
import paymentRoutes from '../core/payments/payment.routes.js';
import fcmRoutes from '../core/notifications/fcm.routes.js';
import notificationRoutes from '../core/notifications/notification.routes.js';
import { authMiddleware } from '../core/auth/auth.middleware.js';
import * as businessSettingsController from '../modules/food/admin/controllers/businessSettings.controller.js';
import * as systemConfigController from '../modules/food/admin/controllers/systemConfig.controller.js';
import { requireRoles } from '../core/roles/role.middleware.js';
import { getQueuesController } from '../controllers/admin.controller.js';
import webhookRoutes from '../core/payments/routes/webhook.routes.js';
import searchRoutes from '../modules/food/search/routes/search.routes.js';
import diningBookingRoutes from '../modules/food/dining/routes/diningBooking.routes.js';
import { maintenanceModeMiddleware } from '../modules/food/admin/middleware/maintenanceMode.middleware.js';
import { taxiRouter } from '../modules/taxi/routes/index.js';
import { hotelRouter } from '../modules/hotel/routes/index.js';
import { toursRouter } from '../modules/tours/routes/index.js';
import { promotionsRouter as taxiPromotionsRouter } from '../modules/taxi/admin/promotions/routes/index.js';

const router = express.Router();

router.get('/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

router.get('/v1/food/public/customization-settings', systemConfigController.getCustomizationSettings);
router.get('/v1/food/public/restaurant-settings', systemConfigController.getRestaurantSettings);
router.get('/v1/food/admin/business-settings/public', businessSettingsController.getBusinessSettings);

router.use(maintenanceModeMiddleware);

router.use('/v1/food/auth', authRoutes);
router.use('/v1/auth', authRoutes);

// One OTP auth surface for all five apps (user, restaurant, delivery,
// taxi-driver, hotel-partner). The per-app auth routes above still work.
registerAllAuthAudiences();
// Hotel contributes its own notification owner types (core never imports
// hotel models); food and taxi types are built into core/notifications.
registerHotelNotificationOwners();
router.use('/v1/auth/otp', otpAuthRoutes);
router.use('/v1/food/delivery', deliveryRoutes);
router.use('/v1/food/restaurant', restaurantRoutes);
router.use('/v1/food', landingRoutes);
router.use('/v1/food/search', searchRoutes);
router.get('/v1/food/dining/categories/public', getPublicDiningCategories);
router.get('/v1/food/dining/restaurants/public', getPublicDiningRestaurants);
router.use('/v1/food/dining/bookings', diningBookingRoutes);
router.use('/v1/uploads', uploadRoutes);
// Platform-level administrator management (profile, administrators, RBAC meta).
router.use('/v1/admin', platformAdminRoutes);
router.use('/v1/festivals', festivalsRouter);

router.use('/v1/food/admin', authMiddleware, requireRoles('ADMIN', 'SUB_ADMIN'), restaurantAdminRoutes);
router.use('/v1/food/user', authMiddleware, requireRoles('USER'), userRoutes);
router.use('/v1/food/cart', authMiddleware, requireRoles('USER'), foodCartRoutes);
router.use('/v1/food/notifications', authMiddleware, requireRoles('USER', 'RESTAURANT', 'DELIVERY_PARTNER'), notificationRoutes);
router.use('/v1/food/orders', authMiddleware, requireRoles('USER'), orderUserRoutes);
router.use('/v1/food/payments', authMiddleware, paymentRoutes);
router.use('/v1/payments/webhook', webhookRoutes);
router.use('/v1/fcm-tokens', fcmRoutes);
router.use('/fcm-tokens', fcmRoutes);

router.get('/v1/admin/queues', authMiddleware, requireRoles('ADMIN'), getQueuesController);
router.use('/v1', taxiPromotionsRouter);
router.use('/v1/taxi', taxiRouter);
router.use('/v1/hotel', hotelRouter);
router.use('/v1/tours', toursRouter);

export default router;
