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
