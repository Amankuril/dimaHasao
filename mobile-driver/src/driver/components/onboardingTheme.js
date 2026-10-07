import { jakarta } from '../../theme';

/* onboarding.css tokens (scoped to .dh-onboarding). */
export const OB = {
  primary: '#0a4d2b',
  primaryStrong: '#06381e',
  primarySoft: '#e8f2ec',
  accent: '#f59e0b',
  surface: '#ffffff',
  bg: '#faf6ed',
  border: '#e5ddc3',
  text: '#1f1f24',
  muted: '#6b7280',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
};

/* Plus Jakarta Sans has no 900 cut here: font-black maps to the heaviest, 800. */
export const jk = (weight = 400) => jakarta(Math.min(weight, 800));

/** .dh-card */
export const obCard = {
  backgroundColor: OB.surface,
  borderWidth: 1,
  borderColor: OB.border,
  borderRadius: 22,
};

/*
 * Android clips the last letter of a Text that combines textTransform:'uppercase' with letterSpacing, so every
 * uppercase label is written out literally (up()) instead.
 */
export const up = (value) => String(value ?? '').toUpperCase();

/** font-extrabold uppercase label (.dh-label): pass the text through up(). */
export const obLabel = {
  ...jk(800),
  fontSize: 11,
  letterSpacing: 0.88,
  color: OB.muted,
};
