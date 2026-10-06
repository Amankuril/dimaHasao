// The web strips non-cloneable values before history.pushState; route state here is held in memory (lib/webRouter), so nothing to strip.
export const toHistorySafeState = (value) => (value === undefined ? null : value);
export const installHistoryStateSanitizer = () => {};
