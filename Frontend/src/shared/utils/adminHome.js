/**
 * Which admin modules a person can see, and where they should land.
 *
 * The sidebar's module switcher already decided the visibility rule; the login
 * screen needs the same answer to know where to send someone after sign-in, and
 * a second copy would drift. One rule, two callers.
 */
import {
  FOOD_ADMIN_HOME,
  TAXI_ADMIN_HOME,
  HOTEL_ADMIN_HOME,
  TOURS_ADMIN_HOME,
  GLOBAL_ADMIN_HOME,
} from './activeModule.js'

/**
 * A module is visible to the platform superadmin, to that module's own
 * superadmin, and to a subadmin scoped to it. A profile with no adminLevel at
 * all is a legacy session — show everything rather than locking it out.
 */
export const canSeeAdminModule = (profile = {}, moduleKey) =>
  profile.adminLevel === 'platform_superadmin' ||
  profile.adminLevel === `${moduleKey}_superadmin` ||
  (profile.adminLevel === 'subadmin' && profile.module === moduleKey) ||
  !profile.adminLevel

/** In the order the sidebar lists them, so the landing page matches the first tab. */
const MODULE_HOMES = [
  ['food', FOOD_ADMIN_HOME],
  ['taxi', TAXI_ADMIN_HOME],
  ['hotel', HOTEL_ADMIN_HOME],
  ['tours', TOURS_ADMIN_HOME],
]

/**
 * Where to send an admin after they sign in.
 *
 * The login used to send everyone to Food, which a tours-only admin cannot even
 * open — the switcher would not show them the tab they had just been dropped
 * onto. Global is the fallback because every admin has it: it is where they
 * edit their own profile.
 */
export const resolveAdminHome = (profile = {}) => {
  const match = MODULE_HOMES.find(([moduleKey]) => canSeeAdminModule(profile, moduleKey))
  return match ? match[1] : GLOBAL_ADMIN_HOME
}

export default { canSeeAdminModule, resolveAdminHome }
