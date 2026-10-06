/*
 * Restaurant partner theme: components/restaurant/restaurantTheme.css.
 *
 * The web pages are written with the old brand hexes (#B80B3D, #66001D) and
 * orange / amber utilities, and that stylesheet repaints them at run time.
 * A screen ported from the web's class names must apply the same remap, so
 * use these tokens instead of the literal class colour:
 *
 *   bg/text/border-[#B80B3D], from-[#B80B3D], via-[#B80B3D]      -> RT.primary
 *   bg/text-[#66001D], to-[#66001D], to-[#B80B3D]                -> RT.primaryStrong
 *   text/bg-orange-500/600, amber-500/600, [#ff8100], [#EB590E]  -> RT.accent
 *   bg-orange-50, bg-amber-50, bg-orange-500/10                  -> RT.primarySoft
 *   border-orange-100/200, border-[#ff8100]                      -> RT.accentBorder
 *   text-green-700, emerald-700, orange-700, amber-700           -> RT.primaryStrong
 *   border-green-300, emerald-300, orange-300, amber-300         -> RT.softBorder
 *   from-orange-500 … to-orange-600 gradients                    -> RT.primary … RT.primaryStrong
 *   button bg-black / bg-gray-900                                -> RT.primary (white text)
 *   border-[#ead6e3] -> RT.border, text-[#6a2f56] -> RT.muted
 *
 * Untouched on purpose: every red-* / rose-* utility (non-veg marker, rejected
 * status, warnings, destructive actions) and other greens.
 */
export const RT = {
  primary: '#0a4d2b',
  primaryStrong: '#06381e',
  primarySoft: '#e8f2ec',
  accent: '#f59e0b',
  surface: '#ffffff',
  bg: '#faf6ed',
  border: '#e5ddc3',
  text: '#1f1f24',
  muted: '#6b7280',
  // color-mix(primary 30%, white) and (primary 34%, white)
  accentBorder: '#b6cabf',
  softBorder: '#acc3b7',
  nonVeg: '#8c1c13',
  // onboarding wizard: bg-gray-50 and the input well
  onboardingSoft: '#fcf9f2',
  onboardingField: '#fcfaf5',
};

export const RT_GRADIENT = [RT.primary, RT.primaryStrong];
