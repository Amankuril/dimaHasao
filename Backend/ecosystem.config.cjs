/**
 * PM2 ecosystem for the Dima Hasao platform.
 *
 * One API process serves every module — they are mounted on the same Express
 * app, not deployed separately:
 *   - Food    /api/v1/food/...      - Hotel   /api/v1/hotel/...
 *   - Taxi    /api/v1/taxi/...      - Tours   /api/v1/tours/...
 *   - Platform  /api/v1/auth, /v1/admin, /v1/uploads
 *
 * Socket.IO runs inside that same process but on its own port (SOCKET_PORT,
 * 5001), so realtime traffic is proxied, scaled and rate-limited separately
 * from REST. Same process means an emit from any controller still reaches the
 * one `io` instance with no cross-process adapter — do not fork this out
 * without adding the Redis adapter first.
 *
 * The BullMQ workers are shared infrastructure, not per-module processes: one
 * queue each for orders, payments, tracking, notifications, OTP and
 * maintenance, serving jobs from every module.
 *
 * Usage (on the server, from the Backend folder):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 logs dima-api
 *
 * Safe rules:
 * - Start Redis BEFORE enabling REDIS_ENABLED / BULLMQ_ENABLED in .env
 * - The API never crashes if Redis blips (queues degrade gracefully)
 * - Workers wait for Redis, then exit 0 (not 1) so PM2 does not hard crash-loop
 * - Open BOTH ports on the firewall/reverse proxy: 5000 (API) and 5001 (socket)
 */

const path = require('path');

/** Every process shares these; per-app env blocks extend rather than replace. */
const baseEnv = {
  NODE_ENV: 'production',
};

/** One worker definition, so the six below cannot drift apart. */
const worker = (name, script) => ({
  name: `dima-worker-${name}`,
  script: path.join('src/queues/workers', script),
  cwd: __dirname,
  instances: 1,
  exec_mode: 'fork',
  max_memory_restart: '256M',
  restart_delay: 5000,
  env: { ...baseEnv },
});

module.exports = {
  apps: [
    // ── API + Socket.IO (all modules, one process) ─────────────────────
    {
      name: 'dima-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      // fork, not cluster: Socket.IO holds in-memory rooms, and clustering
      // without the Redis adapter would deliver events to one worker only.
      exec_mode: 'fork',
      max_memory_restart: '768M',
      // Uploads are written to disk by this process; give it a moment to
      // finish in-flight writes on reload.
      kill_timeout: 10000,
      env: {
        ...baseEnv,
        PORT: 5000,
        SOCKET_PORT: 5001,
      },
    },

    // ── Shared BullMQ workers (all modules) ────────────────────────────
    worker('order', 'order.worker.js'),
    worker('payment', 'payment.worker.js'),
    worker('notification', 'notification.worker.js'),
    worker('tracking', 'tracking.worker.js'),
    worker('otp', 'otp.worker.js'),
    worker('maintenance', 'maintenance.worker.js'),
  ],
};
