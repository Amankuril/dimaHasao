/*
 * Dashboard status icons for the order-status cards.
 *
 * The web imports these as .svg files; Metro has no SVG transformer, so the
 * markup is inlined here and rendered with react-native-svg's SvgXml.
 */
import { SvgXml } from 'react-native-svg';

export const scheduledIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#FEF3C7\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#F59E0B\"/>\n  <path d=\"M32 24V32L38 36\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path d=\"M32 12V16\" stroke=\"#D97706\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n</svg>";

export const pendingIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#DBEAFE\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#3B82F6\"/>\n  <path d=\"M26 32L30 36L38 28\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>";

export const acceptedIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#DCFCE7\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#22C55E\"/>\n  <path d=\"M24 32L30 38L41 26\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>";

export const processingIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#EDE9FE\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#8B5CF6\"/>\n  <path d=\"M32 23V32\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n  <circle cx=\"32\" cy=\"39\" r=\"2\" fill=\"white\"/>\n</svg>";

export const onTheWayIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#E0F2FE\"/>\n  <path d=\"M16 36H39L45 29H53V39H49C48.4 42.4 45.5 45 42 45C38.5 45 35.6 42.4 35 39H27C26.4 42.4 23.5 45 20 45C16.5 45 13.6 42.4 13 39H11V34C11 32.9 11.9 32 13 32H16V36Z\" fill=\"#0284C7\"/>\n  <circle cx=\"20\" cy=\"39\" r=\"4\" fill=\"white\"/>\n  <circle cx=\"42\" cy=\"39\" r=\"4\" fill=\"white\"/>\n</svg>";

export const deliveredIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#D1FAE5\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#059669\"/>\n  <path d=\"M24 32L30 38L41 26\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>";

export const canceledIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#FEE2E2\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#EF4444\"/>\n  <path d=\"M26 26L38 38\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n  <path d=\"M38 26L26 38\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n</svg>";

export const paymentFailedIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#FFEDD5\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#F97316\"/>\n  <path d=\"M32 24V34\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n  <circle cx=\"32\" cy=\"40\" r=\"2\" fill=\"white\"/>\n</svg>";

export const refundedIcon = "<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"4\" y=\"4\" width=\"56\" height=\"56\" rx=\"14\" fill=\"#CCFBF1\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"#14B8A6\"/>\n  <path d=\"M40 28V22L24 22L28 18M24 22L28 26\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path d=\"M24 34C24 38.4 27.6 42 32 42C36.4 42 40 38.4 40 34\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n</svg>";


/** Renders one of the inlined status SVGs at the given pixel size. */
export function StatusSvg({ xml, size = 20 }) {
  return <SvgXml xml={xml} width={size} height={size} />;
}
