/*
 * The slice of `window` / `document` / `navigator` that page logic ported from
 * the web still calls (tools/extract-hook.js imports these names instead of
 * rewriting every call site). Each member does the native equivalent or, for
 * things that have none on a phone screen (body scroll lock, page scroll
 * position), nothing.
 */
import { Alert, AppState, Dimensions, Image as RNImage, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { API_ORIGIN } from '../api/client';
import { events } from './events';
import { confirm } from './notify';

const NO_OP_EVENTS = new Set(['scroll', 'popstate', 'beforeunload', 'pagehide', 'pageshow', 'storage', 'orientationchange', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup', 'keydown', 'keyup', 'click', 'wheel']);
const subs = new Map();

function listen(type, handler) {
  if (typeof handler !== 'function' || NO_OP_EVENTS.has(type)) return;
  let remove;
  if (type === 'resize') {
    const sub = Dimensions.addEventListener('change', () => handler({ type }));
    remove = () => sub.remove();
  } else if (type === 'focus' || type === 'blur' || type === 'visibilitychange') {
    const sub = AppState.addEventListener('change', (state) => {
      if (type === 'visibilitychange' || (type === 'focus' && state === 'active') || (type === 'blur' && state !== 'active')) handler({ type });
    });
    remove = () => sub.remove();
  } else if (type === 'online' || type === 'offline') {
    return; // connectivity is reported by lib/useNetwork
  } else {
    // everything else is one of the app's own CustomEvents
    events.on(type, handler);
    remove = () => events.off(type, handler);
  }
  if (!subs.has(handler)) subs.set(handler, new Map());
  subs.get(handler).set(type, remove);
}

function unlisten(type, handler) {
  const byType = subs.get(handler);
  const remove = byType?.get(type);
  if (remove) {
    remove();
    byType.delete(type);
    if (!byType.size) subs.delete(handler);
  }
}

const style = () => new Proxy({}, { set: () => true, get: () => '' });
const noNode = { style: style(), classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };

export const window = {
  get innerWidth() {
    return Dimensions.get('window').width;
  },
  get innerHeight() {
    return Dimensions.get('window').height;
  },
  scrollX: 0,
  scrollY: 0,
  pageXOffset: 0,
  pageYOffset: 0,
  devicePixelRatio: 1,
  location: { origin: API_ORIGIN, href: API_ORIGIN, pathname: '', search: '', hash: '', reload() {} },
  history: { length: 1, back() {}, replaceState() {}, pushState() {} },
  addEventListener: listen,
  removeEventListener: unlisten,
  dispatchEvent: (event) => events.emit(event?.type, event?.detail),
  /** `window.confirm(message)` is synchronous in a browser; here it is a dialog, so ported code awaits it. */
  confirmAsync: (message) => confirm(String(message ?? ''), '', { confirmText: 'OK', cancelText: 'Cancel' }),
  alert: (message) => Alert.alert('', String(message ?? '')),
  scrollTo() {},
  scrollBy() {},
  open: (url) => {
    if (url) Linking.openURL(String(url)).catch(() => {});
    return null;
  },
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  requestAnimationFrame: (fn) => requestAnimationFrame(fn),
  cancelAnimationFrame: (id) => cancelAnimationFrame(id),
  // Debounced search in four taxi screens calls these off `window`; without them
  // the screen threw "setTimeout is not a function" straight into the boundary.
  setTimeout: (fn, ms, ...args) => setTimeout(fn, ms, ...args),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms, ...args) => setInterval(fn, ms, ...args),
  clearInterval: (id) => clearInterval(id),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
};

export const document = {
  body: { ...noNode, appendChild() {}, removeChild() {}, contains: () => false },
  documentElement: { ...noNode, scrollTop: 0, clientHeight: Dimensions.get('window').height },
  get visibilityState() {
    return AppState.currentState === 'active' ? 'visible' : 'hidden';
  },
  get hidden() {
    return AppState.currentState !== 'active';
  },
  activeElement: null,
  title: '',
  addEventListener: listen,
  removeEventListener: unlisten,
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  // No DOM: the "old browser" copy fallback that builds a <textarea> has nothing to do.
  createElement: () => ({ ...noNode, select() {}, setAttribute() {}, value: '' }),
  execCommand: () => false,
};

export const navigator = {
  userAgent: 'Android',
  onLine: true,
  language: 'en-IN',
  clipboard: {
    writeText: (text) => Clipboard.setStringAsync(String(text ?? '')).then(() => undefined),
    readText: () => Clipboard.getStringAsync(),
  },
  // Web Share API -> the Android share sheet.
  share: async ({ title, text, url } = {}) => {
    const message = [text, url && !(text || '').includes(url) ? url : null].filter(Boolean).join(' ');
    const result = await Share.share({ title, message: message || title || '' }, { dialogTitle: title });
    if (result?.action === Share.dismissedAction) {
      const error = new Error('Share dismissed');
      error.name = 'AbortError';
      throw error;
    }
  },
  vibrate: () => false,
};

/** `new CustomEvent(type, { detail })` for window.dispatchEvent above. */
export class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init?.detail;
  }
}

/** `new Image()` used as a preloader: setting `src` warms the image cache. */
export class Image {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.complete = false;
    this.decoding = 'async';
    this._src = '';
  }

  get src() {
    return this._src;
  }

  set src(value) {
    this._src = typeof value === 'string' ? value : '';
    if (!/^https?:/i.test(this._src)) {
      this.complete = true;
      setTimeout(() => this.onload?.(), 0);
      return;
    }
    RNImage.prefetch(this._src)
      .then(() => {
        this.complete = true;
        this.onload?.();
      })
      .catch(() => this.onerror?.());
  }
}

/** window.alert */
export const alert = (message) => Alert.alert('', String(message ?? ''));

/** `new Audio(src)`: page sound effects are not carried over; play() resolves. */
export class Audio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  load() {}
}
