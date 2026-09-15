import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getOperators,
  getOperatorDetail,
  updateOperatorApproval,
  updateOperatorBlock,
  getAdminPackages,
  createPackageForOperator,
  updatePackageStatus,
  getAdminBookings,
  getDashboardStats,
  getWithdrawals,
  updateWithdrawalStatus,
  getSettings,
  updateSettings,
} from '../controllers/adminController.js';
import { getAdminReviews, updateReviewStatus } from '../controllers/reviewController.js';

const router = express.Router();

// Role-only, matching hotel. Module scoping (`servicesAccess: ['tours']`) is not
// enforced yet: every existing admin defaults to ['food'], so turning it on now
// would lock them all out of a panel they are meant to run.
router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

router.get('/dashboard', getDashboardStats);

router.get('/operators', getOperators);
router.get('/operators/:id', getOperatorDetail);
router.patch('/operators/:id/approval', updateOperatorApproval);
router.patch('/operators/:id/block', updateOperatorBlock);

router.get('/packages', getAdminPackages);
router.post('/packages', createPackageForOperator);
router.patch('/packages/:id/status', updatePackageStatus);

router.get('/bookings', getAdminBookings);

router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id/status', updateReviewStatus);

router.get('/withdrawals', getWithdrawals);
router.patch('/withdrawals/:id/status', updateWithdrawalStatus);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
