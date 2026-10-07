import { Router } from 'express';
import { authenticate } from '../../../middlewares/authMiddleware.js';
import { enforceAdminFeatureAccess } from '../../../../../core/admin/adminFeatureAccess.middleware.js';
import {
  createBanner,
  createPromoCode,
  deleteBanner,
  deleteNotification,
  deletePromoCode,
  getBanners,
  getNotifications,
  getPromoCodes,
  getPromotionsBootstrap,
  getPromotionsServiceLocations,
  getPromotionsUsers,
  pushBanner,
  sendNotification,
  togglePromoCodeStatus,
  updateBanner,
  updatePromoCode,
} from '../controllers/promotionsController.js';

export const promotionsRouter = Router();

// Mounted at /v1 (routes/index.js), outside the taxi mount, so it never passed
// the sub-admin feature gate: any admin — a food-only sub-admin included —
// could create taxi promo codes and push notifications to every rider.
promotionsRouter.use('/admin', authenticate(['admin']), enforceAdminFeatureAccess('taxi'));

promotionsRouter.get('/admin/promotions/bootstrap', getPromotionsBootstrap);
promotionsRouter.get('/admin/promos', getPromoCodes);
promotionsRouter.post('/admin/promos', createPromoCode);
promotionsRouter.patch('/admin/promos/:id', updatePromoCode);
promotionsRouter.patch('/admin/promos/:id/toggle', togglePromoCodeStatus);
promotionsRouter.delete('/admin/promos/:id', deletePromoCode);
promotionsRouter.get('/admin/promos/users', getPromotionsUsers);
promotionsRouter.get('/admin/promos/service-locations', getPromotionsServiceLocations);

promotionsRouter.get('/admin/notifications', getNotifications);
promotionsRouter.post('/admin/notifications', sendNotification);
promotionsRouter.post('/admin/notifications/send', sendNotification);
promotionsRouter.delete('/admin/notifications/:id', deleteNotification);
promotionsRouter.delete('/admin/push-notifications/:id', deleteNotification);

promotionsRouter.get('/admin/banners', getBanners);
promotionsRouter.post('/admin/banners', createBanner);
promotionsRouter.patch('/admin/banners/:id', updateBanner);
promotionsRouter.delete('/admin/banners/:id', deleteBanner);
promotionsRouter.post('/admin/banners/:id/push', pushBanner);
