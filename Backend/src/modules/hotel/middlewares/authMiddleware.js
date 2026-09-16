import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import { FoodUser } from '../../../core/users/user.model.js';

// This module arrived from a standalone service that signed tokens with
// JWT_SECRET and put the subject in `id`. The platform signs with
// JWT_ACCESS_SECRET and uses `userId`, so accept both.
const TOKEN_SECRETS = () =>
  [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET].filter(Boolean);

const verifyToken = (token) => {
  let lastError = null;
  for (const secret of TOKEN_SECRETS()) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new jwt.JsonWebTokenError('No JWT secret configured');
};

// This module's Admin model and the platform's FoodAdmin share the `admins`
// collection, so a platform admin can surface through either lookup — but it
// carries the platform's uppercase role ('ADMIN'). Hotel routes authorize on
// lowercase roles, so normalize before handing the account on.
const PLATFORM_ADMIN_ROLES = new Set(['ADMIN', 'SUB_ADMIN', 'SUBADMIN', 'SUPERADMIN', 'SUPER_ADMIN']);

/** Platform role -> the hotel module's own vocabulary. */
const HOTEL_ROLE_BY_PLATFORM_ROLE = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  DELIVERY_PARTNER: 'delivery_partner',
  PARTNER: 'partner',
};

const withHotelRole = (account) => {
  if (!account) return null;

  const raw = String(account.role || '');
  if (raw && raw === raw.toLowerCase()) return account; // already hotel vocabulary

  const upper = raw.toUpperCase();

  // Only a genuine platform ADMIN becomes a hotel admin. Every platform role is
  // uppercase — USER, RESTAURANT, DELIVERY_PARTNER included — so treating
  // "not lowercase" as proof of adminhood handed the entire hotel admin panel
  // to any signed-in consumer. `adminLevel` only exists on admin accounts.
  const isPlatformAdmin =
    Boolean(account.adminLevel) || PLATFORM_ADMIN_ROLES.has(upper);

  if (!isPlatformAdmin) {
    // Keep the Mongoose document — controllers rely on constructor.modelName
    // and on being able to save it — and only override the role it reports.
    // unmarkModified keeps the rename in memory: a later save() must not write
    // 'user' over the platform's stored 'USER', which food's own guards match on.
    account.role = HOTEL_ROLE_BY_PLATFORM_ROLE[upper] || upper.toLowerCase();
    if (typeof account.unmarkModified === 'function') account.unmarkModified('role');
    return account;
  }

  const plain = typeof account.toObject === 'function' ? account.toObject() : { ...account };
  return {
    ...plain,
    role: plain.adminLevel === 'platform_superadmin' ? 'superadmin' : 'admin',
    isPlatformAdmin: true,
  };
};

// Resolves the caller across this module's collections and, failing that, the
// platform admin collection — so a platform superadmin administers hotels
// without a second login.
const resolveAccount = async (decoded) => {
  const id = decoded?.id || decoded?.userId;
  if (!id) return null;

  let account = await User.findById(id);
  if (!account) account = await Partner.findById(id);
  // Admin is a shim over FoodAdmin, so this is the platform admin collection.
  if (!account) account = await Admin.findById(id);
  // The consumer super-app (food + taxi + hotel + tours) is one account issued
  // by the unified OTP auth service, so a platform user token must resolve here
  // too — otherwise hotel would be the one app that session cannot reach.
  if (!account) account = await FoodUser.findById(id);

  return withHotelRole(account);
};

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = verifyToken(token);
    const user = await resolveAccount(decoded);

    if (!user) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    // 4. Check Blocked Status
    if (user.isBlocked) {
      console.warn(`🛡️ Auth Middleware - User ${user.name} is BLOCKED`);
      return res.status(403).json({
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error('🛡️ Auth Middleware - Invalid Token:', error.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      console.error('🛡️ Auth Middleware - Token Expired');
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('🛡️ Auth Middleware Error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

export const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const user = await resolveAccount(verifyToken(token));
      if (user && !user.isBlocked) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue even if token is invalid, but don't set req.user
    next();
  }
};

export const optionalAuth = optionalProtect;
