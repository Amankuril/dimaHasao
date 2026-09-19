/**
 * The customer app's cache, which is now the shared one.
 *
 * Kept as a re-export so the service files in this folder keep their short
 * relative import, while the hotel partner, taxi driver and admin panels use
 * the same implementation from shared/utils/apiCache.
 */
export { cachedRead, invalidate, clearCache, keyFor, TTL } from '@/shared/utils/apiCache';
export { default } from '@/shared/utils/apiCache';
