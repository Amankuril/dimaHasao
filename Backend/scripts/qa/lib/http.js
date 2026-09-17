/**
 * Minimal HTTP client for the QA suite.
 *
 * Deliberately not axios: the suite has to see raw status codes and bodies for
 * malformed and hostile requests, including ones a client library would reject
 * before they reached the server.
 */
import http from 'node:http';

export const BASE = process.env.QA_BASE_URL || 'http://localhost:5000/api/v1';

export const request = (method, path, { token, body, headers = {}, raw } = {}) =>
  new Promise((resolve) => {
    const url = new URL(path.startsWith('http') ? path : BASE + path);
    const payload = raw !== undefined ? raw : (body === undefined ? null : JSON.stringify(body));

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        timeout: 20000,
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch { /* not json */ }
          resolve({ status: res.statusCode, body: json, text, headers: res.headers });
        });
      },
    );

    req.on('error', (error) => resolve({ status: 0, body: null, text: String(error.message), headers: {} }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, text: 'timeout', headers: {} }); });
    if (payload) req.write(payload);
    req.end();
  });

export const get = (p, o) => request('GET', p, o);
export const post = (p, o) => request('POST', p, o);
export const put = (p, o) => request('PUT', p, o);
export const patch = (p, o) => request('PATCH', p, o);
export const del = (p, o) => request('DELETE', p, o);
