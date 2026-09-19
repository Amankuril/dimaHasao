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

/*
 * The source art is 1254x1254 at ~1.5MB per mark, which is fine as a master
 * and absurd for something drawn at 96px on a sign-in screen. Each mark is
 * served from a 384px derivative (~68kB, 96% smaller) generated from the
 * original next to it; the full-size file stays in the same folder.
 */

/** Consumer app — the Juthai gate and dancers. */
export const CONSUMER_BRAND_LOGO = "/assets/logos/user-384.png"

/** Restaurant partner panel — the stay-and-eat mark. */
export const RESTAURANT_BRAND_LOGO = "/assets/logos/restaurant-384.png"

/** Hotel partner panel — the operator mark. */
export const HOTEL_BRAND_LOGO = "/assets/logos/hotel-384.png"

/**
 * Taxi drivers and food delivery partners — the on-the-road mark.
 *
 * The art for this one has not landed yet: taxilogo.png and deliverylogo.png
 * in that folder are both byte-identical copies of the hotel mark. Pointing at
 * a name that does not exist means these screens fall back to the district
 * crest rather than showing a hotel logo to a driver. Save the vehicles
 * artwork as driver-384.png and it appears with no code change.
 */
export const DRIVER_BRAND_LOGO = "/assets/logos/driver-384.png"

/** The district crest. Shared surfaces and the fallback. */
export const DEFAULT_BRAND_LOGO = "/logo.png"

/** @deprecated Use DEFAULT_BRAND_LOGO */
export const DEFAULT_BRAND_LOGO_PUBLIC = DEFAULT_BRAND_LOGO

/**
 * Fall back to the district crest when an audience mark is missing.
 *
 * Put this on every <img> that renders one of the marks above. A missing file
 * otherwise renders as the alt text, which looks like a broken page rather
 * than a missing asset — and these are public-facing sign-in screens.
 *
 * The data flag stops an infinite loop if the fallback itself 404s.
 *
 * @param {import('react').SyntheticEvent<HTMLImageElement>} event
 */
export const logoFallback = (event) => {
  const img = event.currentTarget;
  if (img.dataset.logoFellBack) return;
  img.dataset.logoFellBack = "1";
  img.src = DEFAULT_BRAND_LOGO;
}
