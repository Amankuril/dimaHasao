/*
 * Shim. The implementation moved to shared/utils/historyState.js when the
 * pushState sanitizer was installed app-wide: it wraps window.history for
 * every module, so the app entry point has to be able to import it without
 * reaching into Taxi. Taxi callers keep importing from here.
 */
export { toHistorySafeState, installHistoryStateSanitizer } from '../../../../shared/utils/historyState';
