/**
 * The Dima Hasao Tourism marks.
 *
 * One crest per audience: the same circular Dimasa-weave border, with a
 * different centre for whoever is looking at it. They live in /public and are
 * referenced by path rather than imported, so a mark can be swapped by
 * replacing the file — no rebuild of the importing chunk.
 *
 * Use the named export for the surface you are on. `DEFAULT_BRAND_LOGO` is the
 * district crest and stays the fallback for anything shared across audiences
 * (the admin console, the platform footer).
 */

/** Consumer app — the Juthai gate and dancers. */
export const CONSUMER_BRAND_LOGO = "/logo-user.png"

/** Restaurant partner panel — the stay-and-eat mark. */
export const RESTAURANT_BRAND_LOGO = "/logo-restaurant.png"

/** Hotel partner panel — the operator mark. */
export const HOTEL_BRAND_LOGO = "/logo-hotel.png"

/** Taxi drivers and food delivery partners — the on-the-road mark. */
export const DRIVER_BRAND_LOGO = "/logo-driver.png"

/** The district crest. Shared surfaces and the fallback. */
export const DEFAULT_BRAND_LOGO = "/logo.png"

/** @deprecated Use DEFAULT_BRAND_LOGO */
export const DEFAULT_BRAND_LOGO_PUBLIC = DEFAULT_BRAND_LOGO
