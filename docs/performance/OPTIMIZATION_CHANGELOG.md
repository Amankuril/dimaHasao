# Optimization changelog

Each entry records what was changed, what it was measured to do, and how the
result was checked. Entries with no measured improvement say so.

Conditions and method: [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md).
Findings this work came from: [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md).

## How these numbers were obtained

Before/after pairs come from an **interleaved A/B on one machine**: measure the
current code, `git stash`, wait for the server to reload, measure the original,
`git stash pop`, measure again — repeated twice. Two endpoints whose code did
not change (`/taxi/rides`, `/food/admin/restaurants`) were measured in every run
as controls.

This was necessary. A first attempt compared a run taken while a second dev
server and a browser were loading the machine against a baseline taken on a
quiet one, and it showed endpoints that had not been touched getting 2.6× slower.
Those numbers were discarded rather than reported.

Control readings across the four A/B runs:

| Control endpoint | Before | After |
|---|---|---|
| `/taxi/rides` | 90ms, 87ms | 77ms, 78ms |
| `/food/admin/restaurants` | 66ms, 71ms | 81ms, 69ms |

The controls move by roughly ±15% run to run. Any result below that is noise.

---

## OPT-001 — `getDashboardStats` issues its queries together

**Module:** hotel (admin) · **File:** `Backend/src/modules/hotel/controllers/adminController.js`
**Audit finding:** P1

**Problem.** `GET /hotel/admin/dashboard-stats` took ~500ms against a nearly
empty database — the slowest endpoint measured.

**Root cause.** Nine queries ran inside a `Promise.all`, then twelve more ran
one `await` at a time. None of the twelve read another's result; they were
sequential only because they were written on consecutive lines. Twelve round
trips at the measured ~40ms floor accounts for the whole gap.

Three of the queries were also **dead**: `usersLastMonth` and
`bookingsLastMonth` were destructured and never read, and `lastMonthRevenueData`
fed only `prevRevenue`, which nothing used.

**Solution.** One `Promise.all` covering all sixteen live reads. The three dead
queries deleted rather than parallelised. `.lean()` added to the two `find()`
calls whose rows are serialised straight to JSON. No query filter, no
projection, no output field changed.

**Measured:** 498ms and 518ms → **166ms and 160ms**. A **68% reduction**, well
outside control noise, reproduced across two passes.

**Regression status:** response compared field-by-field against the original —
**identical**. QA suite 124/125 passing, 1 blocked, unchanged from before.

---

## OPT-002 — `getFinanceStats` totals and rows fetched together

**Module:** hotel (admin) · **File:** `Backend/src/modules/hotel/controllers/adminController.js`
**Audit finding:** P2

**Problem.** `GET /hotel/admin/finance` took ~235ms to return 1.1kb.

**Root cause.** The revenue aggregate and the 50-row transaction list read the
same collection with the same filter, one after the other, and neither uses the
other's result.

**Solution.** `Promise.all`, plus `.lean()` on the transaction list (read-only,
serialised straight to JSON).

**Measured:** 233ms and 240ms → **186ms and 169ms**. A **25% reduction**,
reproduced across two passes.

**Regression status:** response identical. The nested `propertyId → partnerId`
populate was left alone; it is a correctness-relevant shape, not a cheap win.

---

## OPT-003 — Paginated list endpoints stop serialising count and find

**Module:** hotel (admin) · **File:** `Backend/src/modules/hotel/controllers/adminController.js`
**Audit finding:** P2

**Problem.** Four list endpoints ran `countDocuments(query)` and then
`find(query)` as two round trips.

**Solution.** `Promise.all` on all four (`getAllUsers`, `getAllPartners`,
`getAllHotels`, `getAllBookings`). `.lean()` on three of them — see OPT-004 for
why not the fourth.

**Measured: no improvement outside noise.** `/hotel/admin/hotels` read 201ms and
205ms before, 220ms and 172ms after — the two passes disagree on the sign, so
the honest reading is that nothing changed. The second round trip was not what
that endpoint was spending its time on; the remaining cost has not been root
caused.

**Kept anyway** because it is strictly less work for identical output, but it is
recorded here as **a change with no demonstrated benefit**, not as a win.

**Regression status:** all four responses identical.

---

## OPT-004 — `.lean()` reverted on `getAllUsers` after it changed the response

**Module:** hotel (admin) · **Audit finding:** P3
**This entry records a regression that was introduced and then caught.**

**What happened.** OPT-003 added `.lean()` to four list endpoints. A field-level
comparison of every response before and after showed `/hotel/admin/users` had
**lost nine fields**, among them `active`, `address.country`, `deletionRequest`,
`profileImagePublicId` and `currentRideId`.

**Root cause.** The User schema defines defaults for fields that most stored
documents do not physically carry. Mongoose materialises those defaults while
hydrating a document. `.lean()` returns the raw BSON, so a field that was only
ever a schema default is simply absent — and client code reading `user.active`
would get `undefined` where it used to get `true`.

**Resolution.** `.lean()` removed from `getAllUsers`; the `Promise.all` kept. A
comment at the call site records why this one endpoint differs from its
siblings, so it is not "tidied up" later.

**The general lesson, which applies to the rest of the `.lean()` work in the
audit:** `.lean()` is not a safe drop-in. It is safe only where the stored
documents already carry every field the schema would default, and that has to be
verified per endpoint against real data — not assumed from reading the query.

**Regression status after revert:** all six hotel admin responses identical to
the originals.

---

## OPT-005 — An invalid ticket id returns 400, not 500

**Module:** core/support · **File:** `Backend/src/core/support/support.routes.js`
**Audit finding:** P8

**Problem.** `GET /api/v1/support/tickets` returned **500**. The path matches
`GET /:id` with `id="tickets"`, the ObjectId cast threw, and a client's wrong
URL was recorded as a server fault.

**Solution.** The id is validated with `mongoose.isValidObjectId` before it
reaches the query; a bad one returns 400.

**Measured impact on latency: none, and none expected.** This is a correctness
and observability fix — a server whose error rate counts client mistakes cannot
be monitored. It is listed here because it was found while building the
measurement harness.

**Regression status:** `/support` (the real list path) still returns 200 with
the same body. QA suite unchanged.

---

## Summary

| ID | Change | Measured result |
|---|---|---|
| OPT-001 | Dashboard queries parallelised, 3 dead queries removed | **−68%** (508ms → 163ms) |
| OPT-002 | Finance totals and rows fetched together | **−25%** (236ms → 178ms) |
| OPT-003 | Four list endpoints stop serialising count + find | No change outside noise |
| OPT-004 | `.lean()` reverted where it dropped response fields | Regression avoided |
| OPT-005 | Invalid id returns 400 instead of 500 | No latency change; defect fixed |
| OPT-006 | Tours resolves the caller in one round trip | **−43%** (188ms → 107ms) |
| OPT-007 | Same change on hotel — **reverted** | 13% *slower*; hotel's first lookup already hit |
| OPT-008 | Three duplicate frontend fetches removed | `/food/user` 14→12 calls, `/taxi/user` 17→16, 0 duplicates |

---

## OPT-006 — Tours resolves the caller's account in one round trip

**Module:** tours · **File:** `Backend/src/modules/tours/middlewares/authMiddleware.js`
**Audit finding:** P5

**Problem.** `GET /tours/bookings/my` took ~190ms to return a 2.3kb response,
and earlier, 131ms to return **nothing at all**. The handler itself is already
one lean query with two populates — the cost was before it ran.

**Root cause.** `protect` → `resolveAccount` tried three collections in series:
`TourOperator`, then `FoodAdmin`, then `FoodUser`. A consumer's account is in
the third, so every consumer request paid two guaranteed misses before the hit.
Three round trips at this stack's ~40ms floor, spent before the handler started,
on **every authenticated tours request**.

The code's own comment said "operators first — they are the common case on this
router", which is true of the operator panel and false of `/bookings/my`.

**Solution.** The three lookups are issued together with `Promise.all` and the
first hit **in the original order** wins. Precedence is unchanged, so an id
present in two collections resolves exactly as before. The trade is two extra
indexed `_id` reads in parallel against up to three in series.

**Measured:** 209ms and 167ms → **98ms and 116ms**. A **43% reduction**, both
passes agreeing, against controls that moved ~10%.

**Regression status:** `/tours/bookings/my` (as consumer and as admin) and
`/tours/packages` compared before and after — identical. QA suite 124/125,
1 blocked, unchanged.

---

## OPT-007 — The same change was made to hotel, measured, and reverted

**Module:** hotel · **Audit finding:** P5
**This entry records an optimization that made things worse.**

Hotel's `resolveAccount` has the identical shape — four sequential `findById`
calls (`User`, `Partner`, `Admin`, `FoodUser`) — so it got the identical
treatment, on the reasoning that four misses in series must be worse than four
lookups in parallel.

**The measurement disagreed.** `/hotel/bookings/my` went from 137ms and 143ms to
**153ms and 162ms** — roughly 13% *slower*, with both passes agreeing on the
sign while the unrelated `/hotel/properties` and `/festivals` controls did not
move.

**Why.** `Backend/src/modules/hotel/models/User.js` is a re-export of
`FoodUser`, and both point at the same `users` collection. Hotel's **first**
lookup is therefore the consumer lookup — a consumer was already resolving in
one query. Parallelising turned one query into four.

Reading the code suggested a four-deep waterfall. Only measuring showed there
was no waterfall to fix for the common caller.

**Resolution.** Reverted. Hotel's middleware is untouched.

**Left as a finding, not fixed:** because `User` *is* `FoodUser`, hotel's
fourth lookup re-queries a model that already missed and can never succeed.
It is dead work on every failed authentication. Low value, recorded rather than
changed.

---

## OPT-008 — Three requests that were fetched twice on every page load

**Module:** food, taxi · **Audit finding:** new (frontend pass, 2026-09-18)

**How these were found.** Each screen was loaded in the **production build**,
its API calls counted, then counted again after 15 seconds of sitting idle. The
idle re-count matters: calls that keep arriving while nothing happens are a
render loop or a poll, not page load.

**No render loops exist.** Every screen measured — `/app`, `/app/bookings`,
`/app/profile`, `/food/user`, `/taxi/user` — showed **zero growth while idle**.
Nothing is re-rendering into a refetch.

Three endpoints were genuinely fetched twice:

### `/food/admin/business-settings/public` ×2

`Backend`-agnostic; `Frontend/src/modules/Food/utils/businessSettings.js`.

`loadBusinessSettings` guards against concurrent callers with
`inFlightSettingsPromise`, but clears it in a `finally` the moment the first
call settles — so it dedupes *concurrent* callers only. App boot fetches at
~364ms; the navbar mounts and asks again at ~1736ms, by which point the guard
is gone. Measured 1.37s apart.

The call also passed `{ noCache: true }`, explicitly opting out of the shared
3-second dedup cache that would have collapsed the pair. Removed. Three seconds
is still fresh data from the server; the second request bought nothing.

### `/food/landing/settings/public` ×2

Two dedup caches for one URL. `BottomNavigation` and `DesktopNavbar` went
through `getLandingSettingsPublic` (its own in-flight map); `Home.jsx` went
through `publicGetOnce` (the shared 3-second cache). Neither knew about the
other, so both fired — 12ms apart.

The two navigation call sites now pass `publicGetOnce` as the fetcher, so every
caller of this URL shares one cache. No response shape changed: the helper
already unwraps the payload itself.

### `/taxi/users/app-modules` ×2

`ServiceGrid` is rendered **twice** on the taxi home screen — once in the grid,
once behind the all-services modal — and each instance runs its own mount
effect. The effect is correct (empty deps, `isMounted` guard, cleanup); the
duplication is structural.

Deduped in `userService.getAppModules` rather than in the component, so it stays
fixed however many `ServiceGrid`s exist and the rendering structure — which is
deliberate — is untouched. The window is cleared **on a timer, not on settle**:
two components mounting a few hundred milliseconds apart are not concurrent, and
clearing on settle would let the second through, which is exactly the bug in the
business-settings case above.

**Measured, production build:**

| Screen | Calls before | Calls after | Duplicates before | after |
|---|---:|---:|---:|---:|
| `/food/user` | 14 | **12** | 2 endpoints | **0** |
| `/taxi/user` | 17 | **16** | 1 endpoint | **0** |
| `/app` | 7 | 7 | 0 | 0 |

**Regression status:** taxi home renders its full service grid (Parcel on Bike,
Auto, Cab Economy, Bike) from the deduped fetch, and the all-services entry is
present. Food home still shows its restaurant list, and the document title and
favicon — both driven by business settings — are still applied. Frontend build
passes.

---

## Frontend findings deliberately NOT acted on

**`/app` fetching five modules' booking lists (audit P7).** Left as is. The five
calls are already issued in parallel, and `BookingContext` loads once per page
load rather than per navigation — `/app`, `/app/bookings` and `/app/profile` all
show the same 7 calls because they share one load, not because each refetches.
Deferring them would make the bookings screen slower on first visit and risks
context consumers rendering empty. That is a trade, not a win.

**876KB entry CSS (audit P9).** Unchanged. The Taxi stylesheet carries global
rules other modules inherit — it blanked every icon in the app once already —
so splitting it is behavioural, not cosmetic.

**`React.memo` / `useMemo` / `useCallback`.** None added. The mandate's own rule
applies: they need profiling evidence, and the idle-growth measurement found no
render loops to justify them. Adding them blind risks stale closures for no
measured gain.
