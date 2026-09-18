# End-to-end test plan

Manual walkthroughs, module by module, from onboarding to a completed order.

This is the companion to [MASTER_TESTING_CHECKLIST.md](MASTER_TESTING_CHECKLIST.md),
which is generated from the API suite (`node Backend/scripts/qa/run.js`) and
covers auth, authorization, injection, validation and uploads at the request
level. That suite cannot click a wizard or watch a driver accept a ride. This
document is for what a person has to do by hand.

Every route below was read from the router files and then checked back against
them — 54 of them, one of which was wrong and is now fixed. Where a screen is a
modal rather than a page it says so, because looking for a URL that does not
exist wastes a tester's morning.

---

## 0. Before you start

### Run it

```bash
cd Backend && npm run dev          # localhost:5000
cd Frontend && npm run dev         # localhost:5173
```

Test against a **production build** when you are checking performance or
duplicate network calls — React StrictMode double-invokes effects in dev and
will show you duplicate requests that do not exist in production:

```bash
cd Frontend && npm run build && npx vite preview --port 4174
```

### Credentials

| Who | How to sign in |
|---|---|
| Any consumer | Phone number → OTP **`1234`** |
| Any partner, operator, driver | Phone number → OTP **`1234`** |
| Platform superadmin | `admin@gmail.com` / `admin123` |

`USE_DEFAULT_OTP=true` is set, so **1234 works for every phone number**. A new
number creates an account; an existing one signs in. That is also true in
production right now — it is a known and accepted risk, recorded in the security
audit.

### Environment flags that change what you can test

| Flag | Value | What it means for you |
|---|---|---|
| `USE_DEFAULT_OTP` | `true` | OTP is always 1234 |
| `VERIFICATION_DEV_BYPASS` | `true` | Driver DL/RC checks are skipped — driver onboarding completes without a real provider |
| `GOOGLE_MAPS_API_KEY` (backend) | **empty** | Maps *render* (the frontend key is set) but any **server-side** distance, geocoding or route call fails. Expect trouble on anything that needs a computed distance. |
| `VITE_GOOGLE_MAPS_API_KEY` (frontend) | set | Map tiles and place search work in the browser |
| `RAZORPAY_KEY_ID` | test keys | Payments open the real Razorpay sheet in test mode. Use Razorpay's test cards; no money moves. |

### Where each role signs in

| Role | Entry URL |
|---|---|
| Customer (super-app) | `/app` → `/app/login` |
| Customer (food only) | `/food/user` |
| Customer (taxi only) | `/taxi/user` |
| Restaurant | `/food/restaurant/login` · sign up at `/food/restaurant/signup` |
| Delivery partner | `/food/delivery/login` · sign up at `/food/delivery/signup` |
| Driver / vehicle owner | `/taxi/driver/login` |
| Hotel partner | `/hotel/partner/login` |
| Tours operator | `/tours/operator/login` |
| Platform admin (all modules) | `/admin` → one login for everything |

Once signed in as admin, switch modules from the sidebar: Food `/admin/food`,
Taxi `/taxi/admin`, Hotel `/hotel/admin`, Tours `/tours/admin`, Global
`/global/admin`.

---

## 1. Food — from an empty panel to a delivered order

The longest chain in the platform. Do it in order; each step needs the one
before it.

### 1.1 Admin creates a restaurant

1. Sign in at `/admin` → land on `/admin/food`.
2. Go to **`/admin/food/restaurants/add`**.
3. Fill owner name, restaurant name, phone, email, password, address, cuisine,
   zone. Save.
4. **Expect:** the restaurant appears in `/admin/food/restaurants`.

Alternative path worth testing separately: a restaurant applies on its own at
`/food/restaurant/signup`, and the admin approves it from
**`/admin/food/restaurants/joining-request`**.

### 1.2 Restaurant signs in and completes onboarding

1. Open `/food/restaurant/login`, sign in with the phone from 1.1 → OTP `1234`.
2. If prompted, complete **`/food/restaurant/onboarding`**.
3. Set opening hours at `/food/restaurant/outlet-timings` — pick a day, add a
   slot that covers **now**, or nothing will be orderable.
4. Set FSSAI details at `/food/restaurant/fssai`.
5. Go online at `/food/restaurant/status`.
6. **Expect:** status shows open; the restaurant becomes visible to customers.

### 1.3 Add a category and a dish

1. As admin, create a category at **`/admin/food/categories`**.
2. Go to **`/admin/food/foods`** and click **Add Food** — this is a **modal on
   the list page**, not its own URL.
3. Fill name, category, restaurant, price, veg/non-veg, image. Save.
4. If food approval is on, approve it at **`/admin/food/food-approval`**.
5. **Expect:** the dish shows on the restaurant's menu for customers.

> The veg/non-veg marker is the red/green FSSAI indicator. Check it renders the
> right colour — it is a legal marking, not decoration.

### 1.4 Customer orders

1. Open `/food/user`, sign in with a consumer phone → OTP `1234`.
2. Set a delivery address. **Known trouble:** address selection depends on maps;
   the backend maps key is empty, so expect problems here and note them rather
   than fighting them.
3. Browse to the restaurant, open the dish, add to cart.
4. Open the cart at `/food/user/cart`, then checkout.
5. Pay with Razorpay test credentials, or pick cash on delivery.
6. **Expect:** an order id is returned; the order appears at
   `/food/user/orders`; the **delivery fee is included** in the amount actually
   charged (a mismatch here was a real bug once — check the Razorpay sheet total
   against the cart total).

### 1.5 Restaurant accepts and prepares

1. In the restaurant panel, the new order should appear at `/food/restaurant`
   (orders is the landing screen) without a manual refresh.
2. Accept it, then move it through preparing → ready.
3. **Expect:** the customer's order-tracking screen follows each change.

### 1.6 Delivery partner delivers

1. Sign up at `/food/delivery/signup` → details → documents, or sign in at
   `/food/delivery/login`.
2. Admin approves the partner in the Food admin panel.
3. The partner goes online and accepts the order from `/food/delivery/orders`.
4. Move through picked up → delivered.
5. **Expect:** order status reaches delivered for customer, restaurant and
   admin; the restaurant wallet is credited; the platform commission is taken.

### 1.7 Money and the tail

- Restaurant earnings at `/food/restaurant/hub-finance`.
- Request a withdrawal; check `/food/restaurant/withdrawal-history`.
- Admin sees the order in `/admin/food/orders/delivered`.
- **Cancel a paid order and check the refund actually reaches the customer.**
  Cancellation currently marks the booking refunded and reverses the vendor
  wallet, but a gateway refund is **not** issued — this is a known open bug, so
  confirm whether it still behaves that way.

---

## 2. Taxi — tariff to completed ride

### 2.1 Admin sets up the basics

Everything below is under `/taxi/admin`:

1. **Vehicle type** — `/taxi/admin/pricing/vehicle-type/create` (e.g. bike, auto, cab).
2. **Zone** — `/taxi/admin/pricing/zone/create`, drawn on the map.
3. **Service location** — `/taxi/admin/pricing/service-location/add`.
4. **Tariff** — set base price, base distance, per-km, per-minute and tax for
   each vehicle type.
5. **Expect:** a fare quote for a test trip matches the tariff arithmetic.
   The **server** prices the ride; a client-supplied amount below the tariff is
   refused. Try tampering with the amount and confirm it is rejected.

> The tariff seeded on "bike lite" during development (₹45 base / 2 km / ₹14 per
> km / ₹1 per min / 5% tax) is **invented test data**. Replace it with real
> rates before any of this means anything commercially.

### 2.2 Driver onboarding

1. Open `/taxi/driver/login`, enter a phone → OTP `1234`.
2. Choose a role at `/taxi/driver/select-role`.
3. Walk the wizard: `step-personal` → `step-referral` → `step-vehicle` →
   `step-documents`.
4. Upload DL and RC. `VERIFICATION_DEV_BYPASS=true` means these are **not**
   really checked — do not read a pass here as proof the verification provider
   works.
5. Admin approves at `/taxi/admin/drivers/pending`.
6. **Expect:** the driver can go online only after approval.

Also test the admin-created path: `/taxi/admin/drivers/create`, and fleet owners
at `/taxi/admin/owners/create` with vehicles under `/taxi/admin/fleet/manage`.

### 2.3 Customer books a ride

1. Open `/taxi/user`, sign in → OTP `1234`.
2. Set pickup and drop. **Expect trouble:** distance comes from a server-side
   maps call and the backend key is empty.
3. Pick a vehicle type; check the quoted fare.
4. Confirm the booking.
5. **Expect:** the ride reaches nearby online drivers.

### 2.4 The ride itself

1. As the driver, accept the request.
2. Customer sees the driver assigned and tracking begins.
3. Driver arrives; **customer gives the start OTP** from their booking screen.
4. Driver starts, then ends the trip.
5. Settle payment (cash or online).
6. **Expect:** the ride shows completed in `/taxi/user/activity`, in the driver's
   history, and in `/taxi/admin/trips` ("Trip Requests"); the driver wallet and platform
   commission both move.

### 2.5 The other taxi products — each needs its own pass

| Product | Customer entry | Admin setup |
|---|---|---|
| Bus | `/taxi/user/bus` | routes, buses, seat layouts; bookings at `/taxi/admin/bus-service/bookings` |
| Rental | `/taxi/user/rental/vehicle` | `/taxi/admin/pricing/rental-packages`, `rental-vehicles` |
| Intercity / outstation | `/taxi/user/intercity/details` | intercity packages |
| Pooling / shared | `/taxi/user/cab/shared` | pooling routes; driver onboards at `/taxi/driver/pooling/onboarding`; bookings at `/taxi/admin/pooling/bookings` |
| Parcel | `/taxi/user/parcel/details` | goods types |
| Airport | `/taxi/user/cab/airport` | `/taxi/admin/pricing/airport/create` |

For each: book it, watch a driver accept, complete it, and confirm it lands in
the customer's history, the driver's history and the admin list. **Seat-based
products (bus, pooling) need a double-booking test** — hold the same seat from
two browsers and confirm only one wins.

---

## 3. Hotel — property to checkout

### 3.1 Partner joins and lists a property

1. Open `/hotel/partner/login`, phone → OTP `1234`.
2. Pick a property type at `/hotel/partner/join`.
3. Walk the matching wizard — there is one per type, and they differ:
   `join-hotel`, `join-lodge`, `join-resort`, `join-homestay`.
4. Add room types, rates and inventory at `/hotel/partner/inventory-properties`
   → `/hotel/partner/inventory/:id`.
5. Complete KYC at `/hotel/partner/kyc` and bank details at
   `/hotel/partner/bank-details`.
6. **Expect:** the property sits as pending, not live.

### 3.2 Admin approves

1. `/hotel/admin/partners` → approve the partner.
2. `/hotel/admin/properties/:id` → approve the property.
3. **Expect:** it now appears to customers and **not before**. Verify a pending
   property is genuinely invisible on the customer side.

### 3.3 Customer books a stay

1. From `/app/hotels` (or `/hotel`), open the property.
2. Pick dates and a room type; check the price breakdown.
3. Book and pay.
4. **Expect:** a booking id; visible in `/app/bookings?tab=hotels`, in
   `/hotel/partner/bookings` and in `/hotel/admin/bookings`.

### 3.4 Inventory, money, cancellation

- **Book the last room from two browsers at once.** Only one should succeed.
- Partner wallet credited at `/hotel/partner/wallet`; commission and tax taken.
- Withdrawal request → `/hotel/admin/finance` → walk pending → processing →
  completed. A UTR is required; a failed payout must return the money to the
  wallet.
- Cancel a booking and check the refund path (see the open refund bug in 1.7).
- **Authorization:** as customer A, try to open customer B's booking by id. It
  must refuse. This was a real IDOR once.

---

## 4. Tours — operator to settled payout

### 4.1 Operator onboarding

1. `/tours/operator/login`, phone → OTP `1234`, then the onboarding form.
2. Admin approves at `/tours/admin/operators`.
3. **Expect:** a pending operator can sign in but cannot publish.

### 4.2 Two ways a package is created

| | Operator | Admin on the operator's behalf |
|---|---|---|
| URL | `/tours/operator/packages/new` | `/tours/admin/packages/new` |
| Resulting status | `pending` | `approved` immediately |

Test **both**. For the operator path, reject it once with a reason, edit and
resubmit, then approve. Confirm a consumer sees the package **only** when it is
approved, active, and its operator is approved and unblocked.

### 4.3 Customer books with an advance

1. `/app/packages` → open the package → book.
2. Check the quote comes from the **server** (`POST /v1/tours/bookings/quote`),
   not computed in the browser.
3. Pay the advance.
4. **Expect the arithmetic:** `advanceAmount == round(total × advancePercent / 100)`,
   `operatorPayout == total − taxes − commission`, and the operator wallet moves
   by `advance − (commission + taxes)`. Where the advance does not cover the
   platform's cut, the wallet is **debited** — that is deliberate.

### 4.4 Balance and completion

1. Operator marks the balance collected at `/tours/operator/bookings`.
2. **Expect:** `paymentStatus` becomes paid, `balanceCollectedAt` is set, and
   **no money moves** — that cash went straight to the operator.
3. Walk a payout at `/tours/admin/payouts`.

---

## 5. Festivals

1. Admin creates a festival in `/global/admin/festivals`, with categories (VIP,
   mid, normal), each with its own price and seat count, and a booking window.
2. **Edit the booking window, then clear it.** Clearing is the case that breaks:
   a global middleware strips nulls from request bodies, so an empty string is
   the only signal that reaches the server.
3. As a customer at `/app/festivals`, add passes **from more than one category**
   in a single booking.
4. **Expect one Razorpay sheet for the whole basket**, not one per category.
   This was a real bug: the first attempt charged only the first category's
   first unit.
5. **Expect:** booking history shows each category's passes, seats decrement per
   category, and the admin's festival detail lists booked and available seats
   with booking ids and customer details — including for expired festivals.
6. Hold seats from two browsers at once and confirm only one booking wins.

---

## 6. Support, cutting across every module

1. As a customer, raise a ticket from `/app/support` — once per category (Taxi,
   Hotel, Food, Tour, Payment).
2. **Expect:** a ticket code back, and the ticket visible in the customer's own
   list.
3. Admin answers from `/global/admin/support`; the reply appears on the
   customer's ticket.
4. **Authorization:** as customer A, try to read or reply to customer B's ticket
   by id. Must refuse.
5. Hit `/api/v1/support/tickets` (a wrong URL a client might guess). Expect
   **400**, not 500.

---

## 7. Admin, reports and access control

1. `/global/admin/reports` — cross-module totals. Compare a module's figure
   against that module's own panel; they must agree.
2. `/global/admin/administrators` — create a module-scoped admin (e.g. food
   only). Sign in as them and confirm they **cannot** reach other modules'
   panels or APIs.
3. From every module's admin sidebar, confirm the **Global** entry is present
   and returns you to the other modules.
4. Confirm a consumer token is refused on every `/admin` endpoint. The API suite
   covers this; spot-check it in the browser too.

---

## 8. Things worth testing that are easy to forget

| | Why |
|---|---|
| Refresh on a deep link (`/app/bookings`, `/food/user/orders`) | SPA fallback and stale caches both break here |
| Back button after a payment | Double-submission and stuck states hide here |
| Two tabs, same account | Shared state and token refresh races |
| Phone width (375px) | The consumer app is phone-first; the admin panels are not |
| An account with **no** orders, bookings or passes | Empty states are where fake data usually shows |
| A cancelled and a refunded order | The least-walked paths |
| Uploads: a script renamed `.png`, an oversized file | Covered by the API suite; confirm the UI surfaces the refusal |

---

## 9. Known blockers — expect these, do not chase them

| Blocker | Effect |
|---|---|
| Backend `GOOGLE_MAPS_API_KEY` is empty | Server-side distance, geocoding and routing fail. Affects food address selection and taxi fare distance. The **frontend** key is set, so maps still render — which makes this look like it works when it does not. |
| `USE_DEFAULT_OTP=true` | Any phone signs in with 1234. Deliberate for now. |
| `VERIFICATION_DEV_BYPASS=true` | Driver DL/RC is not really verified. A pass proves nothing about the provider. |
| Gateway refunds are not issued | Cancelling marks refunded and reverses the vendor wallet, but the customer's money is not returned through Razorpay. |
| Razorpay test keys in production | Live payments would not settle. |
| Dev database is nearly empty | 6 food orders, 16 hotel bookings, 0 tour bookings. Nothing here tests behaviour at volume. |

---

## 10. Reporting what you find

Add bugs to [BUG_REPORT.md](BUG_REPORT.md) with: the URL, the role you were
signed in as, what you did, what you expected, what happened, and whether it
reproduces on a fresh load. A step count beats a paragraph.

For anything performance-related, see
[../performance/PERFORMANCE_BASELINE.md](../performance/PERFORMANCE_BASELINE.md)
for how to measure it properly — in particular, measure the production build,
and always include an endpoint you did **not** change as a control.
