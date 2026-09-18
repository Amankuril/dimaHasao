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

The `/hotel/admin/users` row is the point of this section. The first run of that
comparison showed **nine fields missing** from the response, caused by a
`.lean()` added in OPT-003. Status code, row count and ordering were all
unchanged — only a field-level comparison surfaced it. It is fixed and
re-verified.

Because these six responses are identical, the screens that consume them cannot
behave differently. That is a stronger statement than a screenshot, and it is
why no UI walkthrough of the hotel admin dashboard was performed for these
changes.

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
| Behaviour at real data volume | Untested. The dev database holds 6 food orders and 16 hotel bookings. Every measurement here is a floor. |
| Production latency | Unmeasured. No access from this environment. |
| N+1 sites (audit P10) | 21 candidates identified, none reviewed or changed. |
| `/food/orders` payload (audit P6) | 40.5kb for 6 orders. Untouched — changing it alters a response shape with multiple known consumers. |

## Reproducing

```bash
node Backend/scripts/qa/run.js                       # regression suite
node Backend/scripts/perf/measure.js --samples 9     # latency
node Backend/scripts/perf/scan-waterfalls.js --min 5 # sequential-query scan
```
