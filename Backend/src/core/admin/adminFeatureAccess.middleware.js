/**
 * Enforce a sub-admin's module and feature grants, for every module's panel.
 *
 * One middleware rather than one per module: the catalogue already knows which
 * feature owns which path, so the only thing that differs between panels is
 * where the request carries its admin and what prefix to strip. Both are
 * arguments.
 *
 * Superadmins pass straight through. Only a sub-admin is filtered, and it fails
 * closed — a path no feature claims is refused rather than allowed, so adding a
 * route to an admin panel cannot quietly hand it to everyone. Anything that
 * should be open to any signed-in admin belongs in ALWAYS_ALLOWED_PATHS or
 * outside the admin mount.
 */
import { FoodAdmin } from './admin.model.js';
import { verifyAccessToken } from '../auth/token.util.js';
import { isSuperAdminLike, hasModuleAccess } from './adminHierarchy.service.js';
import {
  actionForMethod,
  findFeatureForPath,
  hasFeatureAction,
  isAlwaysAllowedPath,
} from './adminFeatures.js';

const ADMIN_FIELDS =
  'role adminLevel admin_type module servicesAccess permissions featurePermissions isActive active';

/**
 * The subject of whatever bearer token came with this request.
 *
 * Every module signs a different claim — `userId` in food, `sub` in taxi, `id`
 * in hotel — so all three are read.
 */
const subjectFromToken = (req) => {
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Bearer ')) return '';

  try {
    const decoded = verifyAccessToken(header.slice(7).trim());
    return String(decoded?.userId || decoded?.sub || decoded?.id || '');
  } catch {
    return '';
  }
};

/**
 * The admin behind this request.
 *
 * This deliberately does not rely on a module having authenticated first.
 * Taxi, hotel and tours all apply their `protect` inside their admin router,
 * which is after this middleware — so reading only `req.user`/`req.auth` found
 * nothing and waved every request through. A guard that silently passes is
 * worse than no guard, so it resolves the admin itself and works wherever it
 * is mounted. A request with no admin behind it is left to the module's own
 * auth to reject.
 */
const resolveAdmin = async (req) => {
  if (req.adminAccount !== undefined) return req.adminAccount;

  const candidate = req.admin || req.auth?.admin || req.auth?.entity || req.user || null;

  // Already a document carrying grants — nothing to load.
  if (candidate && (candidate.featurePermissions || candidate.servicesAccess)) {
    req.adminAccount = candidate;
    return candidate;
  }

  const id =
    candidate?._id || candidate?.userId || candidate?.id || req.auth?.sub || subjectFromToken(req);

  if (!id) {
    req.adminAccount = null;
    return null;
  }

  req.adminAccount = await FoodAdmin.findById(String(id)).select(ADMIN_FIELDS).catch(() => null);
  return req.adminAccount;
};

const deny = (res, message) => res.status(403).json({ success: false, message });

/**
 * @param {string} module - which module's panel this mount serves
 * @param {{ stripPrefix?: string }} [options] - taxi's admin routes are declared
 *   as `/admin/...` under a mount that is not `/admin`, so the prefix comes off
 *   before the catalogue sees the path.
 */
export const enforceAdminFeatureAccess = (module, { stripPrefix = '' } = {}) =>
  async function adminFeatureAccess(req, res, next) {
    try {
      const admin = await resolveAdmin(req);

      // No admin on the request means this mount is not admin-authenticated
      // yet; leave that to whatever guard owns it rather than inventing a
      // verdict here.
      if (!admin) return next();

      if (isSuperAdminLike(admin)) return next();

      if (!hasModuleAccess(admin, module)) {
        return deny(res, 'You do not have access to this module');
      }

      let path = String(req.path || '/');
      if (stripPrefix && (path === stripPrefix || path.startsWith(`${stripPrefix}/`))) {
        path = path.slice(stripPrefix.length) || '/';
      }

      if (isAlwaysAllowedPath(path)) return next();

      const permission = findFeatureForPath(module, path);
      if (!permission) {
        return deny(res, 'You do not have access to this area');
      }

      const action = actionForMethod(req.method);
      if (!hasFeatureAction(admin.featurePermissions || {}, permission, action)) {
        return deny(res, `You do not have permission to ${action} this`);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

export default enforceAdminFeatureAccess;
