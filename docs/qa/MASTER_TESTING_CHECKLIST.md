# Master testing checklist

Generated from `scripts/qa/last-run.json` on 2026-09-17. Do not edit by hand —
run `node scripts/qa/run.js && node scripts/qa/report.js` instead.

**120 cases — 119 passed, 0 failed, 1 blocked.**

| ID | Suite | Case | Expected | Result | Status |
| --- | --- | --- | --- | --- | --- |
| AUTH-101 | auth | no token rejected — GET /food/user/profile | 401/403 | — | ✅ PASS |
| AUTH-102 | auth | no token rejected — GET /hotel/bookings/my | 401/403 | — | ✅ PASS |
| AUTH-103 | auth | no token rejected — GET /tours/bookings/my | 401/403 | — | ✅ PASS |
| AUTH-104 | auth | no token rejected — GET /festivals/bookings/my | 401/403 | — | ✅ PASS |
| AUTH-105 | auth | no token rejected — GET /support | 401/403 | — | ✅ PASS |
| AUTH-106 | auth | no token rejected — GET /admin/support | 401/403 | — | ✅ PASS |
| AUTH-107 | auth | no token rejected — GET /admin/reports/overview | 401/403 | — | ✅ PASS |
| AUTH-108 | auth | no token rejected — GET /admin/administrators | 401/403 | — | ✅ PASS |
| AUTH-109 | auth | no token rejected — GET /taxi/rides | 401/403 | — | ✅ PASS |
| AUTH-110 | auth | no token rejected — GET /food/orders | 401/403 | — | ✅ PASS |
| AUTH-111 | auth | no token rejected — GET /festivals/admin | 401/403 | — | ✅ PASS |
| AUTH-112 | auth | no token rejected — GET /tours/admin/dashboard | 401/403 | — | ✅ PASS |
| AUTH-113 | auth | no token rejected — GET /hotel/admin/dashboard-stats | 401/403 | — | ✅ PASS |
| AUTH-120 | auth | malformed token rejected | 401/403 | — | ✅ PASS |
| AUTH-121 | auth | empty bearer rejected | 401/403 | — | ✅ PASS |
| AUTH-122 | auth | literal "null" rejected | 401/403 | — | ✅ PASS |
| AUTH-130 | auth | JWT signed with an unknown key rejected | 401/403 | — | ✅ PASS |
| AUTH-131 | auth | expired token rejected | 401/403 | — | ✅ PASS |
| AUTH-140 | auth | role rewritten to ADMIN rejected | 401/403 | — | ✅ PASS |
| AUTH-141 | auth | user id rewritten rejected | 401/403 | — | ✅ PASS |
| AUTH-150 | auth | consumer token refused on /admin/administrators | 401/403 | — | ✅ PASS |
| AUTH-151 | auth | consumer token refused on /admin/support | 401/403 | — | ✅ PASS |
| AUTH-152 | auth | consumer token refused on /admin/reports/overview | 401/403 | — | ✅ PASS |
| AUTH-153 | auth | consumer token refused on /festivals/admin | 401/403 | — | ✅ PASS |
| AUTH-154 | auth | consumer token refused on /tours/admin/dashboard | 401/403 | — | ✅ PASS |
| AUTH-155 | auth | consumer token refused on /hotel/admin/dashboard-stats | 401/403 | — | ✅ PASS |
| AUTH-156 | auth | consumer token refused on /food/admin/dashboard-stats | 401/403 | — | ✅ PASS |
| AUTH-157 | auth | consumer token refused on /taxi/admin/dashboard/data | 401/403 | — | ✅ PASS |
| AUTHZ-101 | authz | another user's support ticket refused | 401/403/404 | — | ✅ PASS |
| AUTHZ-102 | authz | cannot reply on another user's ticket | 401/403/404 | — | ✅ PASS |
| AUTHZ-103 | authz | owner can still read their own ticket | 200 | — | ✅ PASS |
| AUTHZ-110 | authz | cannot open a payment order on another user's basket | 401/403/404 | — | ✅ PASS |
| AUTHZ-111 | authz | cannot release another user's held seats | released 0 or refused | — | ✅ PASS |
| AUTHZ-112 | authz | cannot cancel another user's pass | 401/403/404 | — | ✅ PASS |
| AUTHZ-113 | authz | another user's passes absent from my list | no trace of the other user's booking | — | ✅ PASS |
| AUTHZ-120 | authz | cannot settle another user's tour booking | refused | — | ✅ PASS |
| AUTHZ-121 | authz | cannot open a payment order on another user's tour | 401/403/404 | — | ✅ PASS |
| AUTHZ-130 | authz | another user's stay refused | 401/403/404 | — | ✅ PASS |
| AUTHZ-131 | authz | another user's invoice refused | 401/403/404 | — | ✅ PASS |
| AUTHZ-132 | authz | cannot cancel another user's stay | 401/403/404 | — | ✅ PASS |
| AUTHZ-133 | authz | the guest can still cancel their own stay | 200 | — | ✅ PASS |
| AUTHZ-140 | authz | consumer refused on tours operator bookings | 401/403/404 | — | ✅ PASS |
| AUTHZ-141 | authz | consumer refused on hotel partner bookings | 401/403/404 | — | ✅ PASS |
| AUTHZ-142 | authz | consumer refused on tours operator wallet | 401/403/404 | — | ✅ PASS |
| AUTHZ-143 | authz | consumer refused on hotel partner wallet | 401/403/404 | — | ✅ PASS |
| AUTHZ-150 | authz | consumer cannot create a festival | 401/403/404 | — | ✅ PASS |
| AUTHZ-151 | authz | consumer cannot create a tour offer | 401/403/404 | — | ✅ PASS |
| AUTHZ-152 | authz | consumer cannot create an administrator | 401/403/404 | — | ✅ PASS |
| AUTHZ-153 | authz | consumer cannot update a support ticket | 401/403/404 | — | ✅ PASS |
| AUTHZ-160 | authz | platform superadmin can list administrators | 200 | — | ✅ PASS |
| INJ-101 | injection | OTP request refuses phone as { $ne: null } | no OTP issued | — | ✅ PASS |
| INJ-102 | injection | OTP request refuses phone as { $gt: "" } | no OTP issued | — | ✅ PASS |
| INJ-103 | injection | OTP request refuses audience as { $ne: null } | no OTP issued | — | ✅ PASS |
| INJ-104 | injection | admin login refuses operator objects | no session | — | ✅ PASS |
| INJ-110 | injection | festival search survives an operator in the query | not 500 | — | ✅ PASS |
| INJ-111 | injection | tour package filter survives an operator in the query | not 500 | — | ✅ PASS |
| INJ-112 | injection | property filter survives an operator in the query | not 500 | — | ✅ PASS |
| INJ-120 | injection | support ticket is served as JSON, not HTML | application/json | — | ✅ PASS |
| INJ-121 | injection | script payload round-trips as data (escaped downstream) | stored verbatim for the client to escape | — | ✅ PASS |
| INJ-130 | injection | profile update cannot set role | role stays USER | — | ✅ PASS |
| INJ-140 | injection | server prices the pass, not the client | ₹250 | — | ✅ PASS |
| INJ-141 | injection | client cannot mark its own booking paid | pending | — | ✅ PASS |
| INJ-142 | injection | client cannot forge a pass code | no pass code before payment | — | ✅ PASS |
| INJ-150 | injection | path traversal blocked (/../../../../etc/passwd) | no file contents | — | ✅ PASS |
| INJ-151 | injection | path traversal blocked (/uploads/../../../../etc/passwd) | no file contents | — | ✅ PASS |
| INJ-160 | injection | oversized body is refused cleanly, not as a 500 | 400/413 | — | ✅ PASS |
| INJ-161 | injection | server still alive after the oversized body | 200 | — | ✅ PASS |
| VAL-100 | validation | empty basket refused | 4xx | — | ✅ PASS |
| VAL-101 | validation | missing festivalId refused | 4xx | — | ✅ PASS |
| VAL-102 | validation | zero tickets refused | 4xx | — | ✅ PASS |
| VAL-103 | validation | negative tickets refused | 4xx | — | ✅ PASS |
| VAL-104 | validation | non-numeric ticket count refused | 4xx | — | ✅ PASS |
| VAL-105 | validation | unknown category id refused | 4xx | — | ✅ PASS |
| VAL-106 | validation | malformed object id refused | 4xx | — | ✅ PASS |
| VAL-107 | validation | duplicate category refused | 4xx | — | ✅ PASS |
| VAL-108 | validation | absurd ticket count refused | 4xx | — | ✅ PASS |
| VAL-120 | validation | check-out before check-in refused | 4xx | — | ✅ PASS |
| VAL-121 | validation | same-day check-in and check-out refused | 4xx | — | ✅ PASS |
| VAL-122 | validation | check-in in the past refused | 4xx | — | ✅ PASS |
| VAL-123 | validation | unparseable dates refused | 4xx | — | ✅ PASS |
| VAL-130 | validation | empty phone refused | 4xx | — | ✅ PASS |
| VAL-131 | validation | short phone refused | 4xx | — | ✅ PASS |
| VAL-132 | validation | alphabetic phone refused | 4xx | — | ✅ PASS |
| VAL-133 | validation | absurdly long phone refused | 4xx | — | ✅ PASS |
| VAL-140 | validation | offer with no code refused | 4xx | — | ✅ PASS |
| VAL-141 | validation | offer with no title refused | 4xx | — | ✅ PASS |
| VAL-142 | validation | zero discount refused | 4xx | — | ✅ PASS |
| VAL-143 | validation | negative discount refused | 4xx | — | ✅ PASS |
| VAL-144 | validation | percentage over 100 refused | 4xx | — | ✅ PASS |
| VAL-145 | validation | end before start refused | 4xx | — | ✅ PASS |
| VAL-150 | validation | festival with no name refused | 4xx | — | ✅ PASS |
| VAL-151 | validation | festival with no categories refused | 4xx | — | ✅ PASS |
| VAL-152 | validation | category with no seats refused | 4xx | — | ✅ PASS |
| VAL-153 | validation | booking window closing before it opens refused | 4xx | — | ✅ PASS |
| VAL-160 | validation | negative page handled | 200 with sane defaults | — | ✅ PASS |
| VAL-161 | validation | absurd limit capped | 200 with sane defaults | — | ✅ PASS |
| VAL-162 | validation | non-numeric page handled | 200 with sane defaults | — | ✅ PASS |
| BIZ-100 | business | concurrent baskets take exactly what they claim | 5 seats taken | — | ✅ PASS |
| BIZ-101 | business | releasing a basket returns every seat | 2998 left | — | ✅ PASS |
| BIZ-102 | business | per-order cap enforced | 4xx | — | ✅ PASS |
| BIZ-110 | business | closed categories absent from the public payload | hidden | — | ✅ PASS |
| BIZ-111 | business | a closed category cannot be bought | 4xx | — | ✅ PASS |
| BIZ-120 | business | a paid pass is refused on a second gate scan | — | needs a completed payment; covered manually against a signed Razorpay callback | ⏸ BLOCKED |
| BIZ-130 | business | a coupon below its minimum spend is refused | no discount, with a reason | — | ✅ PASS |
| BIZ-131 | business | an unknown coupon still prices the trip | 200 with no discount | — | ✅ PASS |
| BIZ-140 | business | the booking charges what the quote showed | total 4620, advance 1155 | — | ✅ PASS |
| BIZ-141 | business | the settlement identity holds | total = taxes + commission + payout | — | ✅ PASS |
| BIZ-142 | business | a new booking is unpaid until it is paid | pending, nothing paid | — | ✅ PASS |
| UPL-100 | uploads | upload refuses an anonymous caller | 401/403 | — | ✅ PASS |
| UPL-101 | uploads | delete refuses an anonymous caller | 401/403 | — | ✅ PASS |
| UPL-110 | uploads | a signed-in caller can upload an image | 200 with a url | — | ✅ PASS |
| UPL-111 | uploads | the stored file is served | 200 | — | ✅ PASS |
| UPL-112 | uploads | the image was converted to WebP | .webp | — | ✅ PASS |
| UPL-120 | uploads | a script renamed .png is refused | 4xx | — | ✅ PASS |
| UPL-121 | uploads | an SVG does not survive as SVG | refused or rasterised to webp | — | ✅ PASS |
| UPL-122 | uploads | an empty file is refused | 4xx | — | ✅ PASS |
| UPL-123 | uploads | a request with no file is refused | 4xx | — | ✅ PASS |
| UPL-130 | uploads | a traversing folder name cannot escape the storage root | refused or flattened | — | ✅ PASS |
| UPL-140 | uploads | an oversized upload is refused as 413 | 413 | — | ✅ PASS |
| UPL-141 | uploads | server still alive after the oversized upload | 200 | — | ✅ PASS |

## By suite

- **auth** — 28 cases: 28 passed, 0 failed, 0 blocked
- **authz** — 22 cases: 22 passed, 0 failed, 0 blocked
- **injection** — 17 cases: 17 passed, 0 failed, 0 blocked
- **validation** — 30 cases: 30 passed, 0 failed, 0 blocked
- **business** — 11 cases: 10 passed, 0 failed, 1 blocked
- **uploads** — 12 cases: 12 passed, 0 failed, 0 blocked
