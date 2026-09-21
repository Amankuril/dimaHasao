import express from 'express';
import { authMiddleware, requireAdmin } from '../auth/auth.middleware.js';
import { legalAdminRouter } from '../legal/legal.routes.js';
import { platformAdminRouter } from '../platform/platform.routes.js';
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
import {
  listAllTickets,
  getTicketStats,
  getTicketForAdmin,
  updateTicketForAdmin,
  replyAsAdmin,
} from '../support/support.controller.js';
import {
  getOverview,
  getTimeseries,
  getTopVendors,
  getModuleReport,
  exportReport,
} from '../reports/reports.controller.js';

const router = express.Router();

// loadAdmin is what turns the token's { userId, role } into the real admin
// document; every guard below depends on it.
router.use(authMiddleware, requireAdmin, loadAdmin);

// Privacy, terms and the rest — one copy for every app, edited here.
router.use('/legal', legalAdminRouter);
// Brand name, logo and contact — one copy for every app.
router.use('/platform-settings', platformAdminRouter);

// Any admin may read and edit their own profile.
router.get('/me', getMyAdminProfile);
router.patch('/me', updateMyAdminProfile);
router.get('/meta', getAdminMeta);

// The support desk every module's tickets land in. Any admin may work it —
// narrowing it by module would recreate the four separate inboxes this replaced.
// '/stats' before '/:id' so it is never read as a ticket id.
router.get('/support', listAllTickets);
router.get('/support/stats', getTicketStats);
router.get('/support/:id', getTicketForAdmin);
router.patch('/support/:id', updateTicketForAdmin);
router.post('/support/:id/messages', replyAsAdmin);

// Platform reports: the cross-module view no single module's panel can build.
// The fixed paths come before '/:module' so they are never read as one.
router.get('/reports/overview', getOverview);
router.get('/reports/timeseries', getTimeseries);
router.get('/reports/top', getTopVendors);
router.get('/reports/export/:report', exportReport);
router.get('/reports/:module', getModuleReport);

// Managing other administrators is platform-superadmin only.
router.get('/administrators', requirePlatformSuperAdmin, listAdministrators);
router.post('/administrators', requirePlatformSuperAdmin, createAdministrator);
router.patch('/administrators/:id', requirePlatformSuperAdmin, updateAdministrator);

export default router;
