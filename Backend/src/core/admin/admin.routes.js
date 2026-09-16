import express from 'express';
import { authMiddleware, requireAdmin } from '../auth/auth.middleware.js';
import {
  loadAdmin,
  getMyAdminProfile,
  updateMyAdminProfile,
  getAdminMeta,
  listAdministrators,
  createAdministrator,
  updateAdministrator,
  requirePlatformSuperAdmin,
} from './admin.controller.js';

const router = express.Router();

// loadAdmin is what turns the token's { userId, role } into the real admin
// document; every guard below depends on it.
router.use(authMiddleware, requireAdmin, loadAdmin);

// Any admin may read and edit their own profile.
router.get('/me', getMyAdminProfile);
router.patch('/me', updateMyAdminProfile);
router.get('/meta', getAdminMeta);

// Managing other administrators is platform-superadmin only.
router.get('/administrators', requirePlatformSuperAdmin, listAdministrators);
router.post('/administrators', requirePlatformSuperAdmin, createAdministrator);
router.patch('/administrators/:id', requirePlatformSuperAdmin, updateAdministrator);

export default router;
