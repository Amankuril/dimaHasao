
/*
 * Tokens for the delivery partner app, taken from the web's
 * Frontend/src/modules/DeliveryV2/deliveryTheme.css.
 *
 * The web pages are written in stock Tailwind colours (blue-600, green-500,
 * orange-50 ...) and deliveryTheme.css then repaints most of those to the
 * Dima Hasao green with !important overrides. Screens here use the colour
 * the browser finally paints, so `tw.green600` below is NOT Tailwind's green:
 * it is the remapped primary. Colours the CSS leaves alone (gray, slate, red,
 * amber, yellow, emerald-700 ...) are Tailwind v4's own values.
 *
 * The delivery module has no dark-mode toggle of its own, so only the light
 * palette ships (see CONVERSION.md, deviations).
 */

export const DEFAULT_PRIMARY = '#0A4D2B';

const light = {
  bg: '#FFFFFF',
  // The radial-gradient page wash behind every .delivery-v2-theme screen.
  pageWash: ['#F7FAFF', '#EDF2FB'],
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  cream: '#FAF6ED',
  text: '#1F1F24',
  textMuted: '#6B7280',
  border: '#E5DDC3',
  // deliveryTheme.css forces these on every input / textarea / select.
  inputBorder: '#E8DEE7',
  inputFocusBorder: '#789D8A',
  inputFocusRing: 'rgba(21,73,139,0.15)',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  accent: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#11274399',
};

/* Tailwind v4 palette, sRGB equivalents of the oklch definitions. Remapped
 * entries follow deliveryTheme.css. */
const P = DEFAULT_PRIMARY;
const PS = '#06381E'; // --dv-primary-strong
const PSOFT = '#E8F2EC'; // --dv-primary-soft
const PBORDER = '#BBCCC3'; // color-mix(primary 28%, white)

export const tw = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DC', gray400: '#99A1AF',
  gray500: '#6A7282', gray600: '#4A5565', gray700: '#364153', gray800: '#1E2939', gray900: '#101828', gray950: '#030712',
  slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0', slate300: '#CAD5E2', slate400: '#90A1B9',
  slate500: '#62748E', slate600: '#45556C', slate700: '#314158', slate800: '#1D293D', slate900: '#0F172B', slate950: '#020618',
  red50: '#FEF2F2', red100: '#FFE2E2', red200: '#FFC9C9', red300: '#FFA2A2', red400: '#FF6467', red500: '#FB2C36',
  red600: '#E7000B', red700: '#C10007', red800: '#9F0712', red900: '#82181A',
  amber50: '#FFFBEB', amber100: '#FEF3C6', amber200: '#FEE685', amber400: '#FFB900', amber500: '#FE9A00', amber600: '#E17100', amber700: '#BB4D00', amber800: '#973C00',
  yellow50: '#FEFCE8', yellow100: '#FEF9C2', yellow400: '#FDC700', yellow500: '#F0B100', yellow600: '#D08700', yellow700: '#A65F00',
  emerald700: '#007A55', emerald800: '#006045',
  green700: '#008236', green800: '#016630',
  orange700: '#CA3500',
  blue700: '#1447E6', blue800: '#193CB8', blue900: '#1C398E',
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple500: '#AD46FF', purple600: '#9810FA',
  // Remapped by deliveryTheme.css to the brand green.
  green500: P, green600: P, emerald500: P, emerald600: P, blue500: P, blue600: P, orange500: P, orange600: P,
  indigo500: P, indigo600: P, teal500: P, teal600: P, cyan500: P, cyan600: P,
  green50: PSOFT, emerald50: PSOFT, blue50: PSOFT, orange50: PSOFT, indigo50: PSOFT, teal50: PSOFT, cyan50: PSOFT,
  green100: PBORDER, orange100: PBORDER, orange200: PBORDER, blue100: PBORDER, blue200: PBORDER, emerald200: PBORDER,
  // amber-500 as a gradient stop is remapped too, but not as a plain colour.
  primary: P, primaryStrong: PS, primarySoft: PSOFT, primaryBorder: PBORDER,
  // Border classes the theme does not repaint keep Tailwind's own colours.
  borderGreen500: '#00C950', borderBlue600: '#155DFC',
  success: '#10B981',
};

/* The two gradients the web uses on buttons and hero panels. */
export const gradients = {
  // from-[#0A4D2B] to-[#06381E], left to right
  brand: ['#0A4D2B', '#06381E'],
  // from-*-500 to-*-600 after the theme remap
  brandRemapped: [P, '#093B32'],
  // bg-[#121212] panels become this
  night: ['#15498B', '#000000'],
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pill: 999 };
export const font = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 30 };

/*
 * deliveryTheme.css sets Nunito Sans on everything and Sora on h1-h4,
 * .font-black and .font-extrabold. On Android each weight is its own family,
 * so map weight -> family here. Only the weights the web loads exist: Nunito
 * 500-800 and Sora 600-700; the browser falls back to the nearest, as here.
 */
const NUNITO = {
  400: 'NunitoSans_500Medium',
  500: 'NunitoSans_500Medium',
  600: 'NunitoSans_600SemiBold',
  700: 'NunitoSans_700Bold',
  800: 'NunitoSans_800ExtraBold',
  900: 'NunitoSans_800ExtraBold',
};
// CSS font matching with only 600/700 loaded: 400/500 resolve upward to 600.
const SORA = { 400: 'Sora_600SemiBold', 500: 'Sora_600SemiBold', 600: 'Sora_600SemiBold', 700: 'Sora_700Bold', 800: 'Sora_700Bold', 900: 'Sora_700Bold' };

/*
 * poppins() used to draw a third family beside Nunito Sans and Sora, so one
 * screen mixed three typefaces. It now resolves to Nunito Sans: the app has
 * one text family (Nunito Sans) and one display family (Sora). Poppins sets
 * heavier than Nunito at the same weight, so each weight steps up one.
 */
const POPPINS_AS_NUNITO = {
  300: 'NunitoSans_500Medium',
  400: 'NunitoSans_500Medium',
  500: 'NunitoSans_600SemiBold',
  600: 'NunitoSans_700Bold',
  700: 'NunitoSans_800ExtraBold',
  800: 'NunitoSans_800ExtraBold',
  900: 'NunitoSans_800ExtraBold',
};
export function poppins(weight = 400) {
  return { fontFamily: POPPINS_AS_NUNITO[weight] || POPPINS_AS_NUNITO[400] };
}

/**
 * Nunito Sans in a given CSS weight: text under a `font-poppins` /
 * `font-['Poppins']` root (deliveryTheme.css rewrites those to Nunito).
 * Elsewhere the delivery pages render in Poppins; use poppins().
 */
export function ff(weight = 500) {
  return { fontFamily: NUNITO[weight] || NUNITO[500] };
}
export const nunito = (weight = 500) => ff(weight);

/** Headings (h1-h4) and font-extrabold / font-black text. letter-spacing 0.01em. */
export function display(weight = 700, size = 16) {
  return { fontFamily: SORA[weight] || SORA[700], letterSpacing: 0.01 * size };
}

/*
 * Shadows as CSS box-shadow strings: React Native's boxShadow (new
 * architecture, iOS and Android) takes the same syntax, spread included,
 * so these are the web's values verbatim.
 * card: what deliveryTheme.css puts on every rounded-2xl / rounded-3xl.
 * sm..2xl: Tailwind v4's scale. button / navTop: arbitrary shadows the pages use.
 */
const SHADOWS = {
  card: '0 10px 28px -18px rgba(17,39,67,0.24)',
  xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  button: '0 8px 20px rgba(14,75,156,0.3)',
  navTop: '0 -5px 20px rgba(0,0,0,0.05)',
};

/** shadow('card') / shadow('lg') / shadow('0 4px 6px rgba(...)') */
export function shadow(name = 'card') {
  return { boxShadow: SHADOWS[name] || name };
}

const isHex = (v) => typeof v === 'string' && /^#([0-9a-f]{6})$/i.test(v);

function toRgb(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** Blend a toward b by amount (0..1). */
export function mix(a, b, amount) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * amount));
}

/** #RRGGBB + 0..1 -> #RRGGBBAA */
export function alpha(hex, a) {
  const base = String(hex).slice(0, 7);
  return `${base}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;
}

function readableOn(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.45 ? '#000000' : '#FFFFFF';
}

// Light only: the delivery module has no dark mode to mirror.
export function buildTheme(primaryColor) {
  const primary = isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  return {
    ...light,
    mode: 'light',
    isDark: false,
    primary,
    primaryDark: '#06381E',
    primarySoft: '#E8F2EC',
    primaryBorder: mix(primary, '#FFFFFF', 0.72),
    onPrimary: readableOn(primary),
  };
}

/* ───────────────────────── Design system ─────────────────────────
 * The tokens every redesigned screen uses. See DESIGN_SYSTEM.md at the app
 * root for when to use which. Screens should not invent colours, sizes or
 * radii outside these; `tw` above stays only for code not yet migrated.
 */

/** Semantic colours. Text colours meet WCAG AA (4.5:1) on `surface` and `bg`. */
export const color = {
  primary: '#0A4D2B',
  primaryPressed: '#06381E',
  primarySoft: '#E8F2EC',
  primaryBorder: '#BBCCC3',
  onPrimary: '#FFFFFF',

  bg: '#F5F6F4', // app background behind cards
  surface: '#FFFFFF', // cards, sheets, headers
  surfaceMuted: '#F3F4F6', // inset blocks inside a card, inputs at rest
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  overlay: 'rgba(15,23,42,0.5)',

  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',

  // Rider state. Online is a brighter green than the brand so it reads as a
  // live signal, not as decoration; offline is neutral, never red.
  online: '#16A34A',
  onlineSoft: '#DCFCE7',
  offline: '#6B7280',
  offlineSoft: '#F3F4F6',
};

/** Status tones for badges, banners and order states: [foreground, background]. */
export const tone = {
  primary: { fg: color.primary, bg: color.primarySoft },
  success: { fg: color.success, bg: color.successSoft },
  warning: { fg: color.warning, bg: color.warningSoft },
  danger: { fg: color.danger, bg: color.dangerSoft },
  info: { fg: color.info, bg: color.infoSoft },
  neutral: { fg: color.textSecondary, bg: color.surfaceMuted },
};

/** 4-pt spacing scale. Screen gutter = space.lg, card padding = space.lg. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

/** Corner radii: controls md, cards lg, sheets xl, chips/toggles pill. */
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

/** Minimum touch target (Android 48 dp). */
export const touch = 48;

const nun = (w) => ({ fontFamily: NUNITO[w] });
const sora = (w) => ({ fontFamily: SORA[w] });

/*
 * Type scale. Nunito Sans for reading text, Sora for titles and money.
 * Nothing below 12 px: riders read this outdoors, on the move.
 */
export const type = {
  display: { ...sora(700), fontSize: 30, lineHeight: 36 }, // hero money
  title: { ...sora(700), fontSize: 22, lineHeight: 28 }, // screen title
  heading: { ...sora(600), fontSize: 18, lineHeight: 24 }, // section / sheet title
  subheading: { ...nun(800), fontSize: 16, lineHeight: 22 }, // card title, names
  body: { ...nun(500), fontSize: 15, lineHeight: 22 },
  bodyStrong: { ...nun(700), fontSize: 15, lineHeight: 22 },
  small: { ...nun(500), fontSize: 13, lineHeight: 18 }, // supporting text, addresses
  label: { ...nun(700), fontSize: 13, lineHeight: 18 }, // field labels, row labels
  caption: { ...nun(600), fontSize: 12, lineHeight: 16 }, // timestamps, hints
  overline: { ...nun(800), fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' }, // short section kickers only
  button: { ...nun(800), fontSize: 16, lineHeight: 20 },
  buttonSm: { ...nun(800), fontSize: 14, lineHeight: 18 },
  money: { ...sora(700), fontSize: 18, lineHeight: 24 }, // amounts in rows/cards
  metric: { ...sora(700), fontSize: 24, lineHeight: 30 }, // HUD numbers
};

/** One elevation for raised cards, one for floating controls and sheets. */
export const elevation = {
  card: { boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)' },
  float: { boxShadow: '0 8px 24px -6px rgba(16,24,40,0.22)' },
  sheet: { boxShadow: '0 -8px 32px -8px rgba(16,24,40,0.25)' },
};
