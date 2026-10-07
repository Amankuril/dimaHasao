import { dh, tw } from '../../theme';

/*
 * Driver app design tokens. The driver app follows the USER app's taxi look:
 * deep-green headers and nav, gold accents, the yellow call-to-action, slate
 * surfaces and rounded white cards. Screens take their colours and radii from
 * here rather than writing hex values, so one change restyles every screen.
 *
 * Status colours keep their meaning: emerald = ok / online / earned, rose =
 * danger / offline / cancelled, orange = warning, blue = info.
 */
export const DT = {
  // brand
  brandDeep: dh.header, // #062C16 headers
  brand: dh.nav, // #06381E nav, primary solid actions
  brandMid: dh.green, // #0A4D2B
  brandSoft: tw.primarySoft, // #E8F2EC tint
  brandBorder: tw.primaryBorder, // #BBCCC3
  gold: dh.gold, // #CAA83E
  goldBright: dh.goldBright, // #E5B33B
  accent: dh.navActive, // #FFD027 active icon / label on green
  cta: '#F8E001', // the user app's yellow primary button
  ctaInk: tw.slate900,

  // surfaces
  bg: tw.slate50, // #F8FAFC page
  bgSoft: '#EEF2F7',
  card: tw.white,
  border: tw.slate200,
  borderSoft: tw.slate100,
  dark: tw.slate900, // #0F172B dark cards (wallet, summary)
  darkSoft: tw.slate800,

  // text
  ink: tw.slate900,
  inkSoft: tw.slate600,
  muted: tw.slate500,
  faint: tw.slate400,
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.72)',

  // status
  success: tw.emerald500,
  successInk: tw.emerald700,
  successSoft: tw.emerald50,
  danger: tw.rose500,
  dangerInk: tw.rose700,
  dangerSoft: tw.rose50,
  warn: tw.orange500,
  warnInk: tw.orange700,
  warnSoft: tw.orange50,
  info: tw.blue600,
  infoSoft: tw.blue50,

  radius: { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
};
