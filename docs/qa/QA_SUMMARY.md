# QA summary

Last run 2026-09-17, against a development database.

| | |
| --- | --- |
| Cases | 125 |
| Passed | 124 |
| Failed | 0 |
| Blocked | 1 |

## Coverage by suite

- **auth** — 28 cases (28 passing)
- **authz** — 22 cases (22 passing)
- **injection** — 17 cases (17 passing)
- **validation** — 30 cases (30 passing)
- **business** — 13 cases (12 passing)
- **uploads** — 15 cases (15 passing)

## Blocked

- `BIZ-120` a paid pass is refused on a second gate scan — needs a completed payment; covered manually against a signed Razorpay callback

## Outstanding failures

- none in the last run

## How to run

```bash
cd Backend
node scripts/qa/run.js               # every suite
node scripts/qa/run.js auth authz    # named suites
node scripts/qa/report.js            # regenerate these documents
```

The suite needs the API running and `USE_DEFAULT_OTP=true`, which is how it
provisions its two consumer identities through the real login flow. It creates
bookings and uploads as it goes and releases or deletes them at the end.
