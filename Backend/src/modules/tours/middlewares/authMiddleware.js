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
import TourOperator from '../models/TourOperator.js';
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
   * All three collections are asked at once, and the first hit in the original
   * order wins.
   *
   * These ran in series, and the comment above is only true of the operator
   * panel: /bookings/my is a consumer route, and a consumer missed the operator
   * and admin collections before hitting the third. Three round trips at this
   * stack's ~40ms floor accounted for nearly all of that endpoint's 131ms —
   * spent before the handler ran, on a response that was empty.
   *
   * Precedence is unchanged: operator, then admin, then user.
   */
  const [operator, admin, user] = await Promise.all([
    TourOperator.findById(id),
    FoodAdmin.findById(id),
    FoodUser.findById(id),
  ]);

  if (operator) return { account: operator, role: 'operator' };
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

/** An approved, unblocked operator — the bar for selling anything. */
export const requireApprovedOperator = (req, res, next) => {
  if (req.userRole !== 'operator') {
    return res.status(403).json({ message: 'Operator account required' });
  }
  if (req.user.operatorApprovalStatus !== 'approved') {
    return res.status(403).json({
      message: 'Your operator account is awaiting admin approval.',
      operatorApprovalStatus: req.user.operatorApprovalStatus,
    });
  }
  next();
};

export default { protect, authorizedRoles, optionalProtect, requireApprovedOperator };
