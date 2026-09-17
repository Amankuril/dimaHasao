import { createSupportRouter } from '../../../core/support/support.routes.js';
import { protect } from '../middlewares/authMiddleware.js';

/**
 * Tours support — travellers and operators, one desk.
 *
 * The role comes from `req.userRole`, which tours' own protect sets from the
 * account it resolved; admins are excluded because they answer tickets on the
 * Global desk rather than raising them here.
 */
export default createSupportRouter({
  module: 'tours',
  protect,
  resolveRole: (req) => (['user', 'operator'].includes(req.userRole) ? req.userRole : null),
});
