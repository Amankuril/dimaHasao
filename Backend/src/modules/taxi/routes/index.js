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

taxiRouter.use(chatModuleRouter);
taxiRouter.use(enforceModuleAvailability('taxi'));
taxiRouter.use(enforceAdminFeatureAccess('taxi', { stripPrefix: '/admin' }), adminModuleRouter);
taxiRouter.use(userModuleRouter);
taxiRouter.use(driverModuleRouter);
taxiRouter.use(supportModuleRouter);
taxiRouter.use(commonRouter);
