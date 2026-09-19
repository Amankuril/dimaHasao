/**
 * Tours auth.
 *
 * Deliberately leaner than the hotel module's: hotel has to accept a second
 * legacy JWT secret and normalise uppercase platform roles because it arrived
 * from a standalone service. Tours is new, so there is exactly one secret and
 * one role vocabulary.
 *
 * Note the hotel bug this avoids: treating "role is not lowercase" as proof of
 * an admin promoted every signed-in consumer to hotel admin. Here an admin is
 * only ever an account resolved from the admin collection.
 */
import jwt from 'jsonwebtoken';
import FoodAdmin from '../../../core/admin/admin.model.js';
import { FoodUser } from '../../../core/users/user.model.js';

const verifyToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);

const readToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

/**
 * Resolve the caller, tagging the role this module authorises on.
 * Operators first — they are the common case on this router.
 */
const resolveAccount = async (decoded) => {
  const id = decoded?.id || decoded?.userId;
  if (!id) return null;

  /*
   * Both collections are asked at once and admin wins, as it always did.
   *
   * These used to run in series across three collections, operator first. That
   * cost a consumer route like /bookings/my two wasted round trips at this
   * stack's ~40ms floor before the handler even ran. The operator collection
   * is gone with the vendor panel, so this is now two.
   */
  const [admin, user] = await Promise.all([
    FoodAdmin.findById(id),
    FoodUser.findById(id),
  ]);

  if (admin) {
    return {
      account: admin,
      role: admin.adminLevel === 'platform_superadmin' ? 'superadmin' : 'admin',
    };
  }
  if (user) return { account: user, role: 'user' };

  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    const resolved = await resolveAccount(verifyToken(token));
    if (!resolved) {
      return res.status(401).json({ message: 'The account for this token no longer exists.' });
    }

    if (resolved.account.isBlocked) {
      return res.status(403).json({
        message: 'Your account has been blocked. Please contact support.',
        isBlocked: true,
      });
    }

    req.user = resolved.account;
    // Kept off the document so nothing can persist it by accident.
    req.userRole = resolved.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token' });
    console.error('[tours auth]', error);
    return res.status(401).json({ message: 'Not authorized' });
  }
};

export const authorizedRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ message: `Role ${req.userRole} is not authorized for this route` });
  }
  next();
};

/** For public endpoints that behave slightly differently when signed in. */
export const optionalProtect = async (req, _res, next) => {
  try {
    const token = readToken(req);
    if (token) {
      const resolved = await resolveAccount(verifyToken(token));
      if (resolved && !resolved.account.isBlocked) {
        req.user = resolved.account;
        req.userRole = resolved.role;
      }
    }
  } catch {
    // A bad token on an optional route is simply an anonymous visitor.
  }
  next();
};

export default { protect, authorizedRoles, optionalProtect };
