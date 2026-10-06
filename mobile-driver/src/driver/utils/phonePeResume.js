import { localStore } from '../../lib/storage';

/* Port of Taxi/shared/utils/phonePeResume.js (localStorage -> localStore; the URL-query resolver reads the passed search string). */
const STORAGE_PREFIX = 'phonepe-pending:';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

const getStorageKey = (flowKey) => `${STORAGE_PREFIX}${String(flowKey || '').trim()}`;

export const rememberPendingPhonePeRedirect = (flowKey, payload = {}) => {
  const merchantTransactionId = String(payload?.merchantTransactionId || '').trim();
  if (!merchantTransactionId) return;

  try {
    localStore.setItem(getStorageKey(flowKey), JSON.stringify({ merchantTransactionId, savedAt: Date.now(), ...payload }));
  } catch {
    // Ignore storage failures and keep the checkout flow moving.
  }
};

export const readPendingPhonePeRedirect = (flowKey, { ttlMs = DEFAULT_TTL_MS } = {}) => {
  try {
    const raw = localStore.getItem(getStorageKey(flowKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (savedAt && Date.now() - savedAt > ttlMs) {
      localStore.removeItem(getStorageKey(flowKey));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const clearPendingPhonePeRedirect = (flowKey) => {
  try {
    localStore.removeItem(getStorageKey(flowKey));
  } catch {
    // Ignore storage failures during cleanup.
  }
};
