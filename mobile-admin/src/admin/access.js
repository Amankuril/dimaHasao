/*
 * Which admin panels a person can open and where they land, ported from
 * Frontend/src/shared/utils/adminHome.js and activeModule.js. One rule for the
 * login redirect and the module switcher, as on the web.
 */
import { getCurrentUser } from './session';

export const FOOD_ADMIN_HOME = '/admin/food';
export const TAXI_ADMIN_HOME = '/taxi/admin/dashboard';
export const HOTEL_ADMIN_HOME = '/hotel/admin/dashboard';
export const TOURS_ADMIN_HOME = '/tours/admin';
export const GLOBAL_ADMIN_HOME = '/global/admin';

/**
 * A module is visible to the platform superadmin, to that module's own
 * superadmin, and to a subadmin scoped to it (several modules: servicesAccess;
 * one: `module`). A profile with no adminLevel is a legacy session: show all.
 */
export const canSeeAdminModule = (profile = {}, moduleKey) => {
  if (!profile.adminLevel) return true;
  if (profile.adminLevel === 'platform_superadmin') return true;
  if (profile.adminLevel === `${moduleKey}_superadmin`) return true;
  if (profile.adminLevel === 'subadmin') {
    const services = Array.isArray(profile.servicesAccess) ? profile.servicesAccess : [];
    if (services.length) return services.includes(moduleKey);
    return profile.module === moduleKey;
  }
  return false;
};

const MODULE_HOMES = [
  ['food', FOOD_ADMIN_HOME],
  ['taxi', TAXI_ADMIN_HOME],
  ['hotel', HOTEL_ADMIN_HOME],
  ['tours', TOURS_ADMIN_HOME],
];

/** Where to send an admin after sign-in: the first panel they can open; Global for everyone else. */
export const resolveAdminHome = (profile = {}) => {
  const match = MODULE_HOMES.find(([moduleKey]) => canSeeAdminModule(profile, moduleKey));
  return match ? match[1] : GLOBAL_ADMIN_HOME;
};

export const currentAdminHome = () => resolveAdminHome(getCurrentUser('admin') || {});

/** The panel a path belongs to. */
export function adminModuleOf(pathname = '') {
  const p = String(pathname);
  if (p.startsWith('/taxi')) return 'taxi';
  if (p.startsWith('/hotel')) return 'hotel';
  if (p.startsWith('/tours')) return 'tours';
  if (p.startsWith('/global')) return 'global';
  return 'food';
}
