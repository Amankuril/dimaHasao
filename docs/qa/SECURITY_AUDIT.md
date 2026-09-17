# Security audit

Scope: the Express API under `Backend/src`, tested live against a development
database. Every finding below was reproduced with a request; nothing here is
inferred from reading code alone.

Payloads were non-destructive. Nothing was exploited beyond the point of
demonstrating the door was open, and no external system was touched.

---

## What was tested, and what held

### Authentication — 28 cases, all passing

| Area | Result |
| --- | --- |
| Protected endpoints with no token (13 routes across all modules) | Refused |
| Malformed, empty and literal-`null` bearer values | Refused |
| A well-formed JWT signed with an unknown key | Refused |
| An expired token | Refused |
| A real token with its payload rewritten to `role: ADMIN` | Refused |
| A real token with its payload rewritten to another user's id | Refused |
| A consumer token on 8 admin surfaces | Refused |

Signature verification and role checks are sound. No bypass was found.

### Authorization — 22 cases, all passing after two fixes

Two holes were found and closed: **BUG-001** (anyone could cancel anyone's
hotel booking) and **BUG-004** (the hotel partner wallet was reachable by every
signed-in user). Both are written up in `BUG_REPORT.md`.

Everything else held: cross-user reads of support tickets, festival passes,
tour bookings, hotel stays and invoices are all refused; vendor surfaces refuse
consumer tokens; admin write surfaces refuse consumer tokens.

### Input security — 17 cases, all passing after one fix

| Area | Result |
| --- | --- |
| NoSQL operator injection in the OTP login (`{ $ne: null }` as a phone) | Refused, no OTP issued |
| NoSQL operator injection in the admin login | Refused, no session issued |
| Operators in public query filters | Handled (one 500 fixed — **BUG-005/006**) |
| Mass assignment of `role`, `adminLevel`, `isAdmin` on a profile update | Ignored |
| A booking trying to set its own price, mark itself paid, or forge a pass code | All ignored; the server prices and issues |
| Path traversal on the static and upload surfaces | Refused |
| A 3 MB request body | Refused, process survived |

`mongo-sanitize` strips operator keys globally, and the pricing paths in
hotel, tours, festivals and food are all server-authoritative.

### File uploads — 12 cases, all passing after three fixes

Three findings, all fixed: **BUG-002** (no authentication on upload or delete),
**BUG-003** (no size limit). What already held:

- A script renamed `.png` is refused — content is validated, not the filename
- An SVG does not survive as SVG; everything is rasterised to WebP
- A traversing folder name is flattened, not followed
- Empty files and fileless requests are refused

### Business logic — 11 cases, 10 passing, 1 blocked

Seat inventory does not oversell under five concurrent baskets; releasing
returns every seat; per-order caps hold; closed categories are neither listed
nor buyable; coupons respect their minimum spend; a quote matches the booking
it produces; the settlement identity holds; a new booking is unpaid until paid.

---

## Open findings

### Critical

**Taxi ride fares are dictated by the client.** `createRide` stores whatever
`fare` arrives, checked only for being a non-negative number. A ₹1 fare was
accepted for a 50 km trip. There is no server-side fare computation anywhere in
the module and no `SetPrice` rows are configured, so this cannot be patched —
it needs a pricing engine and a tariff table. Food, hotel, tours and festivals
all price server-side; taxi is the outlier.

**`USE_DEFAULT_OTP=true` is live in production.** OTP `1234` authenticates as
any phone number. Left in place at the owner's explicit direction, recorded
here because an audit that omitted it would be incomplete.

### High

**Upload deletion is not ownership-scoped.** Authentication is now required,
but assets record no owner, so any signed-in user can delete any asset by URL.
Fixing this properly means putting an owner on the asset.

### Medium

**Bank details self-verify.** `walletController` sets
`verified: true // Auto-verify for test flow, typically false` when a partner
saves account details. Nothing currently gates on the flag, so the impact today
is that the field is meaningless rather than that money moves wrongly.

**Test payment keys in production.** `rzp_test_…` is configured.

**A seven-year JWT expiry.** Sessions effectively never expire, so there is no
natural revocation point for a leaked token.

### Low

**`legacyBackendShim.js`** has no importers anywhere but mints an
`offline-admin-token` for any POST to `/admin/login`. Dead, and worth deleting.

---

## Limitations

These are the boundaries of what was actually exercised, so the passing counts
are not read as more than they are.

- **Roles tested:** anonymous, consumer (two distinct identities), platform
  superadmin. **Not tested as authenticated principals:** restaurant owner,
  delivery partner, taxi driver, fleet owner, hotel partner, tour operator.
  Their surfaces were tested for *refusal* with a consumer token, not for
  correct behaviour when a legitimate holder signs in.
- **Taxi and food** were exercised through their booking and ordering flows,
  not systematically swept the way hotel, tours and festivals were.
- **Rate limiting and brute force** were not tested; doing so meaningfully
  means sustained request volume, which is a load test.
- **The frontend** was not audited for DOM XSS, CSP or client-side storage of
  sensitive values.
- **Dependency and supply-chain** scanning was not performed.
- Everything ran against a **development database**. Production configuration
  differs and is a separate review.
