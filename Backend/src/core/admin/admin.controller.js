/**
 * Platform-level administrator management.
 *
 * The existing sub-admin CRUD lives under /food/admin and predates the admin
 * hierarchy — it has no notion of `adminLevel`, `module` or `servicesAccess`,
 * so it cannot create a tours or hotel superadmin. These endpoints speak the
 * hierarchy directly and are namespaced at the platform root, because an
 * administrator is not a food thing.
 */
import { FoodAdmin } from './admin.model.js';
import {
  FEATURE_ACTIONS,
  deriveLegacyPermissions,
  listAdminFeatures,
  normalizeFeaturePermissions,
} from './adminFeatures.js';
import {
  ADMIN_LEVELS,
  ADMIN_MODULES,
  ALL_ADMIN_MODULES,
  MODULE_SUPERADMIN_LEVELS,
} from './adminHierarchy.constants.js';
import { resolveAdminLevel, isPlatformSuperAdmin } from './adminHierarchy.service.js';

/** Never leak the hash, the reset OTP or its expiry. */
const PUBLIC_FIELDS =
  '-password -resetPasswordOtp -resetPasswordExpires';

const present = (admin) => {
  const doc = admin?.toObject ? admin.toObject() : { ...admin };
  delete doc.password;
  delete doc.resetPasswordOtp;
  delete doc.resetPasswordExpires;
  // Always report the *resolved* level, so the UI shows what the server will
  // actually enforce rather than a possibly-absent stored value.
  doc.adminLevel = resolveAdminLevel(doc);
  return doc;
};

/** @route GET /v1/admin/me */
export const getMyAdminProfile = async (req, res) => {
  try {
    res.json({ success: true, admin: present(req.admin) });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your profile' });
  }
};

/** Fields an admin may change about themselves. Never a level or a scope. */
const SELF_EDITABLE = ['name', 'phone', 'profileImage', 'profileImagePublicId'];

/** @route PATCH /v1/admin/me */
export const updateMyAdminProfile = async (req, res) => {
  try {
    const admin = await FoodAdmin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    for (const key of SELF_EDITABLE) {
      if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;
      const value = String(req.body[key] ?? '').trim();
      // Blank phone must be unset, not '', or the unique+sparse phone index
      // collides with every other admin who left it blank.
      if (key === 'phone' && !value) admin.set('phone', undefined);
      else admin[key] = value;
    }

    // Email is the login identity, so it is unique-checked rather than trusted.
    if (req.body.email !== undefined) {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
      if (email !== admin.email) {
        const taken = await FoodAdmin.exists({ _id: { $ne: admin._id }, email });
        if (taken) return res.status(409).json({ success: false, message: 'That email is already in use' });
        admin.email = email;
      }
    }

    await admin.save();
    res.json({ success: true, message: 'Profile saved', admin: present(admin) });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to save your profile' });
  }
};

/** @route GET /v1/admin/meta — the vocabulary the management UI renders. */
export const getAdminMeta = async (_req, res) => {
  res.json({
    success: true,
    levels: Object.values(ADMIN_LEVELS),
    modules: ALL_ADMIN_MODULES,
    moduleSuperadminLevels: MODULE_SUPERADMIN_LEVELS,
    // The permission checkboxes come from here rather than a second list in
    // the frontend that would drift the first time a feature is added.
    features: listAdminFeatures(),
    featureActions: FEATURE_ACTIONS,
  });
};

/** @route GET /v1/admin/administrators */
export const listAdministrators = async (req, res) => {
  try {
    const admins = await FoodAdmin.find({})
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      administrators: admins.map(present),
      total: admins.length,
    });
  } catch (error) {
    console.error('List administrators error:', error);
    res.status(500).json({ success: false, message: 'Failed to load administrators' });
  }
};

/** Normalise and sanity-check the scope fields shared by create and update. */
const readScope = (body = {}) => {
  const level = String(body.adminLevel || '').trim().toLowerCase();
  const services = Array.isArray(body.servicesAccess)
    ? [...new Set(body.servicesAccess.filter((s) => ALL_ADMIN_MODULES.includes(s)))]
    : [];
  const module = String(body.module || '').trim().toLowerCase();

  if (level && !Object.values(ADMIN_LEVELS).includes(level)) {
    return { error: 'Unknown admin level' };
  }
  if (module && !ALL_ADMIN_MODULES.includes(module)) {
    return { error: 'Unknown module' };
  }
  /*
   * A subadmin is scoped by servicesAccess, which is a list — one admin can
   * hold taxi and hotel at once. `module` stays for the single-module case the
   * hierarchy still reads (resolveAdminModule), and is left null otherwise.
   */
  if (level === ADMIN_LEVELS.SUBADMIN && !module && services.length === 0) {
    return { error: 'A subadmin needs at least one module' };
  }

  return {
    level,
    services,
    module: module || (services.length === 1 ? services[0] : null),
  };
};

/** @route POST /v1/admin/administrators */
export const createAdministrator = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (await FoodAdmin.exists({ email })) {
      return res.status(409).json({ success: false, message: 'An admin with that email already exists' });
    }

    const scope = readScope(req.body);
    if (scope.error) return res.status(400).json({ success: false, message: scope.error });

    const grants = normalizeFeaturePermissions(req.body.featurePermissions);

    const admin = await FoodAdmin.create({
      email,
      password, // hashed by the schema's pre-save hook
      name: String(req.body.name || '').trim(),
      phone: String(req.body.phone || '').trim() || undefined,
      role: 'ADMIN',
      adminLevel: scope.level || ADMIN_LEVELS.SUBADMIN,
      module: scope.module,
      servicesAccess: scope.services.length ? scope.services : [ADMIN_MODULES.FOOD],
      admin_type: scope.level === ADMIN_LEVELS.SUBADMIN ? 'subadmin' : 'superadmin',
      // Without this a subadmin was created with a module and no features —
      // able to reach the panel and nothing inside it.
      featurePermissions: grants,
      // Taxi's admin services still read the older string permissions, so the
      // same access is written in both vocabularies from one source.
      permissions: deriveLegacyPermissions(grants),
      parentAdminId: req.admin._id,
      isActive: true,
      active: true,
      status: 'active',
    });

    res.status(201).json({ success: true, message: 'Administrator created', administrator: present(admin) });
  } catch (error) {
    console.error('Create administrator error:', error);
    res.status(500).json({ success: false, message: 'Failed to create this administrator' });
  }
};

/** @route PATCH /v1/admin/administrators/:id */
export const updateAdministrator = async (req, res) => {
  try {
    const admin = await FoodAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Administrator not found' });

    // Locking yourself out is a support ticket, so it is simply not allowed.
    const isSelf = String(admin._id) === String(req.admin._id);
    if (isSelf && req.body.isActive === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }
    if (isSelf && req.body.adminLevel && req.body.adminLevel !== resolveAdminLevel(admin)) {
      return res.status(400).json({ success: false, message: 'You cannot change your own access level' });
    }

    if (req.body.name !== undefined) admin.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone).trim();
      if (phone) admin.phone = phone; else admin.set('phone', undefined);
    }

    if (req.body.adminLevel !== undefined || req.body.servicesAccess !== undefined || req.body.module !== undefined) {
      const scope = readScope(req.body);
      if (scope.error) return res.status(400).json({ success: false, message: scope.error });
      if (req.body.adminLevel !== undefined) {
        admin.adminLevel = scope.level;
        admin.admin_type = scope.level === ADMIN_LEVELS.SUBADMIN ? 'subadmin' : 'superadmin';
      }
      if (req.body.module !== undefined) admin.module = scope.module;
      if (req.body.servicesAccess !== undefined) admin.servicesAccess = scope.services;
    }

    if (req.body.featurePermissions !== undefined) {
      const grants = normalizeFeaturePermissions(req.body.featurePermissions);
      admin.featurePermissions = grants;
      admin.permissions = deriveLegacyPermissions(grants);
      // Mixed paths are not tracked by Mongoose unless it is told.
      admin.markModified('featurePermissions');
    }

    if (req.body.isActive !== undefined) {
      admin.isActive = Boolean(req.body.isActive);
      admin.active = admin.isActive;
      admin.status = admin.isActive ? 'active' : 'inactive';
    }

    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }
      admin.password = String(req.body.password); // hashed by the pre-save hook
    }

    await admin.save();
    res.json({ success: true, message: 'Administrator updated', administrator: present(admin) });
  } catch (error) {
    console.error('Update administrator error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this administrator' });
  }
};

/**
 * Load the caller's admin document onto `req.admin`.
 *
 * The shared auth middleware only decodes `{ userId, role }` from the token —
 * it never reads the database. Without this, `resolveAdminLevel` sees an object
 * with no `servicesAccess`, reads that as "unrestricted", and hands every
 * admin platform-superadmin rights.
 */
export const loadAdmin = async (req, res, next) => {
  try {
    const id = req.user?.userId || req.user?._id || req.user?.id;
    const admin = await FoodAdmin.findById(id).select(PUBLIC_FIELDS);
    if (!admin) return res.status(401).json({ success: false, message: 'Admin account not found' });
    if (admin.isActive === false) {
      return res.status(403).json({ success: false, message: 'This admin account is deactivated' });
    }
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Load admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve your admin account' });
  }
};

/** Only a platform superadmin may manage other administrators. */
export const requirePlatformSuperAdmin = (req, res, next) => {
  if (!isPlatformSuperAdmin(req.admin)) {
    return res.status(403).json({
      success: false,
      message: 'Only a platform superadmin can manage administrators',
    });
  }
  next();
};

export default {
  loadAdmin,
  getMyAdminProfile,
  updateMyAdminProfile,
  getAdminMeta,
  listAdministrators,
  createAdministrator,
  updateAdministrator,
  requirePlatformSuperAdmin,
};
