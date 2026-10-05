/*
 * Web: remembers the page scroll of a browse list so "back" from a restaurant
 * lands on the same card (the browser re-renders the list from the top).
 * The app's stack keeps the list screen mounted underneath, scroll position
 * included, so there is nothing to save or restore. The exports are kept so
 * page logic ported from the web calls them unchanged.
 */
export const normalizeBrowsePath = (path = '') => String(path || '').replace(/\/+$/, '') || '/';
export const trackCategoryWindowScrollY = () => {};
export const saveBrowseScroll = () => {};
export const saveCategoryBrowseClick = () => {};
export const getCategoryLastClick = () => null;
export const categoryBrowseNeedsRestore = () => false;
export const markCategoryBrowseRestored = () => {};
export const runCategoryScrollLock = () => {};
export const peekBrowseScroll = () => null;
export const peekBrowseScrollAny = () => null;
export const peekCategoryBrowseBackup = () => null;
export const consumeBrowseScroll = () => null;
export const clearBrowseScroll = () => {};
export const restoreBrowseScroll = (saved, { onDone } = {}) => {
  onDone?.();
};
