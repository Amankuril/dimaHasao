/**
 * Hotel admins ARE platform admins — this file is a shim over FoodAdmin.
 *
 * The two schemas already pointed at the same `admins` collection (hotel's
 * `mongoose.model('Admin')` pluralises to it; FoodAdmin names it explicitly),
 * so they were reading and writing the same documents while disagreeing about
 * their shape. Hotel wrote `role: 'admin'` lowercase and read
 * `{ role: { $in: ['admin','superadmin'] } }`, while every real record stores
 * `role: 'ADMIN'` — so hotel's "notify the admins" lookups had been silently
 * matching nobody.
 *
 * Keeping the filename and default export means the six hotel files that
 * import it did not have to change, the same approach taxi's admin model and
 * the SMS/email shims already use.
 */
import { FoodAdmin } from '../../../core/admin/admin.model.js';

/**
 * Matches a platform admin regardless of how the role was cased when written.
 * Use this instead of a hard-coded `['admin','superadmin']` list.
 */
export const PLATFORM_ADMIN_QUERY = {
  role: { $in: [/^admin$/i, /^super_?admin$/i] },
};

/** The admin who should receive a hotel-wide notice, or null. */
export const findPlatformAdmin = () =>
  FoodAdmin.findOne({ ...PLATFORM_ADMIN_QUERY, isActive: { $ne: false } });

/** Every admin who should receive a hotel-wide notice. */
export const findPlatformAdmins = () =>
  FoodAdmin.find({ ...PLATFORM_ADMIN_QUERY, isActive: { $ne: false } });

export const Admin = FoodAdmin;
export default FoodAdmin;
