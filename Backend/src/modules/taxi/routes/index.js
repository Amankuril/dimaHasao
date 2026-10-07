import { Router } from 'express';
import { enforceModuleAvailability } from '../../../core/platform/moduleAvailability.middleware.js';
import { chatModuleRouter } from '../chat/routes/index.js';
import { adminModuleRouter } from '../admin/routes/index.js';
import { enforceAdminFeatureAccess } from '../../../core/admin/adminFeatureAccess.middleware.js';
import { driverModuleRouter } from '../driver/routes/index.js';
import { supportModuleRouter } from '../support/routes/index.js';
import { userModuleRouter } from '../user/routes/index.js';
import { commonRouter } from '../common/routes/commonRoutes.js';

export const taxiRouter = Router();

/*
 * Chat is mounted ahead of the module gate (support stays reachable while the
 * module is paused), but it used to be ahead of the admin feature gate too, so
 * any admin token — a sub-admin with no taxi grant at all — could read every
 * rider and driver conversation. The gate runs on /chats now. Rider and driver
 * tokens pass straight through it (it only acts on admin tokens). The feature
 * catalogue grants it as 'taxi.support_chat'; addPrefix puts '/chats' back on
 * the path, since mounting here strips it.
 */
taxiRouter.use('/chats', enforceAdminFeatureAccess('taxi', { addPrefix: '/chats' }));
taxiRouter.use(chatModuleRouter);
taxiRouter.use(enforceModuleAvailability('taxi'));
taxiRouter.use(enforceAdminFeatureAccess('taxi', { stripPrefix: '/admin' }), adminModuleRouter);
taxiRouter.use(userModuleRouter);
taxiRouter.use(driverModuleRouter);
taxiRouter.use(supportModuleRouter);
taxiRouter.use(commonRouter);
