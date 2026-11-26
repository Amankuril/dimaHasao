/*
 * Input masks for Indian identity / vehicle numbers.
 *
 * Each mask*() runs on every keystroke and drops any character that cannot
 * appear at that position, so a wrong value cannot be typed at all (the field
 * just ignores the key). Each is*Valid() checks the finished value.
 */

const LETTER = /[A-Z]/;
const DIGIT = /[0-9]/;

const clean = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Vehicle registration (also the RC number), two shapes:
 *   standard  AS01AB1234  → 2 letters · 1–2 digits · 1–3 letters · 4 digits
 *   BH series 22BH1234AB  → 2 digits · BH · 4 digits · 1–2 letters
 */
export function maskVehicleNumber(value) {
  const chars = clean(value);
  if (!chars) return '';
  if (DIGIT.test(chars[0])) return maskBhSeries(chars);

  let out = '';
  let phase = 0; // 0 state letters, 1 district digits, 2 series letters, 3 number digits
  let count = 0;
  for (const c of chars) {
    const isL = LETTER.test(c);
    const isD = DIGIT.test(c);
    if (phase === 0) {
      if (isL && count < 2) { out += c; count += 1; }
      else if (isD && count === 2) { out += c; phase = 1; count = 1; }
    } else if (phase === 1) {
      if (isD && count < 2) { out += c; count += 1; }
      else if (isL) { out += c; phase = 2; count = 1; }
    } else if (phase === 2) {
      if (isL && count < 3) { out += c; count += 1; }
      else if (isD) { out += c; phase = 3; count = 1; }
    } else if (phase === 3) {
      if (isD && count < 4) { out += c; count += 1; }
    }
  }
  return out;
}

function maskBhSeries(chars) {
  // positions: 0-1 digits, 2 'B', 3 'H', 4-7 digits, 8-9 letters
  let out = '';
  for (const c of chars) {
    const i = out.length;
    if (i < 2 ? DIGIT.test(c) : i === 2 ? c === 'B' : i === 3 ? c === 'H' : i < 8 ? DIGIT.test(c) : i < 10 && LETTER.test(c)) out += c;
    if (out.length >= 10) break;
  }
  return out;
}

export const VEHICLE_NUMBER_MAX = 11;
export const isVehicleNumberValid = (value) =>
  /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(value || '') || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(value || '');

/** Driving licence: AS01 2015 0012345 → 2 letters · 2 digits · 4-digit year · 7 digits (15). */
export function maskDrivingLicence(value) {
  let out = '';
  for (const c of clean(value)) {
    const i = out.length;
    if (i < 2 ? LETTER.test(c) : DIGIT.test(c)) out += c;
    if (out.length >= 15) break;
  }
  return out;
}
export const isDrivingLicenceValid = (value) => /^[A-Z]{2}\d{13}$/.test(value || '');

/** PAN: ABCDE1234F. */
export function maskPan(value) {
  let out = '';
  for (const c of clean(value)) {
    const i = out.length;
    if (i < 5 || i === 9 ? LETTER.test(c) : DIGIT.test(c)) out += c;
    if (out.length >= 10) break;
  }
  return out;
}
export const isPanValid = (value) => /^[A-Z]{5}\d{4}[A-Z]$/.test(value || '');

/** Aadhaar: 12 digits, cannot start with 0 or 1. */
export function maskAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.replace(/^[01]+/, '').slice(0, 12);
}
export const isAadhaarValid = (value) => /^[2-9]\d{11}$/.test(value || '');

/** Anything else: letters, digits, '-' and '/', capped. */
export const maskGenericDocNumber = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 20);
export const isGenericDocNumberValid = (value) => String(value || '').length >= 4;

/** Picks the right rule for a document from its key / label. */
export function docNumberRule(field) {
  const text = `${field?.key || ''} ${field?.label || ''} ${field?.templateName || ''}`.toLowerCase();
  if (/aadha?ar/.test(text)) return { mask: maskAadhaar, valid: isAadhaarValid, numeric: true, max: 12, example: '12-digit Aadhaar number' };
  if (/\bpan\b|pan[_ ]?card/.test(text)) return { mask: maskPan, valid: isPanValid, max: 10, example: 'ABCDE1234F' };
  if (/licen[cs]e|\bdl\b|driving/.test(text)) return { mask: maskDrivingLicence, valid: isDrivingLicenceValid, max: 15, example: 'AS0120150012345' };
  if (/\brc\b|registration|\bregn?\b|vehicle[_ ]?(no|number)/.test(text))
    return { mask: maskVehicleNumber, valid: isVehicleNumberValid, max: VEHICLE_NUMBER_MAX, example: 'AS01AB1234' };
  return { mask: maskGenericDocNumber, valid: isGenericDocNumberValid, max: 20, example: '' };
}

/** Free text for brand / model / colour: letters, digits, space, '-' and '.', capped. */
export const maskName = (value, max = 30) => String(value || '').replace(/[^A-Za-z0-9 .-]/g, '').replace(/\s{2,}/g, ' ').slice(0, max);
export const maskLetters = (value, max = 20) => String(value || '').replace(/[^A-Za-z ]/g, '').replace(/\s{2,}/g, ' ').slice(0, max);
