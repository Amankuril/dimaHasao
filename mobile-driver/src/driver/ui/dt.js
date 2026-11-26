/*
 * Driver app design tokens. Graphite and white: the chrome (headers, nav,
 * sign-in) is white with hairline edges, primary actions are graphite with
 * white text, and a screen may carry one graphite "readout" card (balance,
 * trip summary, fare). Screens take their colours and radii from here rather
 * than writing hex values, so one change restyles every screen.
 *
 * Colour is kept for meaning only: green = online / ok / earned, red =
 * danger / offline / cancelled, amber = warning. On a graphite surface,
 * `gold` is the quiet label grey and `accent` is the bright (white) value.
 *
 * The token names (brand, gold, accent, cta) are kept from the earlier
 * green-and-gold look so every screen picks the new values up unchanged.
 */
export const DT = {
  // graphite (was the deep-green brand)
  brandDeep: '#18181B', // dark surfaces: incoming request header, toasts
  brand: '#18181B', // primary solid actions, selected filters
  brandMid: '#27272A',
  brandSoft: '#F4F4F5', // neutral tint behind icons
  brandBorder: '#E4E4E7',
  gold: '#A1A1AA', // label on a graphite surface
  goldBright: '#E0A526', // rating stars only
  accent: '#FFFFFF', // value / active icon on a graphite surface
  cta: '#18181B', // primary button
  ctaInk: '#FFFFFF',

  // surfaces
  bg: '#FAFAFA', // page
  bgSoft: '#F4F4F5',
  card: '#FFFFFF',
  border: '#E4E4E7',
  borderSoft: '#EDEDEF',
  dark: '#18181B', // readout cards (wallet, summary)
  darkSoft: '#27272A',

  // text
  ink: '#18181B',
  inkSoft: '#52525B',
  muted: '#71717A',
  faint: '#A1A1AA',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.64)',

  // status, toned down; used only where they carry meaning
  success: '#1F9254',
  successInk: '#166B3E',
  successSoft: '#EEF6F1',
  danger: '#D92D20',
  dangerInk: '#B42318',
  dangerSoft: '#FDF2F1',
  warn: '#D97706',
  warnInk: '#92400E',
  warnSoft: '#FBF5EA',
  info: '#52525B', // neutral: "info" is not a colour of its own
  infoSoft: '#F4F4F5',

  // Controls 10, inputs/tiles 14, cards 16, sheets 24 (nested radii add up).
  radius: { sm: 10, md: 14, lg: 16, xl: 24, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
};

/** A status or type as a label: 'in_progress' / 'PENDING' -> 'In progress'. */
export function sentence(value) {
  const text = String(value ?? '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
