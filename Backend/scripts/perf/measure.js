/**
 * Endpoint latency baseline.
 *
 * Measures real requests against a running server rather than reasoning about
 * the code: each endpoint is called once to warm it (so a cold lazy import or
 * a first connection does not get recorded as the endpoint's cost), then
 * SAMPLES times, and the median is reported alongside min/max and payload size.
 *
 * Median, not mean: one GC pause or one slow disk read should not decide an
 * endpoint's number.
 *
 * Usage: node scripts/perf/measure.js [--samples 7] [--out <file.json>]
 */
import { request } from '../qa/lib/http.js';
import { provision, adminSession } from '../qa/lib/identities.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Sessions are cached between runs.
 *
 * Provisioning goes through the real OTP endpoint, which is rate limited — and
 * a baseline is worth re-running many times while optimizing. Without this,
 * every second or third run failed to get a session and measured nothing.
 * Tokens are long-lived here, so a cache file is enough; delete it to re-auth.
 */
const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.sessions.json');

const sessions = async () => {
  if (existsSync(CACHE)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE, 'utf8'));
      const probe = await request('GET', '/food/user/profile', { token: cached.user });
      if (probe.status === 200) return cached;
    } catch {
      /* fall through and re-provision */
    }
  }

  const { primary } = await provision();
  const admin = await adminSession();
  const fresh = { user: primary?.token || null, admin: admin?.token || null };
  if (fresh.user) {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, JSON.stringify(fresh));
  }
  return fresh;
};

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const SAMPLES = Number(arg('samples', 7));
const OUT = arg('out', null);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const time = async (method, path, token) => {
  const started = process.hrtime.bigint();
  const res = await request(method, path, { token });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { ms, status: res.status, bytes: Buffer.byteLength(JSON.stringify(res.body ?? '')) };
};

const measure = async (label, method, path, token) => {
  const warm = await time(method, path, token);
  if (warm.status >= 400) {
    return { label, path, status: warm.status, skipped: true };
  }

  const runs = [];
  for (let i = 0; i < SAMPLES; i += 1) runs.push(await time(method, path, token));

  const times = runs.map((r) => r.ms);
  return {
    label,
    path,
    status: warm.status,
    median: Math.round(median(times)),
    min: Math.round(Math.min(...times)),
    max: Math.round(Math.max(...times)),
    cold: Math.round(warm.ms),
    kb: Math.round((runs[0].bytes / 1024) * 10) / 10,
  };
};

const run = async () => {
  const { user, admin: adminToken } = await sessions();

  if (!user) {
    console.error('no consumer session — server up with USE_DEFAULT_OTP=true? (OTP request is rate limited; wait and retry)');
    process.exit(1);
  }

  /* Endpoints a customer's screens actually hit, plus the admin reads that
   * aggregate across modules — the two places latency is felt. */
  const targets = [
    ['consumer', 'food home / landing', 'GET', '/food/landing/settings/public', user],
    ['consumer', 'restaurants list', 'GET', '/food/restaurant/restaurants', user],
    ['consumer', 'food orders (history)', 'GET', '/food/orders', user],
    ['consumer', 'food cart', 'GET', '/food/cart', user],
    ['consumer', 'food profile', 'GET', '/food/user/profile', user],
    ['consumer', 'taxi rides', 'GET', '/taxi/rides', user],
    ['consumer', 'hotel bookings (mine)', 'GET', '/hotel/bookings/my', user],
    ['consumer', 'hotel properties list', 'GET', '/hotel/properties', user],
    ['consumer', 'tours packages list', 'GET', '/tours/packages', user],
    ['consumer', 'tours bookings (mine)', 'GET', '/tours/bookings/my', user],
    ['consumer', 'festivals list', 'GET', '/festivals', user],
    ['consumer', 'festival bookings (mine)', 'GET', '/festivals/bookings/my', user],
    ['consumer', 'support tickets (mine)', 'GET', '/support', user],
    ['admin', 'platform reports summary', 'GET', '/admin/reports/overview', adminToken],
    ['admin', 'food orders (admin list)', 'GET', '/food/admin/orders?page=1&limit=20', adminToken],
    ['admin', 'restaurants (admin list)', 'GET', '/food/admin/restaurants?page=1&limit=20', adminToken],
    ['admin', 'hotels (admin list)', 'GET', '/hotel/admin/hotels?page=1&limit=20', adminToken],
    ['admin', 'hotel dashboard stats', 'GET', '/hotel/admin/dashboard-stats', adminToken],
    ['admin', 'hotel finance stats', 'GET', '/hotel/admin/finance', adminToken],
  ];

  const results = [];
  for (const [group, label, method, path, token] of targets) {
    if (!token) {
      results.push({ group, label, path, skipped: true, status: 'no token' });
      continue;
    }
    const r = await measure(label, method, path, token);
    results.push({ group, ...r });
    const line = r.skipped
      ? `  ${String(r.status).padStart(4)}  ${label}  ${r.path}`
      : `  ${String(r.median).padStart(5)}ms  (${String(r.min)}–${r.max}, cold ${r.cold})  ${String(r.kb).padStart(6)}kb  ${label}`;
    console.log(line);
  }

  const slow = results.filter((r) => !r.skipped && r.median >= 300).sort((a, b) => b.median - a.median);
  console.log(`\n${results.filter((r) => !r.skipped).length} endpoints measured, ${SAMPLES} samples each.`);
  if (slow.length) {
    console.log(`\nAt or over 300ms:`);
    slow.forEach((r) => console.log(`  ${String(r.median).padStart(5)}ms  ${r.label}`));
  }
  const skipped = results.filter((r) => r.skipped);
  if (skipped.length) {
    console.log(`\nNot measured (${skipped.length}):`);
    skipped.forEach((r) => console.log(`  ${r.status}  ${r.label}  ${r.path || ''}`));
  }

  if (OUT) {
    writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), samples: SAMPLES, results }, null, 2));
    console.log(`\nwrote ${OUT}`);
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
