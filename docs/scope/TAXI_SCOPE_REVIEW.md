# Taxi module — what is in there, for a scope decision

**Nothing has been removed.** This is an inventory so you can mark what stays.

Compiled 2026-09-18 from the route tables, the model files and the live
database. The taxi module is by far the largest: **~386 endpoints, 69 models,
61 collections**, against food's ~338 and hotel's ~134.

## The single most useful fact

**Almost none of it holds any data.** Of 61 taxi collections, these are the only
ones with rows:

| Collection | Rows |
|---|---:|
| `taxidriverneededdocuments` | 13 |
| `taxitransporttypes` | 4 |
| `taxiservicelocations` | 3 (incl. the Haflong one I added) |
| `taxidrivers` | 2 |
| `taxivehicles` | 2 |
| `taxizones` | 1 (the Haflong one I added) |
| `taxisetprices` | 1 (the invented dev tariff) |
| `taxiadminbusinesssettings`, `taxiadminthirdpartysettings` | 1 each |

**Everything below is empty.** No rides, no bookings, no bus, no pooling, no
rentals, no promos, no subscriptions. So removing anything here is a code
decision, not a data migration — which is the opposite of the hotel cleanup,
where real listings existed.

---

## A — Not a taxi service at all

These have no plausible reading as part of a ride SOP.

| # | Feature | Evidence | Size |
|---|---|---|---|
| A1 | **Careers / jobs board** | `CareerJob`, `CareerApplication` models; admin pages `careers/JobPositions.jsx`, `careers/CareerApplications.jsx` | 2 models, 2 admin screens |
| A2 | **Employee / HR management** | `Employee` model; `employees/EmployeeList / EmployeeCreate / EmployeeDetails` | 1 model, 7 backend files, 11 frontend files |
| A3 | **Vehicle service centres** | `ServiceCenterStaff` model; `/taxi/service-center` dashboard + vehicle intake screens | 1 model, 3 routes, 8 backend files |
| A4 | **Service stores** (parts/retail) | `ServiceStore` model; admin CRUD under `pricing/service-stores` | 1 model, 12 endpoints, 12 frontend files |
| A5 | **Customer biometric profiles** | `CustomerBiometricProfile` model | 1 model — **privacy-sensitive, worth a deliberate decision either way** |
| A6 | **Marketing website** | `/taxi/about`, `/contact`, `/faq`, `/services`, `/blog`, `/links` + `AdminCMSBuilder`, `Banner`, `OnboardingScreen` | 6 public pages, 3 models |
| A7 | **Translation CMS** | `AppLanguage`, `ReferralTranslation` models | 2 models, no UI found |

## B — Ride products beyond point-to-point rides

Real features, properly built. Whether they belong is your SOP call.

| # | Product | Front-end routes | Back-end endpoints | Models |
|---|---|---:|---:|---|
| B1 | **Bus ticketing** | 34 | 20 | `BusService`, `BusBooking`, `BusDriver`, `BusSeatHold` |
| B2 | **Vehicle rental** | 23 | 25 | `RentalVehicleType`, `RentalPackageType`, `RentalBookingRequest`, `RentalQuoteRequest` |
| B3 | **Car pooling** | 16 | 17 | `PoolingRoute`, `PoolingVehicle`, `PoolingBooking`, `PoolingSeatReservation`, `PoolingDriverOnboardingSession` |
| B4 | **Parcel / courier** | 12 | 2 | `Delivery`, `GoodsType` |
| B5 | **Intercity / outstation** | 8 | 1 | — |
| B6 | **Airport transfers** | 4 | 4 | `Airport` |
| B7 | **Spiritual trips** | 6 | — | — |
| B8 | **Shared taxi** (separate from B3 pooling) | 8 | — | — |

**Worth noting on B6:** Dima Hasao has no airport. The nearest are Silchar
(~200 km) and Guwahati (~350 km), so "airport transfer" is really a long
outstation run — it may be B5 under another name.

**Worth noting on B3 vs B8:** pooling and shared taxi are two separate
implementations of the same idea, built twice.

## C — Monetisation mechanics

| # | Feature | Size | Note |
|---|---|---|---|
| C1 | **Ride bidding** | `RideBid` model, bid-ride settings | Driver bids against a rider's max fare |
| C2 | **Rider subscriptions** | 10 endpoints, `SubscriptionPlan`, `UserSubscription` | Ride passes / credits |
| C3 | **Promo codes** | 8 endpoints, 3 models | |
| C4 | **Referrals** | 7 endpoints | |
| C5 | **Driver incentives** | 1 route | |

For a government district tourism platform, C1–C2 in particular are worth a
decision — a bidding market and subscription tiers are commercial-marketplace
mechanics.

## D — Admin surface that may exceed what you will operate

| # | Feature |
|---|---|
| D1 | Bulk **user import** and **driver import** |
| D2 | **Cancellation analytics** dashboard |
| D3 | **Geofencing** management |
| D4 | **Payment gateway** and third-party settings management (duplicates the platform-wide config) |
| D5 | Admin **roles and panel-state** management (duplicates the Global admin RBAC) |

## What is unambiguously core — leave alone

Ride booking and tracking · driver onboarding, approval and documents · vehicle
and fleet management · owners · zones · service locations · tariffs
(`SetPrice`) · wallets and withdrawals · safety/SOS · support tickets ·
notifications.

---

## Recommended order, if you decide to cut

1. **A1–A7 first.** Nothing there is a taxi feature, none of it holds data, and
   removing it does not touch a booking flow.
2. **Then whichever of B you rule out.** Each is self-contained enough to drop
   as a unit, and all their tables are empty.
3. **C and D last**, because C3–C4 (promos, referrals) are wired into the ride
   pricing path and D4–D5 overlap platform config — those need care rather than
   deletion.

When you have marked the list, the hotel precedent
(`Backend/scripts/drop-hotel-out-of-scope.js`) is the pattern to follow: remove
the code, then a cautious idempotent script that drops only empty collections
and *reports* anything holding real rows instead of deleting it.
