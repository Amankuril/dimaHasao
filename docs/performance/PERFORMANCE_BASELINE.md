# Performance baseline

Measured 2026-09-18 against the running development stack. Every number here
came from an actual request; nothing is estimated. Where something could not be
measured it says so.

## Test conditions

| | |
|---|---|
| Backend | `localhost:5000`, `NODE_ENV=development`, local MongoDB |
| Frontend (production numbers) | `vite preview` of `npm run build` output, `127.0.0.1:4174` |
| Frontend (dev numbers) | Vite dev server, `localhost:5173` |
| Browser | Chromium, phone viewport 375x812 where stated |
| Account | Seeded consumer `8962843670`; seeded platform superadmin |
| Method | `Backend/scripts/perf/measure.js` — one warm-up request, then 7 samples, **median** reported |

**The database is nearly empty**: 6 food orders, 16 hotel bookings, 0 tour
bookings, 2 restaurants. This matters more than any other condition on this
page. These timings are close to the fixed cost of each endpoint, so an
endpoint at 200–500ms here is slow *before data exists*, and the numbers say
nothing about how any of them behave at production volume. Treat every figure
as a floor, not a forecast.

## Backend endpoint latency

Median of 7 samples. `kb` is the JSON response size.

| Endpoint | Median | Min–max | Cold | Size | Note |
|---|---:|---|---:|---:|---|
| `GET /hotel/admin/dashboard-stats` | **511ms** | 492–537 | 512 | 7.2kb | 13 awaits, 12 of them sequential |
| `GET /hotel/admin/finance` | **226ms** | 222–254 | 232 | 1.1kb | nested populate, no lean |
| `GET /hotel/admin/hotels?limit=20` | **217ms** | 215–255 | 329 | 4.6kb | sequential count + find |
| `GET /festivals/bookings/my` | 167ms | 160–187 | 165 | 2.0kb | |
| `GET /tours/bookings/my` | 131ms | 128–142 | 172 | **0kb** | 131ms to return nothing |
| `GET /admin/reports/overview` | 123ms | 105–223 | 108 | 0.9kb | cross-module aggregate |
| `GET /hotel/bookings/my` | 113ms | 96–168 | 188 | 24.7kb | |
| `GET /food/orders` | 104ms | 98–128 | 144 | **40.5kb** | ~6.7kb per order |
| `GET /food/restaurant/restaurants` | 104ms | 95–112 | 99 | 2.6kb | has `cacheResponse(300)` |
| `GET /support` | 102ms | 84–138 | 100 | **0kb** | 102ms to return nothing |
| `GET /tours/packages` | 99ms | 92–133 | 98 | 6.8kb | |
| `GET /food/admin/orders?limit=20` | 83ms | 70–116 | 91 | 35.3kb | |
| `GET /taxi/rides` | 72ms | 69–81 | 104 | 0.1kb | |
| `GET /food/cart` | 70ms | 58–74 | 90 | 0.2kb | |
| `GET /food/user/profile` | 70ms | 63–99 | 68 | 1.4kb | |
| `GET /food/admin/restaurants?limit=20` | 67ms | 56–99 | 66 | 1.1kb | |
| `GET /hotel/properties` | 37ms | 30–41 | 40 | 7.3kb | |
| `GET /festivals` | 37ms | 32–49 | 38 | 6.2kb | |
| `GET /food/landing/settings/public` | 38ms | 30–42 | 41 | 0.4kb | |

The cheapest endpoints sit at 37–40ms, which is this stack's per-request floor
(process + auth middleware + one indexed query). Anything far above that is
paying for extra round trips, not for data.

## Frontend — `/app` home screen

Same screen, same account, both builds.

| | Dev server | Production build |
|---|---:|---:|
| API requests | 16 | **7** |
| Unique endpoints | 11 | 7 |
| Duplicated requests | **5** | **0** |

The five duplicates in dev are React StrictMode double-invoking effects, which
it does **only in development**. They do not exist in the production build.
This was measured rather than assumed, and it is the reason no "fix duplicate
requests" work appears in the plan — there is nothing to fix.

Production call sequence on `/app`:

| Started at | Endpoint | Duration |
|---:|---|---:|
| 84ms | `/food/public/customization-settings` | 38ms |
| 108ms | `/food/admin/business-settings/public` | 40ms |
| 463ms | `/tours/bookings/my` | 111ms |
| 463ms | `/hotel/bookings/my` | 145ms |
| 464ms | `/taxi/rides` | 62ms |
| 464ms | `/food/orders` | 117ms |
| 465ms | `/festivals/bookings/my` | 166ms |

The five booking calls are already issued in parallel — that part is healthy.
The finding is *that they happen at all*: the home screen renders no bookings.

## Frontend — bundle

From `dist/` on disk, not from the browser (browser figures were cache hits).

| Asset | Raw | Gzip |
|---|---:|---:|
| Entry JS `index-*.js` | 611KB | 193KB |
| Entry CSS `index-*.css` | 876KB | **114KB** |
| `AdminCategories-*.js` | 516KB | 141KB |
| `jspdf.es.min-*.js` | 376KB | 121KB |
| `AdapterDateFns-*.js` | 344KB | 104KB |
| `xlsx-*.js` | 324KB | 109KB |
| `AreaChart-*.js` | 323KB | 92KB |
| `firebase-*.js` | 250KB | 72KB |

The entry CSS carries 11,847 rule blocks — every module's stylesheet, loaded on
every page including the login screen. The heavy libraries (jspdf, xlsx,
html2canvas, recharts, date-fns) were each checked against the entry chunk and
are **correctly lazy** — none is in the initial download.

## Not measured

| Area | Why |
|---|---|
| Production VPS latency | No access from here; all numbers are local |
| Behaviour at real data volume | The dev database is nearly empty (see above) |
| LCP / TTI | Not captured; the browser tooling here reports resource timings, not paint metrics |
| MongoDB `explain()` plans | Not yet collected — planned as part of the index review |
| Memory and CPU under load | No load generation was run; doing so against the shared dev database was judged unsafe |
| Socket.io connection lifecycle | Not exercised in this pass |

## Re-running

```bash
node Backend/scripts/perf/measure.js --samples 7 --out /tmp/baseline.json
```

Sessions are cached in `Backend/scripts/perf/.sessions.json` because the auth
endpoints are rate limited (100 requests per window in development) and a
baseline is worth running repeatedly. Delete that file to re-authenticate.
