/*
 * The web passes app-wide signals with window events
 * (`window.dispatchEvent(new CustomEvent('cartUpdated', { detail }))`).
 * This is the same bus without a window: handlers receive `{ type, detail }`,
 * so ported code keeps reading `event.detail`.
 */

const listeners = new Map();

export const events = {
  on(type, fn) {
    if (typeof fn !== 'function') return () => {};
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => events.off(type, fn);
  },
  off(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  emit(type, detail) {
    const set = listeners.get(type);
    if (!set) return;
    const event = { type, detail };
    [...set].forEach((fn) => {
      try {
        fn(event);
      } catch {
        // one listener must not stop the rest
      }
    });
  },
};

export default events;
