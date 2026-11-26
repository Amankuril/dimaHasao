import { outfit } from '../../theme';
import { DT } from '../ui/dt';

/*
 * Onboarding tokens. The keys keep their old names (OB.*) so every onboarding file keeps working,
 * but the values now come from the shared driver tokens (DT): graphite actions, neutral surfaces.
 */
export const OB = {
  primary: DT.brandMid,
  primaryStrong: DT.brand,
  primarySoft: DT.brandSoft,
  accent: DT.ink,
  surface: DT.card,
  bg: DT.bg,
  border: DT.border,
  text: DT.ink,
  muted: DT.muted,
  faint: DT.faint,
  danger: DT.dangerInk,
  dangerSoft: DT.dangerSoft,
  success: DT.success,
  successSoft: DT.successSoft,
};

/* Body font of the onboarding screens: Outfit, like the user app (kept under its old name `jk`). */
export const jk = (weight = 400) => outfit(Math.min(weight, 900));

/** White rounded card with a hairline border and a soft shadow. */
export const obCard = {
  backgroundColor: DT.card,
  borderWidth: 1,
  borderColor: DT.borderSoft,
  borderRadius: DT.radius.lg,
};

/*
 * Android clips the last letter of a Text that combines textTransform:'uppercase' with letterSpacing, so every
 * uppercase label is written out literally (up()) instead.
 */
/** Was an upper-caser for tracked labels; labels are sentence case now. */
export const up = (value) => {
  const text = String(value ?? '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Field label above an input. */
export const obLabel = {
  ...jk(500),
  fontSize: 13,
  lineHeight: 18,
  color: DT.inkSoft,
};
