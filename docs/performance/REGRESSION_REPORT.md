# Regression report

Covers the optimizations in [OPTIMIZATION_CHANGELOG.md](OPTIMIZATION_CHANGELOG.md),
run 2026-09-18 against the local development stack.

## Automated suite

`node Backend/scripts/qa/run.js` — 125 cases across auth, authorization,
injection, validation, business rules and uploads.

| | Before changes | After changes |
|---|---:|---:|
| Passed | 124 | **124** |
| Failed | 0 | **0** |
| Blocked | 1 | 1 |

No case changed state. The one blocked case was already blocked and is unrelated
to this work.

## Response-equivalence check

The strongest check run here, and the one that caught a real regression.

Every changed endpoint was called before and after the change with the same
account and the same parameters, and the two responses were compared **field by
field, including nested fields**, not merely by status code.

| Endpoint | Result |
|---|---|
| `GET /hotel/admin/dashboard-stats` | Identical |
| `GET /hotel/admin/finance` | Identical |
| `GET /hotel/admin/hotels?page=1&limit=20` | Identical |
| `GET /hotel/admin/users?page=1&limit=20` | Identical **after** the OPT-004 revert |
| `GET /hotel/admin/partners?page=1&limit=20` | Identical |
| `GET /hotel/admin/bookings?page=1&limit=20` | Identical |
| `GET /tours/bookings/my` (as consumer) | Identical |
| `GET /tours/bookings/my` (as admin) | Identical |
| `GET /tours/packages` | Identical |

The `/hotel/admin/users` row is the point of this section. The first run of that
comparison showed **nine fields missing** from the response, caused by a
`.lean()` added in OPT-003. Status code, row count and ordering were all
unchanged — only a field-level comparison surfaced it. It is fixed and
re-verified.

Because these six responses are identical, the screens that consume them cannot
behave differently. That is a stronger statement than a screenshot, and it is
why no UI walkthrough of the hotel admin dashboard was performed for these
changes.

## Frontend checks (OPT-008)

| Check | Result |
|---|---|
| `/app`, `/app/bookings`, `/app/profile`, `/food/user`, `/taxi/user` — API calls after 15s idle | **No growth on any screen** — no render loops |
| Taxi home service grid renders from the deduped fetch | Pass — Parcel on Bike, Auto, Cab Economy, Bike all present |
| Taxi all-services entry still present | Pass |
| Food home restaurant list renders | Pass |
| Document title and favicon (driven by business settings) | Pass — still applied |
| Frontend production build | Pass, including the bundled-icon guard |

All frontend measurements were taken against the **production build**
(`vite preview`), never the dev server: React StrictMode double-invokes effects
in development only, and measuring there reports duplicate requests that do not
exist in production. An earlier dev-server reading showed 16 requests with 5
duplicates on `/app` where production has 7 with none.

## Workflows checked

| Workflow | How | Result |
|---|---|---|
| Consumer OTP login | QA auth suite (28 cases) + manual sign-in during measurement | Pass |
| Admin login | Used for every admin measurement | Pass |
| Authorization boundaries | QA authz suite (22 cases) | Pass |
| Input validation | QA validation suite (30 cases) | Pass |
| Injection resistance | QA injection suite (17 cases) | Pass |
| Business rules (fare quoting, wallet, inventory) | QA business suite (13 cases) | Pass |
| File upload and delete | QA uploads suite (15 cases) | Pass |
| Consumer support ticket list | `GET /support` called directly | Pass — 200, unchanged body |
| Hotel admin dashboard, finance, and four admin lists | Response-equivalence above | Pass |

## Workflows NOT re-tested

The changes are confined to five hotel-admin read handlers and one support
route, and none of the flows below touches that code. They were **not** re-run,
and this is a gap, not a clearance:

Restaurant onboarding · add/edit food · add/edit vehicle · driver workflows ·
hotel onboarding and room management · tour package management · cart and order
placement · multi-restaurant ordering · taxi booking · hotel booking · tour
booking · payments · notifications · admin approval workflows.

## Remaining risks

| Risk | Assessment |
|---|---|
| Other `.lean()` sites in the audit's P3 | **Not yet acted on.** OPT-004 shows why each needs a per-endpoint response comparison first. Do not apply in bulk. |
| `/hotel/admin/hotels` still ~200ms | Cause not identified. The parallelisation did not move it; something else dominates. |
| `/support` still ~100ms for an empty list | Unexplained. Its router adds a `FoodUser.findById` on top of `authMiddleware`; suspected but not measured. |
| Hotel auth still four sequential lookups | Deliberate — parallelising it was measured and was **worse** (OPT-007). Do not retry without re-measuring. |
| Behaviour at real data volume | Untested. The dev database holds 6 food orders and 16 hotel bookings. Every measurement here is a floor. |
| Production latency | Unmeasured. No access from this environment. |
| N+1 sites (audit P10) | 21 candidates identified, none reviewed or changed. |
| `/app` still fetches five booking lists on load | Deliberate (see changelog). Parallel, and loaded once per page load rather than per navigation. |
| No memoisation added anywhere | Deliberate. The idle-growth measurement found no render loops, so there is no profiling evidence to justify `React.memo`/`useMemo`, and adding them blind risks stale data. |
| Frontend screens not measured | Admin panels, restaurant and delivery partner panels, hotel/tours operator panels. Only consumer screens were measured this pass. |
| `/food/orders` payload (audit P6) | 40.5kb for 6 orders. Untouched — changing it alters a response shape with multiple known consumers. |

## Reproducing

```bash
node Backend/scripts/qa/run.js                       # regression suite
node Backend/scripts/perf/measure.js --samples 9     # latency
node Backend/scripts/perf/scan-waterfalls.js --min 5 # sequential-query scan
```
