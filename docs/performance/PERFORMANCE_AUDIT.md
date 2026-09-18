# Performance audit

Audit date 2026-09-18. Findings are ordered by measured impact. Every one cites
its evidence; where a suspicion could not be confirmed it is recorded as
unverified rather than asserted.

Measurements and conditions: [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md).

## Scope covered

Backend `Backend/src` (574 JS files, 64 models, 6 modules + 14 core areas),
frontend `Frontend/src` (1179 files), the built bundle, and the request
behaviour of the consumer app in both dev and production builds.

## The shape of the problem

Nothing in this codebase is slow because of the volume of data — there is
almost none. Endpoints are slow because of **how many round trips they take to
answer one question**. The cheapest endpoints answer in 37–40ms; that is the
floor. An endpoint at 511ms is not doing 13× more work, it is waiting 13 times.

That also bounds the opportunity honestly: fixing round trips will not help an
endpoint that is already at the floor, and none of this predicts behaviour once
the database fills up. The index and N+1 findings below matter *more* later, not
less.

---

## P1 — `getDashboardStats` serialises 12 independent queries

**Severity: high. Measured: 511ms median (492–537), the slowest endpoint found.**

`Backend/src/modules/hotel/controllers/adminController.js:22`

The handler opens well — nine counts and aggregates inside one `Promise.all`.
Then it awaits **twelve more queries one at a time**:

```js
const usersNewThisMonth      = await User.countDocuments({...});
const usersNewLastMonth      = await User.countDocuments({...});
const bookingsThisMonth      = await Booking.countDocuments({...});
const bookingsLastMonthCount = await Booking.countDocuments({...});
const revThisMonthAgg        = await Booking.aggregate([...]);
const revLastMonthAgg        = await Booking.aggregate([...]);
// ... monthlyRevenue, bookingStatusStats, recentBookings, recentPropertyRequests
```

None of them reads another's result. They are sequential only because they were
written on consecutive lines.

**Evidence the round trips are the cost:** 12 sequential queries × the measured
~40ms floor ≈ 480ms, against 511ms measured. The arithmetic accounts for the
whole gap.

**Fix:** move them into the existing `Promise.all`. No query changes, no output
changes. Expected ≈ 60–90ms.

**Risk: low.** Read-only handler, no writes, no ordering dependency.

---

## P2 — Paginated list endpoints await `countDocuments` then `find`

**Severity: medium. Measured: `/hotel/admin/hotels` 217ms for 20 rows / 4.6kb.**

`Backend/src/modules/hotel/controllers/adminController.js` (`getAllHotels`), and
the same shape elsewhere.

```js
const total  = await Property.countDocuments(query);
const hotels = await Property.find(query).populate(...).skip(skip).limit(limit);
```

The count does not inform the find. Two round trips where one suffices.

**Fix:** `Promise.all`. Response body unchanged.

**Risk: low.**

---

## P3 — The hotel module hydrates full Mongoose documents on read paths

**Severity: medium, rising with data volume.**

Repo-wide the codebase is disciplined about this — **966 `.lean()` calls against
324 `.populate()`**. The hotel module is the outlier:

| File | `.populate()` | `.lean()` |
|---|---:|---:|
| `modules/hotel/controllers/bookingController.js` | 25 | **0** |
| `modules/hotel/controllers/reviewController.js` | 4 | **0** |
| `modules/hotel/controllers/paymentController.js` | 4 | **0** |
| `modules/taxi/admin/controllers/poolingController.js` | 3 | **0** |

Every read in those files builds full documents with getters, setters, virtuals
and change tracking, then serialises them. `getFinanceStats` compounds it with a
populate nested inside a populate (`propertyId` → `partnerId`).

This is consistent with hotel owning the three slowest endpoints and with
`/hotel/bookings/my` returning 24.7kb for 16 bookings.

**Fix:** add `.lean()` to read-only queries only. **Not** to anything whose
result is later `.save()`d — a lean object has no `save`, so this must be
applied per call site after checking, never by find-and-replace.

**Risk: medium** — mechanical but easy to get wrong. Needs per-site review.

---

## P4 — 51 handlers run every query sequentially, but most must

**Severity: informational — this number should not be acted on as a whole.**

A scan (`Backend/scripts/perf/scan-waterfalls.js`) found 55 handlers with 5+
awaited queries; 51 issue them sequentially. Worst offenders:

| Queries | Handler |
|---:|---|
| 28 | `taxi/driver/services/onboardingService.js:1235` `completeDriverOnboarding` |
| 22 | `taxi/admin/services/adminService.js:3205` `seedInitialData` |
| 16 | `hotel/controllers/bookingController.js:139` `createBooking` |
| 15 | `food/orders/services/order.service.js:195` `createOrder` |
| 14 | `hotel/controllers/paymentController.js:111` `verifyPayment` |
| 13 | `hotel/controllers/bookingController.js:598` `cancelBooking` |

**These are write flows, and their sequence is the business logic.** Booking
creation checks availability, takes inventory, writes a ledger row, then saves a
balance — in that order, deliberately. Parallelising them would be a correctness
bug wearing a performance costume, and the mandate forbids it.

**Action: none on write paths.** Only read handlers are candidates, and they are
listed individually above. The scan is kept as a tool, not as a task list.

---

## P5 — Fixed cost dominates: endpoints that take 100ms+ to return nothing

**Severity: medium. Measured.**

| Endpoint | Median | Payload |
|---|---:|---:|
| `GET /tours/bookings/my` | 131ms | **0kb** |
| `GET /support` | 102ms | **0kb** |
| `GET /festivals/bookings/my` | 167ms | 2kb |

Returning an empty list should cost one indexed query. At 3–4× the 40ms floor,
these are doing setup work before they know there is nothing to do.

**Root caused (2026-09-18).** It is not the query — it is authentication.
`modules/tours/middlewares/authMiddleware.js` resolved the caller by trying
three collections *in series* (`TourOperator`, `FoodAdmin`, `FoodUser`). A
consumer sits in the third, so every consumer request paid two guaranteed
misses before the hit — three round trips before the handler ran. Fixed in
OPT-006, measured at −43%.

Hotel's middleware has the same four-deep shape and got the same fix, which
**made it slower** and was reverted (OPT-007): `modules/hotel/models/User.js`
re-exports `FoodUser` onto the same `users` collection, so hotel's *first*
lookup is already the consumer lookup. Reading the code suggested a waterfall;
measuring showed there was none for the common caller.

That same aliasing leaves a smaller finding behind: hotel's fourth lookup
(`FoodUser`) re-queries a model that already missed as `User`, so it can never
succeed. Dead work on every failed authentication. **Not fixed** — low value,
recorded here.

`/support` at ~100ms for an empty list is **still unexplained**. Its router also
does a `FoodUser.findById` in middleware on top of `authMiddleware`, which is a
likely contributor, but this was not measured.

---

## P6 — `/food/orders` returns 40.5kb for 6 orders

**Severity: medium, rising with data volume. Measured.**

~6.7kb per order on a list endpoint. A history list needs enough to render a
row; this is returning whole order documents. At 200 orders this is a 1.3MB
response on a phone.

**Fix:** project only the fields the list renders. **This changes a response
shape**, so it requires finding every consumer first — the restaurant panel and
the user history already disagreed about this payload once (see the `orders`
alias bug in project history). Not safe to do blind.

**Risk: medium-high.** Deferred pending a consumer audit.

---

## P7 — `/app` home fetches five modules' bookings it never renders

**Severity: medium. Measured in the production build.**

The home screen issues 7 API calls. Five of them — `/tours/bookings/my`,
`/hotel/bookings/my`, `/taxi/rides`, `/food/orders`, `/festivals/bookings/my` —
are the slowest endpoints in the app (62–166ms each), and the home screen
displays none of them. They are fetched because `BookingContext` loads
everything on mount.

To their credit they are issued **in parallel**, so they cost ~166ms wall clock
rather than ~600ms. But they compete for connections with what the screen does
need, and they start at 463ms.

**Fix options:** defer these to the screens that render them, or keep eager
loading but let the bottom-nav badge drive it. Either changes when data is
available to context consumers, so it needs care.

**Risk: medium** — `BookingContext` is consumed by Profile, Bookings and the nav
badge.

---

## P8 — An invalid id returns 500 instead of 400

**Severity: low for latency, real as a defect. Reproduced.**

`GET /api/v1/support/tickets` → **500** `{"message":"Could not load this ticket"}`

`/support/tickets` matches the `GET /:id` route with `id="tickets"`, the
ObjectId cast throws, and the error surfaces as a server error. The correct list
path is `GET /support`, which returns 200.

Thrown-and-caught cast errors are cheap individually but they mean a class of
client mistake is recorded as a server fault, which makes error-rate monitoring
useless. **Found while building the measurement harness, not by looking for it.**

**Fix:** validate the id before casting, return 400.

**Risk: very low.**

---

## P9 — Entry CSS is 876KB raw / 114KB gzip on every page

**Severity: medium. Measured from `dist/`.**

11,847 rule blocks — Tailwind plus every module's stylesheet (Food, Taxi, Hotel,
Tours, DimaHasao) — in the single eagerly-linked stylesheet, downloaded before
first paint even on the login screen.

The JavaScript side is in good shape by comparison: jspdf, xlsx, html2canvas,
recharts and date-fns were each checked and are **correctly lazy**, none in the
entry chunk.

**Fix:** split module themes into their route chunks. **Non-trivial** — the
Taxi stylesheet carries global rules that other modules currently inherit (it
already blanked every icon in the app once, see project history), so moving it
is behavioural, not cosmetic.

**Risk: high.** Recorded, not scheduled.

---

## P10 — 21 N+1 candidates

**Severity: low now, high at volume. Static finding, not measured.**

21 sites await a query inside a loop. Concentrated in
`taxi/services/rideService.js` (3), `food/admin/services/admin.service.js` (3),
`taxi/admin/services/adminService.js` (2), `hotel/controllers/offerController.js`
(2), `food/dining/services/dining.service.js` (2).

Invisible at current volume. Each is a linear multiplier on a growing
collection. **Needs per-site review** — some loops are over a bounded set (a
booking's categories) and are fine.

---

## Summary

| ID | Finding | Severity | Status |
|---|---|---|---|
| P1 | `getDashboardStats` 12 sequential queries | High | Ready to fix |
| P2 | count + find serialised in list endpoints | Medium | Ready to fix |
| P3 | Hotel reads without `.lean()` | Medium | Ready, per-site |
| P4 | Sequential writes | Info | **No action — business logic** |
| P5 | 100ms+ for empty responses | Medium | Root caused: sequential auth lookups. Tours fixed (OPT-006); hotel attempted and reverted (OPT-007); `/support` still open |
| P6 | `/food/orders` 6.7kb per row | Medium | Needs consumer audit |
| P7 | Home fetches 5 unused booking lists | Medium | Needs context review |
| P8 | Invalid id → 500 | Low | Ready to fix |
| P9 | 876KB entry CSS | Medium | High risk, recorded |
| P10 | 21 N+1 candidates | Low now | Needs per-site review |
