/*
 * Design tokens for the user app, taken from the web:
 * - Frontend/src/modules/DimaHasao/dimahasao.css (tourism shell)
 * - Frontend/src/shared/styles/global.css + Tailwind v4 palette (food, taxi)
 *
 * `tw` is Tailwind v4's palette as sRGB hex, so a class like `text-emerald-800`
 * ports as `tw.emerald800`. `dh` holds the brand colours the pages write as
 * arbitrary values (`bg-[#06381e]`).
 */

export const dh = {
  bg: '#FDFBF7', // .dh-app background
  cream: '#FAF6ED', // module shell / sheets
  border: '#E5DDC3',
  header: '#062C16',
  nav: '#06381E',
  green: '#0A4D2B',
  greenDeep: '#04190C',
  card: '#051F11',
  field: '#02130A',
  gold: '#CAA83E',
  goldBright: '#E5B33B',
  navActive: '#FFD027',
  text: '#1F2937',
};

export const tw = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DC', gray400: '#99A1AF',
  gray500: '#6A7282', gray600: '#4A5565', gray700: '#364153', gray800: '#1E2939', gray900: '#101828', gray950: '#030712',
  slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0', slate300: '#CAD5E2', slate400: '#90A1B9',
  slate500: '#62748E', slate600: '#45556C', slate700: '#314158', slate800: '#1D293D', slate900: '#0F172B', slate950: '#020618',
  zinc50: '#FAFAFA', zinc100: '#F4F4F5', zinc200: '#E4E4E7', zinc300: '#D4D4D8', zinc400: '#9F9FA9',
  zinc500: '#71717B', zinc600: '#52525C', zinc700: '#3F3F46', zinc800: '#27272A', zinc900: '#18181B',
  neutral50: '#FAFAFA', neutral100: '#F5F5F5', neutral200: '#E5E5E5', neutral300: '#D4D4D4', neutral400: '#A1A1A1',
  neutral500: '#737373', neutral600: '#525252', neutral700: '#404040', neutral800: '#262626', neutral900: '#171717',
  stone50: '#FAFAF9', stone100: '#F5F5F4', stone200: '#E7E5E4', stone300: '#D6D3D1', stone400: '#A6A09B',
  stone500: '#79716B', stone600: '#57534D', stone700: '#44403B', stone800: '#292524', stone900: '#1C1917',
  red50: '#FEF2F2', red100: '#FFE2E2', red200: '#FFC9C9', red300: '#FFA2A2', red400: '#FF6467', red500: '#FB2C36',
  red600: '#E7000B', red700: '#C10007', red800: '#9F0712', red900: '#82181A',
  orange50: '#FFF7ED', orange100: '#FFEDD4', orange200: '#FFD6A7', orange300: '#FFB86A', orange400: '#FF8904',
  orange500: '#FF6900', orange600: '#F54900', orange700: '#CA3500', orange800: '#9F2D00', orange900: '#7E2A0C',
  amber50: '#FFFBEB', amber100: '#FEF3C6', amber200: '#FEE685', amber300: '#FFD230', amber400: '#FFB900',
  amber500: '#FE9A00', amber600: '#E17100', amber700: '#BB4D00', amber800: '#973C00', amber900: '#7B3306', amber950: '#461901',
  yellow50: '#FEFCE8', yellow100: '#FEF9C2', yellow200: '#FFF085', yellow300: '#FFDF20', yellow400: '#FDC700',
  yellow500: '#F0B100', yellow600: '#D08700', yellow700: '#A65F00', yellow800: '#894B00', yellow900: '#733E0A',
  lime400: '#9AE600', lime500: '#7CCF00', lime600: '#5EA500',
  green50: '#F0FDF4', green100: '#DCFCE7', green200: '#B9F8CF', green300: '#7BF1A8', green400: '#05DF72',
  green500: '#00C950', green600: '#00A63E', green700: '#008236', green800: '#016630', green900: '#0D542B',
  emerald50: '#ECFDF5', emerald100: '#D0FAE5', emerald200: '#A4F4CF', emerald300: '#5EE9B5', emerald400: '#00D492',
  emerald500: '#00BC7D', emerald600: '#009966', emerald700: '#007A55', emerald800: '#006045', emerald900: '#004F3B', emerald950: '#002C22',
  teal50: '#F0FDFA', teal100: '#CBFBF1', teal200: '#96F7E4', teal400: '#00D5BE', teal500: '#00BBA7', teal600: '#009689', teal700: '#00786F',
  cyan50: '#ECFEFF', cyan100: '#CEFAFE', cyan500: '#00B8DB', cyan600: '#0092B8',
  sky50: '#F0F9FF', sky100: '#DFF2FE', sky400: '#00BCFF', sky500: '#00A6F4', sky600: '#0084D1',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BEDBFF', blue300: '#8EC5FF', blue400: '#51A2FF',
  blue500: '#2B7FFF', blue600: '#155DFC', blue700: '#1447E6', blue800: '#193CB8', blue900: '#1C398E',
  indigo50: '#EEF2FF', indigo100: '#E0E7FF', indigo500: '#615FFF', indigo600: '#4F39F6', indigo700: '#432DD7',
  violet50: '#F5F3FF', violet100: '#EDE9FE', violet200: '#DDD6FF', violet500: '#8E51FF', violet600: '#7F22FE', violet700: '#7008E7',
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D4FF', purple500: '#AD46FF', purple600: '#9810FA', purple700: '#8200DB',
  pink50: '#FDF2F8', pink100: '#FCE7F3', pink500: '#F6339A', pink600: '#E60076',
  rose300: '#FDA4AF', rose900: '#881337', orange950: '#431407', rose50: '#FFF1F2', rose100: '#FFE4E6', rose200: '#FFCCD3', rose400: '#FF637E', rose500: '#FF2056', rose600: '#EC003F', rose700: '#C70036',
  // Aliases the shared kit components use.
  primary: dh.green,
  primaryStrong: dh.nav,
  primarySoft: '#E8F2EC',
  primaryBorder: '#BBCCC3',
  success: '#10B981',
};

/**
 * A Tailwind colour class as the API and the web's data files carry it
 * (`text-emerald-600`, `bg-amber-50`) -> its hex.
 */
export function twClass(cls, fallback = tw.gray700) {
  const m = String(cls || '').match(/(?:text|bg|border)-([a-z]+)-(\d{2,3})/);
  if (!m) return /-(white)$/.test(String(cls)) ? '#FFFFFF' : fallback;
  return tw[`${m[1]}${m[2]}`] || fallback;
}

export const gradients = {
  brand: ['#06381E', '#0A4D2B'],
  gold: ['#B38F2A', '#E8C558', '#B38F2A'],
  tourist: ['#2CA972', '#186A43'],
  taxi: ['#FB9A40', '#E06C1C'],
  hotels: ['#8A4ED9', '#562396'],
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pill: 999 };
export const font = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 30 };

/*
 * Fonts. On Android every weight is its own family, so a CSS weight maps to
 * a family name. Only the weights the web's index.html loads are bundled;
 * a missing weight resolves to the nearest loaded one, as the browser does.
 */
const POPPINS = {
  300: 'Poppins_400Regular', 400: 'Poppins_400Regular', 500: 'Poppins_500Medium', 600: 'Poppins_600SemiBold',
  700: 'Poppins_700Bold', 800: 'Poppins_800ExtraBold', 900: 'Poppins_800ExtraBold',
};

/** Body font of the whole user app (.dh-app, global.css). */
export function poppins(weight = 400) {
  return { fontFamily: POPPINS[weight] || POPPINS[400] };
}
/** `font-montserrat` */
// Montserrat and Inter are folded into Poppins: one text family app-wide
// (Cinzel for heritage titles, Playfair italic for header taglines only).
export function montserrat(weight = 700) {
  return poppins(weight);
}
/** `font-cinzel` (only 700 is loaded on the web) */
export function cinzel() {
  return { fontFamily: 'Cinzel_700Bold' };
}
/** `font-playfair`, optionally italic */
export function playfair(weight = 400, italic = false) {
  // Loaded on the web: 400, 600, 700 upright; 400 and 600 italic.
  if (italic) return { fontFamily: weight >= 600 ? 'PlayfairDisplay_600SemiBold_Italic' : 'PlayfairDisplay_400Regular_Italic' };
  const w = weight >= 700 ? '700Bold' : weight >= 600 ? '600SemiBold' : '400Regular';
  return { fontFamily: `PlayfairDisplay_${w}` };
}
/** `font-inter` */
export function inter(weight = 400) {
  return poppins(weight);
}

// The kit components ported from the delivery app call these two.
export const ff = poppins;
export const nunito = poppins;
export function display(weight = 700) {
  return poppins(weight);
}

/*
 * Shadows as CSS box-shadow strings: React Native's boxShadow takes the same
 * syntax, so these are Tailwind v4's values verbatim.
 */
const SHADOWS = {
  card: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  button: '0 10px 24px rgba(229,179,59,0.28)',
  nav: '0 8px 30px rgba(0,0,0,0.5)',
  navTop: '0 -5px 20px rgba(0,0,0,0.05)',
};

/** shadow('md') / shadow('0 4px 6px rgba(...)') */
export function shadow(name = 'card') {
  return { boxShadow: SHADOWS[name] || name };
}

/** #RRGGBB + 0..1 -> #RRGGBBAA */
export function alpha(hex, a) {
  const base = String(hex).slice(0, 7);
  return `${base}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;
}

export function buildTheme() {
  return {
    mode: 'light',
    isDark: false,
    bg: dh.bg,
    surface: '#FFFFFF',
    text: dh.text,
    textMuted: tw.gray500,
    border: dh.border,
    primary: dh.green,
    primaryDark: dh.nav,
    primarySoft: '#E8F2EC',
    onPrimary: '#FFFFFF',
    danger: tw.red500,
    success: '#10B981',
    white: '#FFFFFF',
    black: '#000000',
  };
}

/* ───────────────────────── Design system (heritage) ─────────────────────────
 * Tokens every redesigned screen uses; see DESIGN_SYSTEM.md at the app root.
 * One look across tourism, food and taxi: deep-green heritage headers with
 * gold Cinzel titles, warm cream background, white cards with a beige edge,
 * brand-green actions and gold highlights. `tw`/`dh` above remain only for
 * code not yet migrated.
 */
export const color = {
  primary: '#0A4D2B', // actions, links, selected
  primaryPressed: '#06381E',
  primaryDeep: '#062C16', // heritage header / dark hero surfaces
  primarySoft: '#E8F2EC',
  primaryBorder: '#BBCCC3',
  onPrimary: '#FFFFFF',

  gold: '#CAA83E', // heritage accent: ornaments, ratings, offers, premium CTA on dark
  goldBright: '#E5B33B',
  goldText: '#8A6D14', // gold that passes AA as text on white/cream
  goldSoft: '#FBF3DC',
  onGold: '#1F1A0A',
  goldOnDark: '#FCD34D', // titles on the deep-green header

  bg: '#FDFBF7', // cream page background
  surface: '#FFFFFF',
  surfaceMuted: '#F6F1E6', // warm inset blocks, inputs at rest, chips
  border: '#E5DDC3', // beige card edge
  borderStrong: '#D6CBA8',
  overlay: 'rgba(6,28,14,0.55)',

  text: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',
  textOnDarkMuted: 'rgba(254,243,198,0.85)', // tagline on the header

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  veg: '#15803D', // FSSAI marks: never restyle these two
  nonVeg: '#B91C1C',
};

/** Status tones: { fg, bg } for badges and banners. */
export const tone = {
  primary: { fg: color.primary, bg: color.primarySoft },
  gold: { fg: color.goldText, bg: color.goldSoft },
  success: { fg: color.success, bg: color.successSoft },
  warning: { fg: color.warning, bg: color.warningSoft },
  danger: { fg: color.danger, bg: color.dangerSoft },
  info: { fg: color.info, bg: color.infoSoft },
  neutral: { fg: color.textSecondary, bg: color.surfaceMuted },
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const touch = 48;

const pop = (w) => poppins(w);
/*
 * Type scale. Cinzel (always caps by design) only for heritage titles and
 * section titles; Playfair italic only for header taglines; Poppins for all
 * other text. Nothing below 12 px.
 */
export const type = {
  heroSerif: { ...cinzel(), fontSize: 24, lineHeight: 30, letterSpacing: 1.5 }, // home / hero banner titles
  titleSerif: { ...cinzel(), fontSize: 17, lineHeight: 24, letterSpacing: 1.4 }, // header titles
  sectionSerif: { ...cinzel(), fontSize: 15, lineHeight: 22, letterSpacing: 1 }, // section titles in a page
  tagline: { ...playfair(400, true), fontSize: 13, lineHeight: 18 }, // header subtitle only
  heading: { ...pop(700), fontSize: 18, lineHeight: 26 }, // sheet / dialog / detail title
  subheading: { ...pop(600), fontSize: 16, lineHeight: 22 }, // card titles, names
  body: { ...pop(400), fontSize: 14, lineHeight: 21 },
  bodyStrong: { ...pop(600), fontSize: 14, lineHeight: 21 },
  small: { ...pop(400), fontSize: 13, lineHeight: 19 }, // addresses, descriptions
  label: { ...pop(600), fontSize: 13, lineHeight: 18 }, // field labels, chips, inline actions
  caption: { ...pop(500), fontSize: 12, lineHeight: 16 }, // timestamps, hints, badge text
  overline: { ...pop(700), fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' }, // 1-3 word kickers
  button: { ...pop(600), fontSize: 15, lineHeight: 20 },
  buttonSm: { ...pop(600), fontSize: 13, lineHeight: 18 },
  price: { ...pop(700), fontSize: 18, lineHeight: 24 },
  priceLg: { ...pop(700), fontSize: 26, lineHeight: 32 },
};

export const elevation = {
  card: { boxShadow: '0 1px 2px rgba(31,26,10,0.05), 0 2px 8px -2px rgba(31,26,10,0.08)' },
  float: { boxShadow: '0 10px 28px -8px rgba(6,28,14,0.28)' },
  sheet: { boxShadow: '0 -10px 32px -8px rgba(6,28,14,0.3)' },
};
