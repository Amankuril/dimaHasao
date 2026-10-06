import { toast } from './notify';

/*
 * Port of Frontend/src/shared/utils/apiError.js. The Flutter-shell and DOM
 * scrubbing parts have no counterpart here and are dropped; the message
 * rules are unchanged so riders see the same sentences.
 */

const USER_FACING_ERROR_TOAST_ID = 'user-facing-api-error';

function tryParseJsonMessage(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message.trim();
    if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error.trim();
  } catch {
    /* ignore */
  }
  return null;
}

function stripHtmlToText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusFallback(status) {
  if (status === 502 || status === 503 || status === 504) return 'Server temporarily unavailable. Please try again in a moment.';
  if (status === 413) return 'File is too large. Please upload a smaller image.';
  if (status === 401 || status === 403) return 'Session expired. Please log in again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'Something went wrong. Please try again.';
}

function isTechnicalErrorText(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (!t) return true;
  if (/upload\/api\s*failed/i.test(t)) return true;
  if (/xhr\s*network\s*error/i.test(t)) return true;
  if (/^api\s*failed/i.test(t)) return true;
  if (/^request failed with status code/i.test(t)) return true;
  if (/bad\s*gateway/i.test(t)) return true;
  if (/gateway\s*timeout/i.test(t)) return true;
  if (/service\s*unavailable/i.test(t)) return true;
  if (t.startsWith('{') && t.includes('}')) return true;
  if (/^\s*<!DOCTYPE/i.test(t) || /^\s*<html/i.test(t)) return true;
  if (/<\/?[a-z][\s\S]*>/i.test(t) && t.length > 80) return true;
  return false;
}

export function getUserFacingApiError(err, fallback = 'Something went wrong. Please try again.') {
  const status = err?.response?.status ?? err?.status ?? null;
  const data = err?.response?.data;

  if (status === 429) {
    const rateMsg =
      (typeof data?.message === 'string' && data.message) || (typeof data?.error === 'string' && data.error) || null;
    return rateMsg || 'Too many requests. Please wait a few minutes and try again.';
  }
  if (status && status >= 500) return statusFallback(status);

  // Requests that never got an HTTP status. TIMEOUT is new here: axios'
  // 30 s timeout surfaced as the generic fallback on the web.
  if (!err?.response && ['OFFLINE', 'NETWORK_ERROR', 'TIMEOUT'].includes(err?.code)) {
    return 'Network issue. Please check your connection and try again.';
  }

  let msg =
    (typeof data?.message === 'string' && data.message) || (typeof data?.error === 'string' && data.error) || null;
  if (!msg && data?.message && typeof data.message === 'object') msg = data.message.message || null;
  if (!msg && typeof data === 'string') {
    const stripped = stripHtmlToText(data);
    const fromJson = tryParseJsonMessage(data) || tryParseJsonMessage(stripped);
    if (fromJson) msg = fromJson;
    else if (stripped && !isTechnicalErrorText(stripped) && stripped.length < 160) msg = stripped;
  }
  if (!msg && typeof err?.message === 'string') {
    const fromJson = tryParseJsonMessage(err.message);
    if (fromJson) msg = fromJson;
    else if (!isTechnicalErrorText(err.message)) msg = err.message;
  }
  if (msg && isTechnicalErrorText(msg)) msg = tryParseJsonMessage(msg) || null;
  if (!msg || isTechnicalErrorText(msg)) return status ? statusFallback(status) : fallback;
  return msg.trim();
}

export function showUserFacingApiError(err, fallback = 'Something went wrong. Please try again.') {
  const message = getUserFacingApiError(err, fallback);
  toast.dismiss(USER_FACING_ERROR_TOAST_ID);
  toast.error(message, { id: USER_FACING_ERROR_TOAST_ID, duration: 4500 });
  return message;
}

/** Kit alias used by the generic screens. */
export const showError = (err, fallback) => showUserFacingApiError(err, fallback);
export const errorText = (err, fallback) => getUserFacingApiError(err, fallback);

export function isAlreadyExistsError(errOrMessage) {
  const text = typeof errOrMessage === 'string' ? errOrMessage : getUserFacingApiError(errOrMessage, '');
  return /already exists/i.test(text || '');
}
