import { StyleSheet } from 'react-native';
import { poppins } from '../theme';

/*
 * Hotel partner theme: Frontend/src/modules/Hotel/app/partner/partnerTheme.css
 * and wizard.css.
 *
 * The web pages are written with the acquired app's blue (#005CA8 and its
 * darker #004B8A / #003D70 / #00365E / #003768) and that stylesheet repaints
 * them to Dima Hasao green at run time. A screen ported from the web's class
 * names must apply the same remap, so use these tokens instead of the literal
 * class colour:
 *
 *   bg/text/border/ring/fill/stroke/accent-[#005CA8]                -> HT.primary
 *   same with [#004B8A] [#003D70] [#00365E] [#003768], to-/from-/via- -> HT.primaryStrong
 *   from-[#005CA8] to-[#003768] gradients                           -> HT_GRADIENT
 *   bg-[#005CA8]/5                                                  -> HT.primaryTint (6% of primary)
 *   bg-[#005CA8]/10, /15                                            -> HT.primarySoft
 *   border-[#005CA8]/15, /25, /50                                   -> HT.primaryBorder (30% of primary)
 *   any other opacity (/20, /30, fill-.../10): SOLID HT.primary (the css drops the alpha)
 *   page ground, and `min-h-screen bg-gray-50|slate-50`             -> HT.bg
 *
 * Untouched on purpose: every red-* utility (destructive, rejected) and the
 * amber / orange pending and warning colours. Amber is the house accent.
 */
export const HT = {
  primary: '#0a4d2b',
  primaryStrong: '#06381e',
  primarySoft: '#e8f2ec',
  // color-mix(in srgb, primary 6%, transparent) and (primary 30%, transparent)
  primaryTint: 'rgba(10,77,43,0.06)',
  primaryBorder: 'rgba(10,77,43,0.3)',
  accent: '#f59e0b',
  surface: '#ffffff',
  bg: '#faf6ed',
  border: '#e5ddc3',
  text: '#1f1f24',
  muted: '#6b7280',
  // `text-partner-text-primary` on the web headings
  headline: '#1f1f24',
};

export const HT_GRADIENT = [HT.primary, HT.primaryStrong];

/**
 * The primary at an opacity. NOTE: partnerTheme.css only restores alpha for
 * bg /5 /10 /15 and border /15 /25 /50; every other opacity-modified class
 * (bg-[#005CA8]/20, border-[#005CA8]/20, fill-[#005CA8]/10, ...) matches the
 * plain substring rule and renders SOLID primary on the web (alpha dropped).
 * Use HT.primary for those to match the web; htAlpha is for intentional new tints.
 */
export function htAlpha(a) {
  return `rgba(10,77,43,${Math.max(0, Math.min(1, a))})`;
}

/*
 * Booking status pills, as RecentBookingsTable and the booking pages colour
 * them: green / yellow / red / blue 100 fill with 700 text.
 */
const STATUS = {
  confirmed: { bg: '#dcfce7', fg: '#008236' },
  checked_in: { bg: '#dcfce7', fg: '#008236' },
  pending: { bg: '#fef9c2', fg: '#a65f00' },
  awaiting_payment: { bg: '#fef9c2', fg: '#a65f00' },
  cancelled: { bg: '#ffe2e2', fg: '#c10007' },
  rejected: { bg: '#ffe2e2', fg: '#c10007' },
  completed: { bg: '#dbeafe', fg: '#1447e6' },
  checked_out: { bg: '#dbeafe', fg: '#1447e6' },
};

/** { bg, fg } for a booking status; no colours for an unknown status (the web adds no class). */
export function bookingStatusColors(status) {
  return STATUS[status] || { bg: 'transparent', fg: '#6a7282' };
}

/** The label the pill shows: checked_in -> ONGOING, checked_out -> COMPLETED. */
export function bookingStatusLabel(status) {
  if (status === 'checked_in') return 'ONGOING';
  if (status === 'checked_out') return 'COMPLETED';
  return status;
}

/*
 * wizard.css: `.hotel-wizard .input`, `.wizard-label`, `.wizard-hint`.
 * Use `wizard.input` on a TextInput (add `wizard.inputFocus` while focused,
 * `wizard.inputError` when aria-invalid, `wizard.inputDisabled` when disabled,
 * and `wizard.textarea` for a multiline field).
 */
export const WIZARD = {
  accent: HT.primary,
  accentStrong: HT.primaryStrong,
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  text: '#1f1f24',
  muted: '#6b7280',
  placeholder: '#9ca3af',
  label: '#374151',
  hint: '#9ca3af',
  error: '#ef4444',
};

export const wizard = StyleSheet.create({
  input: {
    width: '100%',
    paddingVertical: 11.2, // 0.7rem
    paddingHorizontal: 14.4, // 0.9rem
    fontSize: 15, // 0.9375rem
    lineHeight: 21,
    color: WIZARD.text,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: WIZARD.border,
    borderRadius: 12, // 0.75rem
    ...poppins(400),
  },
  // border-color accent + `0 0 0 4px` ring at 18% of the accent
  inputFocus: { borderColor: WIZARD.accent, boxShadow: '0 0 0 4px rgba(10,77,43,0.18)' },
  inputError: { borderColor: WIZARD.error, boxShadow: '0 0 0 4px rgba(239,68,68,0.1)' },
  inputDisabled: { backgroundColor: '#f9fafb', color: WIZARD.muted },
  textarea: { minHeight: 96, textAlignVertical: 'top' }, // 6rem
  select: { paddingRight: 40 }, // 2.5rem, room for the chevron
  label: { marginBottom: 6, fontSize: 13, lineHeight: 18, color: WIZARD.label, ...poppins(600) },
  hint: { marginTop: 6, fontSize: 12, lineHeight: 16, color: WIZARD.hint, ...poppins(400) },
});

/** The three states of a wizard field as one style array: `wizardInput({ focused, invalid, disabled })`. */
export function wizardInput({ focused = false, invalid = false, disabled = false, multiline = false } = {}) {
  return [
    wizard.input,
    multiline ? wizard.textarea : null,
    disabled ? wizard.inputDisabled : null,
    focused && !disabled ? wizard.inputFocus : null,
    invalid ? wizard.inputError : null,
  ];
}
