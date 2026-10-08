/*
 * Port of Frontend/src/modules/Food/firebase.js.
 *
 * The web file uses the Firebase JS SDK (`firebase/app`, `firebase/database`) with an
 * unauthenticated app (`ensureFirebaseInitialized` keeps auth off so API-key restrictions
 * cannot break the tracking pages). The Firebase SDK is not a dependency of this app, so the
 * Realtime Database is reached through its own REST + server-sent-events API at the same
 * `databaseURL`, with the same paths and payload shapes. Nothing else of the web module is
 * used by the admin app (the Google auth provider is only used by the customer web pages).
 */

const DATABASE_URL = String(process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');

function splitPath(path) {
  return String(path || '')
    .split('/')
    .filter(Boolean);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...value };
  return value;
}

/** Writes `value` at `segments` inside `root`, creating objects on the way (RTDB `put` semantics). */
function setIn(root, segments, value) {
  if (segments.length === 0) return value;
  const next = root && typeof root === 'object' ? cloneValue(root) : {};
  const [head, ...rest] = segments;
  if (rest.length === 0) {
    if (value === null || value === undefined) delete next[head];
    else next[head] = value;
  } else {
    next[head] = setIn(next[head], rest, value);
  }
  return next;
}

/** Merges the keys of `value` at `segments` inside `root` (RTDB `patch` semantics). */
function patchIn(root, segments, value) {
  if (!value || typeof value !== 'object') return setIn(root, segments, value);
  let out = root;
  for (const key of Object.keys(value)) {
    out = setIn(out, [...segments, key], value[key]);
  }
  return out;
}

/**
 * Opens an RTDB event stream on `path` and calls `onData` with the full value at that path after
 * every event. Returns an unsubscribe function. Reconnects on a dropped stream, as the SDK does.
 */
function streamPath(path, onData, onError) {
  let xhr = null;
  let timer = null;
  let closed = false;
  let value;

  const emit = () => {
    try {
      onData(value);
    } catch {
      /* the caller's handler must not kill the stream */
    }
  };

  const applyEvent = (name, payload) => {
    if (name !== 'put' && name !== 'patch') return;
    if (!payload || typeof payload !== 'object') return;
    const segments = splitPath(payload.path);
    if (name === 'put') {
      value = segments.length === 0 ? payload.data : setIn(value, segments, payload.data);
    } else {
      value = patchIn(value, segments, payload.data);
    }
    emit();
  };

  const parse = (text, from) => {
    let cursor = from;
    for (;;) {
      const end = text.indexOf('\n\n', cursor);
      if (end === -1) break;
      const block = text.slice(cursor, end);
      cursor = end + 2;
      let name = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!name || !data) continue;
      try {
        applyEvent(name, JSON.parse(data));
      } catch {
        /* ignore a partially delivered frame */
      }
    }
    return cursor;
  };

  const fail = (error) => {
    if (closed) return;
    if (typeof onError === 'function') onError(error, path);
    timer = setTimeout(open, 2000);
  };

  function open() {
    if (closed) return;
    let cursor = 0;
    const req = new XMLHttpRequest();
    xhr = req;
    req.open('GET', `${DATABASE_URL}/${path}.json`);
    req.setRequestHeader('Accept', 'text/event-stream');
    req.onprogress = () => {
      cursor = parse(req.responseText || '', cursor);
    };
    req.onload = () => {
      cursor = parse(req.responseText || '', cursor);
      if (req.status >= 400) fail(new Error(`Firebase stream failed with status ${req.status}`));
      else fail(new Error('Firebase stream closed'));
    };
    req.onerror = () => fail(new Error('Firebase stream network error'));
    req.send();
  }

  if (!DATABASE_URL) {
    if (typeof onError === 'function') onError(new Error('EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set'), path);
    return () => {};
  }
  open();

  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    if (xhr) {
      xhr.onprogress = null;
      xhr.onload = null;
      xhr.onerror = null;
      try {
        xhr.abort();
      } catch {
        /* already finished */
      }
    }
  };
}

async function writePath(method, path, body) {
  if (!DATABASE_URL) throw new Error('EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set');
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? null),
  });
  if (!res.ok) throw new Error(`Firebase write failed with status ${res.status}`);
  return true;
}

const realtimeDb = {
  url: DATABASE_URL,
  subscribe: streamPath,
  set: (path, value) => writePath('PUT', path, value),
  update: (path, value) => writePath('PATCH', path, value),
};

/**
 * Legacy support: ensuring Firebase is initialized. Auth is never initialized here (as on the
 * web, where `enableAuth` defaults to false) — the REST transport needs no client app.
 */
export function ensureFirebaseInitialized() {
  return realtimeDb;
}

export { realtimeDb as firebaseRealtimeDb };
