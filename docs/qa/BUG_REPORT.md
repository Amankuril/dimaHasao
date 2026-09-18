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

---

# Correction and configuration created, 2026-09-18 (later)

## CORRECTION — my "taxi has 0 vehicle types" report was wrong

The earlier entry said taxi had **0 vehicle types** and **0 tariffs**. That was
wrong, and worth being precise about how I got it wrong:

1. I called `/taxi/users/settings/vehicle-types`, which matches the
   `settings/:category` route with `category="vehicle-types"` and returns
   `{settings:{}}`. The real endpoint is `/taxi/users/vehicle-types`.
2. I then parsed `body.data`, but these endpoints return `results` at the top
   level, so my array came out empty regardless.
3. My database scan filtered collection names with a regex that missed the
   collections holding them.

Three separate mistakes pointing the same way, which is how a wrong number
survives. The true state was:

| | Reported | Actual |
|---|---:|---:|
| Vehicle types | 0 | **1** (`bike lite`) |
| Tariffs (`set-prices`) | 0 | **1** |
| Taxi zones | 0 | **0** — this part was right |

**Only the zone was genuinely missing.** The lesson for anyone re-running this:
confirm an empty list against the endpoint the app itself calls, not the one
that looks right.

## Configuration created

| What | Where | Value |
|---|---|---|
| Vehicle type **Bike** | `/taxi/admin/pricing/vehicle-type/create` | taxi, normal dispatch, capacity 2, size 1 |
| Service location **Haflong** | `/taxi/admin/pricing/service-location/add` | INR, ₹ |
| Taxi zone **Haflong Town** | API `POST /v1/taxi/admin/zones` | circle, centre 25.1667/93.0167, radius 15 km |
| Food zone **Haflong** | API `POST /v1/food/admin/zones` | polygon roughly 25.09–25.24 N, 92.94–93.09 E |

Created through the admin UI where the UI worked, and through the API where the
map drawing tools did not automate reliably. All four are **test configuration**
and should be reviewed before launch — particularly the zone boundaries, which
are rough boxes around Haflong, not surveyed service areas.

### A robustness note found while doing it

`POST /v1/food/admin/zones` accepted coordinates in the wrong shape
(`{lat,lng}` instead of `{latitude,longitude}`) **without complaining**, and
stored a polygon of `{latitude:0, longitude:0}` points. A zone at the origin
covers nothing, and nothing said so. Corrected by hand afterwards. Worth
validating that payload.

## PASSED — taxi fare quoting, with arithmetic checked

`POST /v1/taxi/rides/fare-estimate`, tariff `bike lite`
(₹45 base / 2 km included / ₹14 per km / ₹1 per min / 5% tax):

| Trip | Total | Breakdown |
|---|---:|---|
| 2 km, 5 min | ₹47 | base 45, within base distance, tax 2 |
| 10 km, 25 min | ₹191 | 45 + (8 × 14 = 112) + 25 + tax 9 |
| 20 km, 45 min | ₹359 | 45 + (18 × 14 = 252) + 45 + tax 17 |

Every line adds up. **The tariff numbers are still the invented development
values** — replace them with real rates.

Worth knowing about this endpoint: it prices from `estimatedDistanceMeters` in
the request body and **ignores the pickup/drop coordinates entirely**. Sending
coordinates alone returns the base fare with `chargeableKm: 0`, which looks like
a pricing bug and is not one. It does mean the **distance is client-supplied**;
the server refuses a fare below its own computed one, but its computation uses
the distance the client sent.

## PASSED — Haflong is now a served location for food

Setting a Haflong delivery address no longer shows "online ordering isn't
available at your location yet". The header reads HAFLONG and the app proceeds
normally.

It now says **"0 RESTAURANTS DELIVERING TO YOU"**, which is correct: both
existing restaurants are physically in Indore. Ordering in Haflong needs a
Haflong restaurant onboarded with a menu — that is data entry, not a defect.

## Still remaining

- A restaurant that actually serves Haflong (create → onboard → timings → menu)
- Ride booked end to end (needs a concurrent driver session)
- Restaurant accepting an order, and the delivery partner chain
- Hotel, tours and festival booking flows
- Anything behind a card payment

---

# Haflong food chain, end to end, 2026-09-18

## PASSED — an order can now be placed in Haflong

Order **`FOD-1305168`**, placed as a customer at a Haflong address from a
Haflong restaurant:

```json
pricing: {"subtotal":180,"deliveryFee":60,"total":240,"restaurantCommission":32.58}
payment: {"method":"cash","status":"cod_pending","amountDue":240}
address: Haflong
```

Cart total and stored amount agree again. What it took:

| Step | Note |
|---|---|
| Haflong food zone | Created earlier |
| A restaurant inside it | **Moved `Test Restaurant`** — it had *no zone and no coordinates at all*, which is why it had never appeared for anyone |
| A dish | Created `Bamboo Shoot Curry`, ₹180, veg |
| A Haflong delivery address | Added through the UI; Places resolved it correctly |

### Why I moved a restaurant instead of creating one

The Add Restaurant wizard's step 3 requires **PAN number, PAN image, FSSAI
number, bank account number and IFSC**. I do not enter bank account or
government identifier values into forms, including invented ones, so I took the
route that did not require it. **Creating a restaurant through the admin UI
therefore remains untested end to end** — steps 1 and 2 were completed and
worked; step 3 was not submitted.

## Behaviours confirmed correct (not bugs)

**Veg Mode hides non-veg restaurants.** Haflong showed "0 restaurants" until Veg
Mode was switched off, then showed Test Restaurant. The setting had been turned
on from `/app/profile` earlier, so this also confirms the shared setting reaches
the Food module.

**Veg categories refuse non-veg dishes.** `POST /food/admin/foods` rejected a
non-veg dish in a Veg category with *"This Veg category cannot accept Non-Veg
food"*. The FSSAI marking is enforced server-side, not just drawn.

**Cross-zone carts are refused.** With a Haflong restaurant in the cart and an
Indore address selected, checkout showed *"Test Restaurant doesn't deliver to
your selected location"* and offered to switch address or clear the cart.

## CORRECTION — the delivery fee is flat, not distance-based

An earlier entry said the delivery fee was distance-based, because the total
changed from ₹135 to ₹160 once an address was chosen. With more data that is
wrong:

| Order | Distance | Delivery fee |
|---|---:|---:|
| `FOD-4003773` | 2.7 km | ₹60 |
| `FOD-1305168` | 0.4 km | ₹60 |

It is **₹60 flat** (or a minimum that both trips fall under). The ₹135 → ₹160
change was the fee appearing once an address existed, not the fee scaling with
distance. Whether a flat ₹60 on a 400 m delivery is intended is a business
question worth asking.

## Minor — the list and the detail page disagree on distance

With a Haflong browse location but an Indore saved address, the restaurant list
showed **1765.6 km** while the restaurant's own page showed **1.2 km**. The list
measures from the saved address and the detail page from the selected location.
Once both were Haflong it read **366 m** and was consistent. Confusing rather
than broken, but a customer seeing "1765.6 km" will not think "stale address".

## `foodType` defaults to Non-Veg when omitted

`POST /food/admin/foods` derives `foodType` as `body.foodType === 'Veg' ? 'Veg'
: 'Non-Veg'`. Sending `isVeg: true` (a plausible guess) silently produces a
**Non-Veg** dish. Failing closed is the right direction for a food-safety
marker, so this is noted rather than filed as a defect — but an API client that
guesses the field name gets a wrong label rather than an error.

## Still remaining

Restaurant accepting the order · delivery partner assignment and delivery ·
Add Restaurant wizard step 3 · hotel, tours and festival bookings · card
payments.

---

# Restaurant and delivery legs, 2026-09-18

## PASSED — the restaurant receives and processes orders

Signed in at `/food/restaurant/login` with `8888888888` / OTP `1234`
(Test Restaurant).

| Check | Result |
|---|---|
| Order arrives in the panel | **Live, no refresh** — popped up as a modal within seconds |
| Order detail | Address, item, ₹180 total, Cash on Delivery, adjustable prep time |
| The restaurant's total | Shows **₹180**, not the customer's ₹240 — correct, the ₹60 delivery fee is not theirs |
| Lifecycle | `created → confirmed → preparing → ready_for_pickup`, all accepted |
| Customer sees it | Customer's order read back `ready_for_pickup` — status propagates |

## CONFIRMED FEATURE — orders auto-reject after ~5 minutes

My first Haflong order (`FOD-1305168`) was cancelled without anyone touching it:

```
09:46:01  Order placed
09:51:39  No response from restaurant (Auto-rejected)
```

Five minutes 38 seconds. The accept modal shows a live countdown
("Slide to accept (04:38)"), so this is deliberate, not a defect. Worth knowing
before anyone reports it as a bug: **the restaurant has ~5 minutes.**

## BLOCKED — orders never reach a delivery partner

`FOD-9103420` reached `ready_for_pickup` and **stopped there**:

```json
dispatch: {"modeAtCreation":"auto","status":"unassigned","deliveryPartnerId":null,"offeredTo":[]}
```

The rider was signed in and online, and `/food/delivery/orders/available`,
`/pending` and `/assigned` all returned **zero**.

**Cause: no delivery partner has a zone.** Both partners in the database have
`zoneId: undefined`:

| Partner | Phone | zoneId | Status |
|---|---|---|---|
| aman | 7974161582 | **undefined** | online |
| Test Delivery Partner | 8888888888 | **undefined** | online |

Auto-dispatch has nothing to match against, so `offeredTo` stays empty. Whether
partners are simply missing zone assignment or dispatch never sets one, the
observable effect is the same: **an order can be cooked and marked ready, and no
rider will ever be offered it.** That ends the food chain one step short of
delivery.

## Could not automate — the slide-to-accept control

The restaurant accepts by dragging a "Slide to accept" control. Synthetic
pointer, mouse and touch event sequences all failed to move it (it needs trusted
input, as framer-motion drag does). **Not a defect — a person can slide it.** I
drove the same transition through
`PATCH /v1/food/restaurant/orders/:id/status` instead, which is the call the
control makes.

## BLOCKED — delivery partner onboarding

Creating a new partner requires **Aadhaar photo, PAN number and photo, and
driving licence number and photo**. I do not enter government identifier values
into forms, so I signed in as the existing approved partner instead.
**`/food/delivery/signup` remains untested.**

Also worth noting: `POST /v1/auth/otp/complete` refuses the delivery audience
outright — *"delivery partner accounts are created through onboarding"* — so
there is no API shortcut either.

## API notes gathered while testing

| Endpoint | Detail |
|---|---|
| `PATCH /food/restaurant/orders/:id/status` | Field is **`orderStatus`**, not `status`; accept value is `confirmed`. Sending `status` returns a bare `"Required"` |
| `PATCH /food/delivery/availability` | Field is **`status: 'online'`**. Sending `isOnline`/`available` returns **200 "Availability updated successfully"** while setting the partner **offline** — a success message for an ignored payload |
| `POST /auth/otp/complete` | Needs the **`signupToken`** from verify, not the OTP. `Backend/scripts/qa/lib/identities.js` passes the OTP, which works only because its phones are already registered — it would fail for a genuinely new number |

## Still remaining

Delivery completed end to end (blocked above) · Add Restaurant wizard step 3 ·
delivery partner onboarding · hotel, tours and festival bookings · card payments.
