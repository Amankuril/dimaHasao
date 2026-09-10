import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import { FoodAdmin } from '../../../core/admin/admin.model.js';

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
const withHotelRole = (account) => {
  if (!account) return null;

  const raw = String(account.role || '');
  if (raw && raw === raw.toLowerCase()) return account; // already hotel vocabulary

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
  if (!account) account = await Admin.findById(id);
  if (!account) account = await FoodAdmin.findById(id);

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
