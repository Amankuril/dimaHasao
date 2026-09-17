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
| Ride fares are dictated by the client | Taxi | **Critical** | `createRide` stores whatever `fare` arrives; ₹1 accepted for a 50 km trip. No server-side fare computation exists and no `SetPrice` rows are configured. Needs a pricing engine, not a patch. |
| ~~Upload deletion is not ownership-scoped~~ | Uploads | ~~High~~ | **Fixed** — assets now record their uploader; deletion is the uploader or an admin. |
| ~~Bank details self-verify~~ | Hotel | ~~Medium~~ | **Fixed** — details start unverified and withdrawals wait for an admin to confirm them. |
| `USE_DEFAULT_OTP=true` in production | Platform | **Critical** | OTP `1234` signs in as anyone. Left in place at the owner's explicit direction. |
| ~~No admin cancellation for bookings~~ | Hotel, Tours, Festivals | ~~Medium~~ | **Fixed** — admin cancel routes for tours and festivals; hotel's already admits admins. |
| ~~Tours has no consumer cancellation~~ | Tours | ~~Medium~~ | **Fixed** — `POST /v1/tours/bookings/:id/cancel`, scoped to the traveller's own booking. |
| ~~`legacyBackendShim.js`~~ | Taxi | ~~Low~~ | **Fixed** — deleted. |
| ~~Leftover debug log~~ | Taxi | ~~Low~~ | **Fixed** — removed. |
| Gateway refunds are not issued | Hotel, Tours, Festivals | Medium | Cancelling marks `refunded` and reverses the vendor wallet, but does not return the customer's money through Razorpay. That is a deliberate separate step. |
