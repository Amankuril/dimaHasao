/**
 * AUTH — authentication boundaries.
 *
 * Every protected endpoint must refuse a request with no token, a malformed
 * token, a token signed with the wrong key, and a token whose payload has been
 * edited. A 200 from any of these is an authentication bypass.
 */
import crypto from 'node:crypto';
import { get, post } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** A structurally valid JWT signed with a key the server does not know. */
const forgedToken = (payload) => {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const claims = b64(payload);
  const sig = crypto.createHmac('sha256', 'not-the-real-secret').update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${sig}`;
};

/** The same token with its payload swapped but the original signature kept. */
const tamper = (token, mutate) => {
  const [header, claims, sig] = token.split('.');
  const payload = JSON.parse(Buffer.from(claims, 'base64url').toString());
  return `${header}.${b64(mutate(payload))}.${sig}`;
};

const PROTECTED = [
  ['AUTH-101', 'GET /food/user/profile', '/food/user/profile'],
  ['AUTH-102', 'GET /hotel/bookings/my', '/hotel/bookings/my'],
  ['AUTH-103', 'GET /tours/bookings/my', '/tours/bookings/my'],
  ['AUTH-104', 'GET /festivals/bookings/my', '/festivals/bookings/my'],
  ['AUTH-105', 'GET /support', '/support'],
  ['AUTH-106', 'GET /admin/support', '/admin/support'],
  ['AUTH-107', 'GET /admin/reports/overview', '/admin/reports/overview'],
  ['AUTH-108', 'GET /admin/administrators', '/admin/administrators'],
  ['AUTH-109', 'GET /taxi/rides', '/taxi/rides'],
  ['AUTH-110', 'GET /food/orders', '/food/orders'],
  ['AUTH-111', 'GET /festivals/admin', '/festivals/admin'],
  ['AUTH-112', 'GET /tours/admin/dashboard', '/tours/admin/dashboard'],
  ['AUTH-113', 'GET /hotel/admin/dashboard-stats', '/hotel/admin/dashboard-stats'],
];

const unauthorized = (status) => [401, 403].includes(status);

export const run = async ({ primary }) => {
  module_('auth');

  for (const [id, title, path] of PROTECTED) {
    const res = await get(path);
    check(id, `no token rejected — ${title}`, unauthorized(res.status), {
      expected: '401/403', actual: res.status, severity: SEVERITY.CRITICAL,
    });
  }

  for (const [value, label, suffix] of [
    ['not-a-token', 'malformed token', '0'],
    ['', 'empty bearer', '1'],
    ['null', 'literal "null"', '2'],
  ]) {
    const res = await get('/food/user/profile', { token: value });
    check(`AUTH-12${suffix}`, `${label} rejected`, unauthorized(res.status), {
      expected: '401/403', actual: res.status, severity: SEVERITY.CRITICAL,
    });
  }

  const forged = forgedToken({ userId: '000000000000000000000000', role: 'ADMIN', exp: 9_999_999_999 });
  const forgedRes = await get('/admin/administrators', { token: forged });
  check('AUTH-130', 'JWT signed with an unknown key rejected', unauthorized(forgedRes.status), {
    expected: '401/403', actual: forgedRes.status, severity: SEVERITY.CRITICAL,
  });

  const expired = forgedToken({ userId: '000000000000000000000000', role: 'USER', exp: 1 });
  const expiredRes = await get('/food/user/profile', { token: expired });
  check('AUTH-131', 'expired token rejected', unauthorized(expiredRes.status), {
    expected: '401/403', actual: expiredRes.status, severity: SEVERITY.HIGH,
  });

  if (!primary?.token) {
    blocked('AUTH-140', 'privilege escalation by payload edit', 'no consumer session available');
    blocked('AUTH-141', 'identity swap by payload edit', 'no consumer session available');
    return;
  }

  const escalated = tamper(primary.token, (p) => ({ ...p, role: 'ADMIN' }));
  const escRes = await get('/admin/administrators', { token: escalated });
  check('AUTH-140', 'role rewritten to ADMIN rejected', unauthorized(escRes.status), {
    expected: '401/403', actual: escRes.status, severity: SEVERITY.CRITICAL,
  });

  const swapped = tamper(primary.token, (p) => ({ ...p, userId: '000000000000000000000001', sub: '000000000000000000000001' }));
  const swapRes = await get('/food/user/profile', { token: swapped });
  check('AUTH-141', 'user id rewritten rejected', unauthorized(swapRes.status), {
    expected: '401/403', actual: swapRes.status, severity: SEVERITY.CRITICAL,
  });

  for (const [id, path] of [
    ['AUTH-150', '/admin/administrators'],
    ['AUTH-151', '/admin/support'],
    ['AUTH-152', '/admin/reports/overview'],
    ['AUTH-153', '/festivals/admin'],
    ['AUTH-154', '/tours/admin/dashboard'],
    ['AUTH-155', '/hotel/admin/dashboard-stats'],
    ['AUTH-156', '/food/admin/dashboard-stats'],
    ['AUTH-157', '/taxi/admin/dashboard/data'],
  ]) {
    const res = await get(path, { token: primary.token });
    check(id, `consumer token refused on ${path}`, unauthorized(res.status), {
      expected: '401/403', actual: res.status, severity: SEVERITY.CRITICAL,
    });
  }
};
