import NetInfo from '@react-native-community/netinfo';

/*
 * fetch wrapper with the web's axios contract (Frontend/src/services/api/axios.js):
 *
 * - resolves to { data: <response body>, status }, so ported screens keep
 *   reading `res.data.data.user` exactly as the web does;
 * - rejects with ApiError, which carries `.response = { status, data }` like
 *   an AxiosError, so getUserFacingApiError() ports unchanged;
 * - Bearer token from the signed-in user session. The taxi module has its own
 *   token (web: localStorage "token"); calls pass { auth: 'taxi' } to send it,
 *   and { auth: false } sends none (the web's token-less hotel client);
 * - on 401 it refreshes once via /food/auth/refresh-token and retries; a
 *   refresh the server rejects (400/401/403) drops the session.
 */

const RAW = process.env.EXPO_PUBLIC_API_URL || '';
if (!RAW && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL is not set');
}
export const API_URL = (RAW || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
/** Origin that serves /uploads/* and the CMS, e.g. https://tourismdimahasao.in */
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

// Same as the web client's axios timeout (30 s).
const TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 120000;

let session = { accessToken: null, refreshToken: null, taxiToken: null };
let onUnauthorized = null;
let onTokensRefreshed = null;
let lastWriteAt = 0;

export function setAuthTokens(tokens) {
  session = {
    accessToken: tokens?.accessToken || null,
    refreshToken: tokens?.refreshToken || null,
    taxiToken: tokens?.taxiToken || null,
  };
}
export function setAuthToken(token) {
  session = { ...session, accessToken: token || null };
}
export const getAuthToken = () => session.accessToken;
export const getRefreshToken = () => session.refreshToken;
/* True when a JWT's exp is in the past (an unreadable token counts as live, the server decides). */
function jwtExpired(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(globalThis.atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return typeof json?.exp === 'number' && Date.now() / 1000 >= json.exp;
  } catch {
    return false;
  }
}
/* The taxi token, unless it expired while the (refreshed) food access token is live: both are the same USER JWT. */
export const getTaxiToken = () => {
  const t = session.taxiToken;
  if (t && !(jwtExpired(t) && session.accessToken && !jwtExpired(session.accessToken))) return t;
  return session.accessToken || t || null;
};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}
export function setTokensRefreshedHandler(fn) {
  onTokensRefreshed = fn;
}
export const getLastWriteAt = () => lastWriteAt;

export class ApiError extends Error {
  constructor(message, status = null, code = null, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    // AxiosError shape, so the web's error helpers work as-is.
    this.response = status ? { status, data } : undefined;
  }
}

function buildUrl(path, params) {
  const url = /^https?:\/\//.test(path) ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!params) return url;
  // axios' serializer: null/undefined are dropped, '' is kept ("k="), arrays become k[]=a&k[]=b.
  const enc = (v) => encodeURIComponent(v instanceof Date ? v.toISOString() : v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v));
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.filter((x) => x !== undefined && x !== null).map((x) => `${encodeURIComponent(k)}[]=${enc(x)}`) : [`${encodeURIComponent(k)}=${enc(v)}`]))
    .join('&');
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

async function classifyNetworkFailure() {
  try {
    const s = await NetInfo.fetch();
    if (s.isConnected === false || s.isInternetReachable === false) return 'OFFLINE';
  } catch {
    /* fall through */
  }
  return 'NETWORK_ERROR';
}

/*
 * Which module a request belongs to, as the web's axios interceptor decides it
 * (services/api/axios.js getModuleFromUrl). Admin, restaurant-panel and
 * delivery-partner routes carry those apps' tokens on the web; the user app
 * holds none of them, so such requests go out without a token, exactly as
 * they do from the web's user screens.
 */
function moduleFromUrl(url = '') {
  const u = String(url).toLowerCase();
  if (u.includes('/admin/') || u.includes('/food/admin/') || u.includes('/auth/admin') || u.includes('admin/login')) return 'admin';
  if (u.includes('/food/delivery') || u.includes('/auth/delivery') || u.includes('/delivery/')) return 'delivery';
  if (u.includes('/food/restaurant/') || u.includes('/auth/restaurant') || u.includes('/restaurant/')) {
    if (u.includes('/food/restaurants') && !u.includes('/food/restaurant/')) return 'user';
    return 'restaurant';
  }
  return 'user';
}

function resolveAuth(path, opts) {
  if (opts.auth !== undefined) return opts.auth;
  const mod = opts.contextModule || moduleFromUrl(path);
  return mod === 'user' ? undefined : false;
}

function baseHeaders(extra, isForm, auth) {
  const h = { Accept: 'application/json', ...(isForm ? {} : { 'Content-Type': 'application/json' }) };
  // The web marks local dev builds so the backend's maintenance gate stays open.
  if (__DEV__) h['X-HelloParth-Client'] = 'local-dev';
  const token = auth === false ? null : auth === 'taxi' ? getTaxiToken() : session.accessToken;
  if (token) h.Authorization = `Bearer ${token}`;
  return { ...h, ...(extra || {}) };
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function linkSignals(outer, inner) {
  if (!outer) return;
  if (outer.aborted) inner.abort();
  else outer.addEventListener('abort', () => inner.abort(), { once: true });
}

/** A multipart request over XHR, answering with the slice of the fetch Response that rawFetch reads. */
function xhrSend(url, { method, headers, body, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    const abort = () => xhr.abort();
    if (signal) {
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    }
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text: async () => xhr.responseText });
    xhr.onabort = () => reject(new Error('Request aborted'));
    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.send(body);
  });
}

async function rawFetch(path, opts) {
  const { method = 'GET', body, params, headers, signal, timeout = TIMEOUT_MS } = opts;
  const auth = resolveAuth(path, opts);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const ctrl = new AbortController();
  linkSignals(signal, ctrl);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeout);
  let res;
  try {
    // Expo's fetch only takes File/Blob parts: it throws "Unsupported FormDataPart implementation" on React
    // Native's { uri, name, type } file objects. XHR is the transport that understands them.
    res = isForm
      ? await xhrSend(buildUrl(path, params), { method, headers: baseHeaders(headers, true, auth), body, signal: ctrl.signal })
      : await fetch(buildUrl(path, params), {
          method,
          headers: baseHeaders(headers, false, auth),
          body: body == null ? undefined : JSON.stringify(body),
          signal: ctrl.signal,
        });
  } catch (e) {
    if (timedOut) throw new ApiError('Request timed out', null, 'TIMEOUT');
    if (signal?.aborted) throw new ApiError('Request cancelled', null, 'ABORTED');
    const code = await classifyNetworkFailure();
    // The web's error text matches /network error/ for this case.
    throw new ApiError(code === 'OFFLINE' ? 'Network Error' : e?.message || 'Network Error', null, code);
  } finally {
    clearTimeout(timer);
  }
  const data = await parseBody(res);
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && (data.message || data.error)) || `Request failed with status code ${res.status}`;
    throw new ApiError(typeof msg === 'string' ? msg : `Request failed with status code ${res.status}`, res.status, null, data);
  }
  return { data, status: res.status };
}

let refreshing = null;

async function refreshAccessToken() {
  if (!session.refreshToken) return null;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await rawFetch('/food/auth/refresh-token', {
          method: 'POST',
          body: { refreshToken: session.refreshToken },
          // The web posts this with a bare axios call: no (expired) Authorization header.
          auth: false,
          timeout: 10000,
        });
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (!token) return null;
        // The endpoint also returns a fresh refresh token; keep it when it does.
        const nextRefresh = res.data?.data?.refreshToken || res.data?.refreshToken;
        session = {
          ...session,
          accessToken: token,
          refreshToken: typeof nextRefresh === "string" && nextRefresh ? nextRefresh : session.refreshToken,
          // The taxi token is the same USER JWT; an expired copy would keep every taxi call at 401 after a refresh.
          taxiToken: session.taxiToken && jwtExpired(session.taxiToken) ? token : session.taxiToken,
        };
        onTokensRefreshed?.(session);
        return token;
      } catch (err) {
        // Only a server that rejects the refresh token logs the rider out;
        // a network blip keeps the session.
        if ([400, 401, 403].includes(err?.status)) return 'REJECTED';
        return null;
      } finally {
        setTimeout(() => {
          refreshing = null;
        }, 0);
      }
    })();
  }
  return refreshing;
}

const inflight = new Map();
const TRANSIENT = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withAuthRetry(path, opts) {
  try {
    return await rawFetch(path, opts);
  } catch (err) {
    if (err.status !== 401 || opts._retried || !session.accessToken) throw err;
    // A request that carried no user token cannot be fixed by refreshing it.
    // Taxi calls carry the same USER JWT, so they refresh and retry like user calls.
    const sent = resolveAuth(path, opts);
    if (sent !== undefined && sent !== 'taxi') throw err;
    if (!session.refreshToken) {
      onUnauthorized?.();
      throw err;
    }
    const token = await refreshAccessToken();
    if (token && token !== 'REJECTED') {
      return rawFetch(path, { ...opts, _retried: true });
    }
    if (token === 'REJECTED') onUnauthorized?.();
    throw err;
  }
}

export async function request(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const o = { ...opts, method };
  if (typeof FormData !== 'undefined' && opts.body instanceof FormData && !opts.timeout) {
    o.timeout = UPLOAD_TIMEOUT_MS;
  }
  if (method !== 'GET') {
    const res = await withAuthRetry(path, o);
    lastWriteAt = Date.now();
    return res;
  }
  // Plain GETs: share one in-flight request and retry transient failures twice.
  const key = opts.signal ? null : `${buildUrl(path, opts.params)}|${session.accessToken || ''}`;
  if (key && inflight.has(key)) return inflight.get(key);
  const run = (async () => {
    let attempt = 0;
    for (;;) {
      try {
        return await withAuthRetry(path, o);
      } catch (err) {
        const transient = err.code === 'NETWORK_ERROR' || TRANSIENT.has(err.status);
        if (!transient || attempt >= 2 || opts.signal?.aborted) throw err;
        attempt += 1;
        await sleep(400 * attempt);
      }
    }
  })();
  if (key) {
    inflight.set(key, run);
    run.finally(() => inflight.delete(key)).catch(() => {});
  }
  return run;
}

export const api = {
  get: (path, config = {}) => request(path, { ...config, method: 'GET' }),
  post: (path, body, config = {}) => request(path, { ...config, method: 'POST', body }),
  patch: (path, body, config = {}) => request(path, { ...config, method: 'PATCH', body }),
  put: (path, body, config = {}) => request(path, { ...config, method: 'PUT', body }),
  delete: (path, config = {}) => request(path, { ...config, method: 'DELETE', body: config.data }),
};

export default api;

/** Run fn with the given AbortSignal attached to its GETs (used by useAsync). */
export function withSignal(signal, fn) {
  return fn(signal);
}

/*
 * Multipart upload with progress. fetch has no upload progress in React
 * Native, so this uses XMLHttpRequest. Same auth retry as request().
 */
export function upload(path, formData, { method = 'POST', onProgress, headers, auth } = {}) {
  const send = () =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, buildUrl(path));
      Object.entries(baseHeaders(headers, true, auth)).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      }
      xhr.onload = () => {
        let data = xhr.responseText;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          /* keep text */
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve({ data, status: xhr.status });
        else {
          const msg = (data && typeof data === 'object' && (data.message || data.error)) || `Request failed with status code ${xhr.status}`;
          reject(new ApiError(msg, xhr.status, null, data));
        }
      };
      xhr.ontimeout = () => reject(new ApiError('Request timed out', null, 'TIMEOUT'));
      xhr.onerror = async () => reject(new ApiError('Network Error', null, await classifyNetworkFailure()));
      xhr.send(formData);
    });
  return send()
    .catch(async (err) => {
      if (err.status !== 401 || !session.refreshToken) throw err;
      const token = await refreshAccessToken();
      if (token && token !== 'REJECTED') return send();
      if (token === 'REJECTED') onUnauthorized?.();
      throw err;
    })
    .then((res) => {
      lastWriteAt = Date.now();
      return res;
    });
}

/** Resolve a stored /uploads/x.webp path (or absolute URL) to something Image can load. */
export function mediaUrl(src) {
  if (!src || typeof src !== 'string') return null;
  if (/^(https?:|data:|file:)/.test(src)) return src;
  return `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}
