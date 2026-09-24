/**
 * Refuse a module's API while it is switched off.
 *
 * The screen gate alone would only hide a module: anyone already in the app, on
 * an older build, or calling the API directly would carry straight on. This is
 * the half that actually closes it.
 *
 * Admin traffic is never blocked — the switch that reopens a module lives
 * behind it, and locking an admin out of their own maintenance screen is how a
 * short outage becomes a long one.
 */
import { readModuleToggle, DEFAULT_MAINTENANCE_MESSAGE } from './moduleToggles.service.js';

/** Admin surfaces inside a module's own path space. */
const isAdminPath = (path = '') => {
    const normalized = String(path || '');
    return normalized === '/admin' || normalized.startsWith('/admin/');
};

export const enforceModuleAvailability = (module) =>
    async function moduleAvailability(req, res, next) {
        try {
            if (isAdminPath(req.path)) return next();

            const { enabled, message } = await readModuleToggle(module);
            if (enabled) return next();

            return res.status(503).json({
                success: false,
                maintenance: true,
                module,
                message: message || DEFAULT_MAINTENANCE_MESSAGE,
            });
        } catch {
            // Fail open, exactly as the service does.
            return next();
        }
    };

export default enforceModuleAvailability;
