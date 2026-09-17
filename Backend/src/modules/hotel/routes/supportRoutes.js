import { createSupportRouter } from '../../../core/support/support.routes.js';
import { protect } from '../middlewares/authMiddleware.js';

/**
 * Hotel support — guests and property partners, one desk.
 *
 * Hotel's protect normalises the platform role into its own vocabulary and
 * leaves it on `req.user.role`; admins are excluded because they answer tickets
 * on the Global desk rather than raising them here.
 */
export default createSupportRouter({
  module: 'hotel',
  protect,
  resolveRole: (req) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'partner') return 'partner';
    if (role === 'user') return 'user';
    return null;
  },
});
