/**
 * Regression tests for the security fixes from the 2026-10 backend audit.
 *
 * Runs against a live server on a disposable database — never production:
 *   TEST_BASE_URL=http://localhost:5055/api/v1 node --test test/security.integration.test.js
 *
 * Needs USE_DEFAULT_OTP=true on that server (consumer sessions come from the
 * real OTP flow) and the seeded superadmin (scripts/seed-super-admin.js).
 * Skips itself when no server is reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5055/api/v1';
const ORIGIN = new URL(BASE).origin;

const call = async (method, path, { token, body, headers = {}, form } = {}) => {
  // Stored files (/uploads/<name>.<ext>) are served beside the API, not under it.
  const url = path.startsWith('http') ? path : /^\/uploads\/[^/]+\.\w+$/.test(path) ? ORIGIN + path : BASE + path;
  const init = { method, headers: { ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (form) init.body = form;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, body: json, text };
};

const consumer = async (phone) => {
  await call('POST', '/auth/otp/request', { body: { audience: 'user', phone } });
  const v = await call('POST', '/auth/otp/verify', { body: { audience: 'user', phone, otp: '1234' } });
  if (v.body?.data?.accessToken) return v.body.data.accessToken;
  const c = await call('POST', '/auth/otp/complete', {
    body: { audience: 'user', signupToken: v.body?.data?.signupToken, name: `Test ${phone.slice(-4)}` },
  });
  return c.body?.data?.accessToken;
};

const reachable = await fetch(`${ORIGIN}/health`).then((r) => r.ok).catch(() => false);
const opts = { skip: reachable ? false : `no server at ${ORIGIN}` };

let A; let B;
test.before(async () => {
  if (!reachable) return;
  A = await consumer('9000000881');
  B = await consumer('9000000882');
});

test('removed endpoints that issued sessions or money without proof are gone', opts, async () => {
  const gone = [
    ['POST', '/taxi/users/otp-login', { phone: '9000000881' }],
    ['POST', '/taxi/users/register', { name: 'x', phone: '9000000999' }],
    ['POST', '/taxi/drivers/register', { name: 'x', phone: '9000000998', password: 'x', vehicleType: 'x', location: [92, 25] }],
    ['GET', '/fcm-tokens/test-get-token/9000000881'],
    ['GET', '/fcm-tokens/test-set-token/9000000881/abc'],
  ];
  for (const [method, path, body] of gone) {
    const r = await call(method, path, { body });
    assert.notEqual(r.status, 200, `${method} ${path} should no longer succeed`);
    assert.equal(r.body?.data?.token, undefined, `${path} must not return a token`);
  }

  const topup = await call('POST', '/taxi/users/wallet/topup', { token: A, body: { amount: 5000 } });
  assert.notEqual(topup.status, 201);
  assert.notEqual(topup.status, 200);
});

test('deploy hook is disabled without DEPLOY_WEBHOOK_SECRET', opts, async () => {
  const r = await fetch(`${ORIGIN}/api/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The old hardcoded secret's signature over "{}".
      'x-hub-signature-256': 'sha256=3bd063547725e23b77fddf5064f24ed9919d0b909749bdb15956c2e933f2a0ef',
    },
    body: '{}',
  });
  assert.equal(r.status, 404);
});

test('admin login no longer auto-creates the hardcoded default superadmin', opts, async () => {
  const r = await call('POST', '/auth/admin/login', {
    body: { email: 'admin@tourismdimahasao.in', password: 'Dima Hasao@2026' },
  });
  assert.equal(r.status, 401);
});

test('admin reset OTP is never the static 123456 and does not reveal unknown emails', opts, async () => {
  const unknown = await call('POST', '/auth/admin/forgot-password/request-otp', { body: { email: 'nobody-here@example.com' } });
  assert.equal(unknown.status, 200);

  await call('POST', '/auth/admin/forgot-password/request-otp', { body: { email: 'admin@gmail.com' } });
  const reset = await call('POST', '/auth/admin/forgot-password/reset', {
    body: { email: 'admin@gmail.com', otp: '123456', newPassword: 'attacker-pass' },
  });
  assert.notEqual(reset.status, 200);
});

test('parallel wrong OTP guesses cannot exceed the attempt limit', opts, async () => {
  const phone = '9000000883';
  await call('POST', '/auth/otp/request', { body: { audience: 'user', phone } });
  await Promise.all(Array.from({ length: 8 }, () =>
    call('POST', '/auth/otp/verify', { body: { audience: 'user', phone, otp: '0000' } })));
  // The right code must now be refused: the limit (5) was spent by the burst.
  const right = await call('POST', '/auth/otp/verify', { body: { audience: 'user', phone, otp: '1234' } });
  assert.notEqual(right.status, 200, 'attempt limit was bypassed by concurrent guesses');
});

test('food finance routes refuse a consumer token', opts, async () => {
  for (const [method, path] of [
    ['GET', '/food/payments/admin/settlements'],
    ['POST', '/food/payments/admin/settlements'],
    ['GET', '/food/payments/admin/finance/summary'],
    ['GET', '/food/payments/restaurant/6ac5e75b49517302e129923a/wallet'],
    ['GET', '/food/payments/delivery/6ac5e75b49517302e129923a/wallet'],
  ]) {
    const r = await call(method, path, { token: A, body: method === 'POST' ? { entityType: 'restaurant', entityId: '6ac5e75b49517302e129923a', amount: 1 } : undefined });
    assert.equal(r.status, 403, `${method} ${path} → ${r.status}`);
  }
  const other = await call('GET', '/food/payments/orders/6ac5e75b49517302e129923a/payments', { token: A });
  assert.equal(other.status, 404);
});

test('replaceUrl cannot delete a file the caller did not upload', opts, async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } }).png().toBuffer();
  const upload = (token, extra = {}) => {
    const form = new FormData();
    form.append('folder', 'test');
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    form.append('file', new Blob([png], { type: 'image/png' }), 'x.png');
    return call('POST', '/uploads/image', { token, form });
  };

  const mine = await upload(A);
  assert.equal(mine.status, 200);
  const victimUrl = mine.body.data.url;

  const attack = await upload(B, { replaceUrl: victimUrl });
  assert.equal(attack.status, 200);
  assert.equal((await call('GET', victimUrl)).status, 200, 'another user deleted the file via replaceUrl');

  // The owner can still replace their own file.
  const own = await upload(A, { replaceUrl: victimUrl });
  assert.equal(own.status, 200);
  assert.equal((await call('GET', victimUrl)).status, 404);
});

test('refresh rotates the token; old token still works in compat mode', opts, async () => {
  const login = await call('POST', '/auth/admin/login', { body: { email: 'admin@gmail.com', password: 'admin123' } });
  const R1 = login.body.data.refreshToken;
  const first = await call('POST', '/food/auth/refresh-token', { body: { refreshToken: R1 } });
  assert.equal(first.status, 200);
  assert.ok(first.body.data.refreshToken && first.body.data.refreshToken !== R1, 'refresh token was not rotated');
  if (process.env.REFRESH_TOKEN_ROTATION !== 'enforce') {
    const again = await call('POST', '/food/auth/refresh-token', { body: { refreshToken: R1 } });
    assert.equal(again.status, 200);
    assert.equal(again.body.data.refreshToken, first.body.data.refreshToken, 'old token should map to its successor');
  }
});

test('changing an admin password revokes older sessions but keeps the changer signed in', opts, async () => {
  const login = await call('POST', '/auth/admin/login', { body: { email: 'admin@gmail.com', password: 'admin123' } });
  const oldAccess = login.body.data.accessToken;
  const oldRefresh = login.body.data.refreshToken;
  await new Promise((r) => setTimeout(r, 1500)); // iat is whole seconds

  const changed = await call('POST', '/auth/admin/change-password', {
    token: oldAccess, body: { currentPassword: 'admin123', newPassword: 'admin123-rotated' },
  });
  assert.equal(changed.status, 200);
  const { accessToken, refreshToken } = changed.body.data;
  try {
    assert.ok(accessToken && refreshToken, 'change-password must hand back a fresh pair');
    assert.equal((await call('GET', '/admin/meta', { token: oldAccess })).status, 401);
    assert.equal((await call('GET', '/food/admin/sidebar-badges', { token: oldAccess })).status, 401);
    assert.equal((await call('POST', '/food/auth/refresh-token', { body: { refreshToken: oldRefresh } })).status, 401);
    assert.equal((await call('GET', '/admin/meta', { token: accessToken })).status, 200);
  } finally {
    await new Promise((r) => setTimeout(r, 1100));
    const restore = await call('POST', '/auth/admin/change-password', {
      token: accessToken, body: { currentPassword: 'admin123-rotated', newPassword: 'admin123' },
    });
    assert.equal(restore.status, 200, 'could not restore the seeded admin password');
  }
});
