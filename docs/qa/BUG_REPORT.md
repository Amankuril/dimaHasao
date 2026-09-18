# Bug report

Every entry here was reproduced before it was changed and is covered by a case
in `Backend/scripts/qa/`. Severity reflects demonstrated impact, not the worst
imaginable reading.

Bugs found earlier in the same review but fixed before the suite existed are
listed at the end with their commits.

---

## BUG-001 — Anyone could cancel anyone's hotel booking

| | |
| --- | --- |
| Module | Hotel |
| Severity | **Critical** |
| Status | Fixed — `33e5042` |
| Regression test | `AUTHZ-132`, `AUTHZ-133` |

**Description.** `POST /v1/hotel/bookings/:id/cancel` looked up the booking by
id, compared its owner to the caller, and then did nothing with the answer —
the rejection was commented out:

```js
if (booking.userId.toString() !== req.user._id.toString()) {
  // return res.status(403).json({ message: 'Not authorized' });
}
```

**Reproduction.** Sign in as user A, book a stay, note the id. Sign in as user
B and `POST /v1/hotel/bookings/<id>/cancel`.

**Expected.** Refused. **Actual.** `200` — the stay was cancelled, the room
released, commission and tax reversed between the partner and admin wallets,
and the guest sent a cancellation notice.

**Root cause.** The guard was written and then disabled, with a comment saying
partner/admin handling was still to be added.

**Fix.** The guest, the property's partner and admins may cancel; everyone else
gets a 404, since confirming the id exists tells an outsider there is a booking
to attack. Verified the guest can still cancel their own.

---

## BUG-002 — Upload and delete endpoints took no credentials

| | |
| --- | --- |
| Module | Uploads (platform-wide) |
| Severity | **Critical** |
| Status | Fixed — `b9cef9d` |
| Regression test | `UPL-100`, `UPL-101`, `UPL-110` |

**Description.** `POST /v1/uploads/image` carried the comment "auth may be
added at caller" and never was. `DELETE /v1/uploads` took a URL in the body and
removed that file, with no authentication at all.

**Reproduction.** With no token: `curl -X POST .../v1/uploads/image -F file=@x.png`
returns a stored URL. `curl -X DELETE .../v1/uploads -d '{"url":"<any url>"}'`
returns `{"deleted":true}` and the file 404s afterwards.

**Expected.** Both refused. **Actual.** Both succeeded.

**Impact.** Anonymous writes into platform storage, and anonymous deletion of
any uploaded file — restaurant photos, property images, festival banners, KYC
documents — by anyone who knows or can guess a URL.

**Fix.** Both routes now require an authenticated principal. The `/internal`
pair keeps its shared-secret guard, so the auth middleware is attached per
route rather than to the router.

**Residual risk.** Deletion is not ownership-scoped: uploads do not record who
made them, so an authenticated user who knows another's URL can still delete
it. Recorded in `SECURITY_AUDIT.md` as an open item.

---

## BUG-003 — No file size limit on uploads

| | |
| --- | --- |
| Module | Uploads |
| Severity | **High** |
| Status | Fixed — `b9cef9d` |
| Regression test | `UPL-140`, `UPL-141` |

**Description.** `multer({ storage })` was configured with no `limits`. Files
are buffered in memory, so an upload of any size was an upload of any size into
RAM. Express's 2 MB JSON cap does not apply — multipart bypasses it.

**Reproduction.** A 12 MB file uploaded in 0.09s before the fix, unauthenticated.

**Fix.** 10 MB and one file per request, matching what the frontend upload
services already refuse above.

---

## BUG-004 — The hotel partner wallet was open to every signed-in user

| | |
| --- | --- |
| Module | Hotel |
| Severity | **High** |
| Status | Fixed — `33e5042` |
| Regression test | `AUTHZ-143` |

**Description.** `walletRoutes` carried `protect` with no role guard, so any
consumer could reach the whole router: open a wallet, save bank details against
it — which the controller marks `verified: true` without verifying anything —
open a Razorpay order, and request a withdrawal that only the ₹500 minimum
stood in the way of.

**Reproduction.** With a plain consumer token, `PUT /v1/hotel/wallet/bank-details`
returned `{"verified": true}`; `POST /v1/hotel/wallet/add-money` returned a live
Razorpay order.

**Fix.** Restricted to partners and admins. Tours' wallet was already guarded;
a sweep found no other router in this position.

**Note.** The self-verifying bank details (`verified: true // Auto-verify for
test flow`) are a separate control gap and remain open.

---

## BUG-005 — Search boxes built unescaped regular expressions

| | |
| --- | --- |
| Module | Tours, Festivals, Hotel, Support |
| Severity | **Medium** |
| Status | Fixed — `5a5a2da` |
| Regression test | `INJ-110`–`INJ-112` |

**Description.** Eight list endpoints ran `new RegExp(String(search).trim(), 'i')`
on user input. Punctuation a person naturally types changes what matches, and a
crafted term such as `(a+)+$` is catastrophic backtracking — a CPU pinned from a
public query string.

**Fix.** One `utils/searchRegex.js` escapes the term and caps its length.
Verified the bomb term returns in 0.07s and that search still finds things.

---

## BUG-006 — A malformed id crashed festival checkout

| | |
| --- | --- |
| Module | Festivals |
| Severity | **Medium** |
| Status | Fixed — `5a5a2da` |
| Regression test | `VAL-106` |

`festivalId: "not-an-id"` reached Mongo and threw a CastError, surfacing as a
500 rather than "not found". Ids are now checked for shape first, on the
festival and on every basket line.

---

## BUG-007 — A hotel stay could start in the past

| | |
| --- | --- |
| Module | Hotel |
| Severity | **Medium** |
| Status | Fixed — `5a5a2da` |
| Regression test | `VAL-122` |

Only the night count was validated, so yesterday-to-tomorrow priced and booked —
holding inventory for a night already gone. Compared at day granularity so a
booking made later the same morning still works.

---

## BUG-008 — Any string was accepted as a phone number

| | |
| --- | --- |
| Module | Auth (platform-wide) |
| Severity | **Medium** |
| Status | Fixed — `5a5a2da` |
| Regression test | `VAL-133` |

`normalizeOtpPhone` took the last ten digits of whatever arrived, so a
200-character string, a number typed twice, or a stray card number all
normalised to *something* and an OTP went to whichever ten digits fell at the
end. Now only the shapes people actually type are accepted; anything else
returns `''`, which callers already refuse.

---

## Fixed earlier in the same review

| ID | Module | Severity | Description | Commit |
| --- | --- | --- | --- | --- |
| BUG-009 | Hotel | **Critical** | Every online booking returned 500 — `getRazorpayClient` was called without being imported | `dd596ab` |
| BUG-010 | Hotel | **High** | Every booking then failed validation — `userModel` became `'FoodUser'`, outside the schema enum | `dd596ab` |
| BUG-011 | Reports | **High** | Festivals reported ₹0 — `$literal` is not a `$group` accumulator, so the pipeline was rejected and caught as zeroes | `7875f94` |
| BUG-012 | Hotel | **High** | The admin dashboard returned 500 — `MissingSchemaError` for model `User` after the user-model shim | `9fbbdc8` |
| BUG-013 | Festivals | **High** | A basket spanning categories opened one payment window per category | `d0846c0` |
| BUG-014 | Festivals | **Medium** | Closed pass categories were still offered for sale and refused at checkout | `d0846c0` |
| BUG-015 | Festivals | **Medium** | Abandoning the payment window held seats indefinitely | `d0846c0` |
| BUG-016 | Festivals | **Medium** | A booking window could be set but never cleared | `ea88058` |
| BUG-017 | Admin | **Medium** | `/admin/login` while signed in landed on a dead route, with a location modal over it | `a1695cb` |
| BUG-018 | Admin | **Medium** | Login sent every admin to Food, including ones with no access to it | `a1695cb` |

---

## BUG-019 — Hotel partners never received their booking-alert SMS

| | |
| --- | --- |
| Module | Hotel |
| Severity | **Medium** |
| Status | Fixed |
| Regression test | covered indirectly; the error no longer appears in the log |

`bookingController` called `smsService.sendSMS(...)` without importing it, so
every partner booking alert died as `ReferenceError: smsService is not defined`
inside the surrounding catch and was logged rather than surfaced. The same
missing-import class as BUG-009. `paymentController` imported it correctly; the
booking path did not.

---

## BUG-020 — A rejected upload was reported as a server error

| | |
| --- | --- |
| Module | Platform (error handling) |
| Severity | **Low** |
| Status | Fixed |
| Regression test | `UPL-140` |

Multer reports a rejected upload by throwing, with no `statusCode`, so an
oversized file came back as `500 Server Error` — which reads as the server
breaking rather than the request being refused. Multer's error codes are now
mapped to client statuses; an oversized upload answers `413 That file is too
large`.

---

## BUG-021 — A long support message was reported as a server error

| | |
| --- | --- |
| Module | Support |
| Severity | **Low** |
| Status | Fixed |
| Regression test | `INJ-160` |

The opening description also becomes the thread's first message, which the
schema caps at 4000 characters. The controller did not check, so an over-long
one reached mongoose and came back as `500 Could not raise this ticket` — to
the person typing, the server appearing broken rather than their message being
too long. Now a `400` naming the limit, on both the opening description and
replies from either side.

---

## Known open issues

| Issue | Module | Severity | Note |
| --- | --- | --- | --- |
| ~~Ride fares are dictated by the client~~ | Taxi | ~~Critical~~ | **Fixed** — `fareService` prices from the `SetPrice` tariff, `POST /v1/taxi/rides/fare-estimate` quotes it, and `createRide` refuses a fare that does not match. Inactive until a tariff exists; `scripts/seed-taxi-tariffs.js` creates them and `TAXI_ENFORCE_FARE=true` refuses unpriced vehicles outright. |
| ~~Upload deletion is not ownership-scoped~~ | Uploads | ~~High~~ | **Fixed** — assets now record their uploader; deletion is the uploader or an admin. |
| ~~Bank details self-verify~~ | Hotel | ~~Medium~~ | **Fixed** — details start unverified and withdrawals wait for an admin to confirm them. |
| `USE_DEFAULT_OTP=true` in production | Platform | **Critical** | OTP `1234` signs in as anyone. Left in place at the owner's explicit direction. |
| ~~No admin cancellation for bookings~~ | Hotel, Tours, Festivals | ~~Medium~~ | **Fixed** — admin cancel routes for tours and festivals; hotel's already admits admins. |
| ~~Tours has no consumer cancellation~~ | Tours | ~~Medium~~ | **Fixed** — `POST /v1/tours/bookings/:id/cancel`, scoped to the traveller's own booking. |
| ~~`legacyBackendShim.js`~~ | Taxi | ~~Low~~ | **Fixed** — deleted. |
| ~~Leftover debug log~~ | Taxi | ~~Low~~ | **Fixed** — removed. |
| Gateway refunds are not issued | Hotel, Tours, Festivals | Medium | Cancelling marks `refunded` and reverses the vendor wallet, but does not return the customer's money through Razorpay. That is a deliberate separate step. |

---

# Findings from the E2E pass, 2026-09-18

Run after the Google Maps key was added. Everything below was executed against
the running stack, not inferred.

## FIXED — every geocode endpoint threw, and the missing key hid it

**Severity: high. Fixed in commit `5d34a46`.**

`sanitize` was called at three places in
`Backend/src/modules/food/landing/controllers/geocodePublic.controller.js` and
defined at none of them. Reverse geocode, place lookup and nearby places all
threw `sanitize is not defined` as soon as they got past the key check.

It had never been reported because the server had no Maps key: every request
returned "not configured" and stopped before reaching the broken line. **Adding
the key is what exposed it** — the environment gap was masking a code gap.

Verified after the fix: reverse geocode returns Haflong addresses, nearby places
returns results, place lookup resolves a place_id, and the whole address flow
works in the UI.

## BLOCKER — the only delivery zone is "indore"

**Severity: launch blocker. Configuration, not code. Not fixed — this is a
business decision.**

`food_zones` holds exactly **one** document: `indore`, a leftover from the
original Hello Parth app. No zone covers Haflong or anywhere else in Dima Hasao.

Reproduce: set the delivery location to any Haflong address at `/food/user`.
The app shows *"We'll be there soon — online ordering isn't available at your
location yet."* **Food ordering is impossible in the district the platform
serves.**

Zones are drawn at `/admin/food/zone-setup`.

## BLOCKER — taxi has no vehicle types and no zones

**Severity: launch blocker. Configuration, not code. Not fixed.**

Straight from the database:

| Collection | Documents |
|---|---:|
| vehicle types (consumer-visible) | **0** |
| `taxizones` | **0** |
| `taxirentalvehicletypes` | 0 |
| `taxirentalpackagetypes` | 0 |
| `taxisetprices` | 1, **not active** |

`POST /taxi/rides/fare-estimate` refuses with `vehicleTypeId is required`, and
there is no vehicle type to supply. **No ride can be quoted or booked at all.**

Set up at `/taxi/admin/pricing/vehicle-type/create`, then zones, then tariffs.
The single inactive `taxisetprices` row is the "bike lite" tariff created during
development with invented numbers — replace it rather than activate it.

## PASSED — food ordering works end to end on cash on delivery

Walked as a real customer at `/food/user`, signed in as `8962843670`:

| Step | Result |
|---|---|
| Search "Haflong" in the address picker | Real place suggestions returned |
| Pin a location, add an address | Reverse-geocoded to a real address, fields pre-filled |
| Browse in the Indore zone | "1 RESTAURANTS DELIVERING TO YOU", distance 3.7 km |
| Open restaurant, view menu | Menu renders; veg marker shows |
| Add to cart | Cart updates |
| Bill | Item ₹100 + **Delivery ₹60 (Distance 2.7 km)** = ₹160 |
| Place order (COD) | **Order `FOD-4003773` placed** |
| Customer history | 6 orders → 7 |
| Admin order list | Appears immediately |

**The amount matches what was stored**, which is the thing worth checking here —
a cart/charge mismatch was a real bug once:

```json
pricing: {"subtotal":100,"deliveryFee":60,"total":160,"restaurantCommission":18.1}
payment: {"method":"cash","status":"cod_pending","amountDue":160}
```

Also confirmed in passing: **Veg Mode set from `/app/profile` reached the Food
module** — the shared localStorage keys work as intended.

## Still untested

Restaurant accepting the order · delivery partner assignment and delivery ·
hotel booking · tours advance payment · festival multi-category checkout ·
anything behind a **card payment** (I do not enter card details, and I will not
forge a gateway signature to fake one — cash, pay-at-hotel, pay-later and wallet
paths remain testable).
