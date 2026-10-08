/*
 * The web passes objects between pages in react-router's `location.state`
 * (`navigate(path, { state: { restaurantData, from } })`). Route params here
 * are strings, so the sending screen stashes the object under a key and the
 * receiving screen reads it. In memory only: like `location.state`, it does
 * not survive an app restart, and every reader has a fetch to fall back on.
 */
const stash = new Map();
const MAX = 40;

export function stashRouteState(key, value) {
  if (!key) return;
  stash.delete(key);
  stash.set(key, value);
  if (stash.size > MAX) stash.delete(stash.keys().next().value);
}

export function readRouteState(key) {
  return key ? stash.get(key) || null : null;
}

export function clearRouteState(key) {
  stash.delete(key);
}
