import NetInfo from '@react-native-community/netinfo';

/*
 * fetch wrapper with the web's axios contract (Frontend/src/services/api/axios.js):
 *
 * - resolves to { data: <response body>, status }, so ported screens keep
 *   reading `res.data.data.x` exactly as the web does;
 * - rejects with ApiError, which carries `.response = { status, data }` like
 *   an AxiosError, so the web's error handling ports unchanged;
 * - every request carries the admin session's bearer token. On the web the
 *   five admin panels (Food, Taxi, Hotel, Tours, Global) each pick a token by
 *   URL, but every one of them resolves to `admin_accessToken` on an admin
 *   route, so this app has one token. `{ auth: false }` sends none;
 * - on 401 it refreshes once via /food/auth/refresh-token (the web's admin
 *   refresh) and retries; a refresh the server rejects (400/401/403) drops
 *   the session, as onRefreshFailed('admin') does on the web.
 */

const RAW = process.env.EXPO_PUBLIC_API_URL || '';
if (!RAW && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL is not set');
}
export const API_URL = (RAW || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
/** Origin that serves /uploads/* and the CMS, e.g. https://tourismdimahasao.in */
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

const TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 120000;

let session = { accessToken: null, refreshToken: null };
let onUnauthorized = null;
let onTokensRefreshed = null;
let lastWriteAt = 0;

export function setAuthTokens(tokens) {
  session = { accessToken: tokens?.accessToken || null, refreshToken: tokens?.refreshToken || null };
}
export function setAuthToken(token) {
  session = { ...session, accessToken: token || null };
}
export const getAuthToken = () => session.accessToken;
export const getRefreshToken = () => session.refreshToken;
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
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
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

function baseHeaders(extra, isForm, auth) {
  const h = { Accept: 'application/json', ...(isForm ? {} : { 'Content-Type': 'application/json' }) };
  // Web code passes `Content-Type: multipart/form-data` by hand; without the boundary the
  // transport adds, the server cannot read the body. Let the transport set it.
  if (isForm && extra) extra = Object.fromEntries(Object.entries(extra).filter(([k]) => k.toLowerCase() !== 'content-type'));
  // The web marks local dev builds so the backend's maintenance gate stays open.
  if (__DEV__) h['X-HelloParth-Client'] = 'local-dev';
  const token = auth === false ? null : session.accessToken;
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
  const auth = opts.auth;
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
          timeout: 10000,
        });
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (!token) return null;
        // The endpoint also returns a fresh refresh token; keep it when it does.
        const nextRefresh = res.data?.data?.refreshToken || res.data?.refreshToken;
        session = { ...session, accessToken: token, refreshToken: typeof nextRefresh === "string" && nextRefresh ? nextRefresh : session.refreshToken };
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
    if (err.status !== 401 || opts._retried || opts.auth === false || !session.accessToken) throw err;
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
      if (err.status !== 401 || !session.refreshToken || auth === false) throw err;
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

/**
 * `axios.create({ baseURL })` for the panels that keep their own instance
 * (Hotel apiService, Tours apiService, Global globalService, Taxi axiosInstance):
 * the same get/post/put/patch/delete and `{ data, status }` result, every path
 * prefixed with `prefix` (e.g. '/hotel', '/admin', '/taxi'). The admin token
 * is sent, as all of those instances send it on admin routes.
 */
export function createApi(prefix = '') {
  const base = String(prefix || '').replace(/\/+$/, '');
  const full = (p) => (/^https?:\/\//.test(p) ? p : `${base}${String(p).startsWith('/') ? '' : '/'}${p}`);
  return {
    get: (p, config = {}) => request(full(p), { ...config, method: 'GET' }),
    post: (p, body, config = {}) => request(full(p), { ...config, method: 'POST', body }),
    put: (p, body, config = {}) => request(full(p), { ...config, method: 'PUT', body }),
    patch: (p, body, config = {}) => request(full(p), { ...config, method: 'PATCH', body }),
    delete: (p, config = {}) => request(full(p), { ...config, method: 'DELETE', body: config.data }),
    upload: (p, formData, opts) => upload(full(p), formData, opts),
  };
}
