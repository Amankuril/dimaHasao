# Taxi module — scope review, and what was removed

Compiled 2026-09-18 as an inventory. Acted on 2026-09-21: everything marked
**removed** below is gone from the code, in the commits listed at the end.

## Where this started

The taxi module was by far the largest in the merged app — **~386 endpoints, 69
models, 61 collections**, against food's ~338 and hotel's ~134 — because it
arrived as a complete multi-product ride marketplace from the previous product
rather than as a district taxi service.

Almost none of it held data. Of 61 taxi collections only nine had rows, and
none of those belonged to a removed feature, so this was a code decision rather
than a data migration throughout.

## Removed

| Feature | Why it is out of scope |
|---|---|
| **Careers / jobs board** | Not a taxi feature |
| **Employee / HR attribution** | A field-sales scheme: staff codes attributed each signup |
| **Language master + referral-translation CMS** | Per-language copy for the referral screens; every field shipped empty and was never filled, so both screens rendered blank. The wording now ships with the app |
| **Bus ticketing** | Not in the SOP |
| **Car pooling and shared taxi** | Two implementations of the same idea, neither in the SOP |
| **Fleet-owner module** | A vendor tier — owners, fleet vehicles, attached drivers, owner wallets and reports. The SOP has no taxi vendor |
| **Parcel / courier** | A second Ride service type with its own mirrored Delivery collection |
| **Spiritual trips** | Six screens, no endpoints, advertising Ujjain and Omkareshwar — Madhya Pradesh |
| **Ride bidding** | A fare-bidding market, plus a rider fare auto-increment mode behind the same switch |
| **Rider and driver subscriptions** | Ride passes and credits |
| **Rental service-store marketplace** | See below |
| **Marketing website + CMS** | Home, about, services, blog, contact, FAQ, links for the previous company, and an admin CMS to edit them |
| **Bundled legal screens** | Terms and privacy rendered from two text files in the bundle, with a hard-coded price list. Now redirect to `/legal/:slug`, served from Global Settings |

## Rental, specifically

The SOP asks for **"full-day/hourly taxi rental"**. What the codebase had was a
rental *marketplace*: vehicles belonged to service stores, each store had its
own commission split, staff accounts, and fingerprint biometrics for handing a
vehicle over.

None of it was reachable — `RENTAL_ENABLED` had been false for some time, so
the customer journey, the service-centre driver panel and nine admin screens
were all dark.

The marketplace is gone. **Rental package types and package pricing stay**:
those are the hourly and full-day packages themselves, priced through SetPrice
like every other tariff, and they are what the SOP feature needs. Delivering it
means adding a package fare mode to the ordinary ride flow — `Ride.serviceType`
is `ride | intercity` and has no hourly mode today — not reviving a store
marketplace.

## Kept

Ride booking and tracking · driver onboarding, approval and documents · the
driver's own vehicle · zones · service locations · tariffs (`SetPrice`) ·
rental packages and package pricing · intercity/outstation · airport transfers
· promos and referrals (SOP section 12) · driver incentives · wallets and
withdrawals · safety/SOS · support tickets · notifications.

## Still open

- **D4 — payment gateway and third-party settings.** The taxi admin has its own
  screens writing to its own collection, and they are *live*: the active
  gateway they select is what the taxi apps pay through. The platform-wide
  config overlaps them. This is a merge, not a deletion, and it changes how
  payments resolve — it needs a decision about where the merged config lives
  before anyone touches it.
- **D5 — admin roles and panel state.** Same shape: the taxi admin's RBAC
  overlaps the Global admin's. Both permission lists have been pruned to what
  still exists, but they are still two lists.
- **Inert bidding branches** in SelectVehicle, the intercity screens and the
  driver request screens. They read fields the API no longer returns, so they
  can never evaluate true. Worth a follow-up pass.
- **Empty collections.** `scripts/drop-taxi-out-of-scope.js` reports them and,
  with `--apply`, drops the empty ones. All 25 were empty when last checked; it
  refuses to delete anything holding rows.

## Commits

`1e82c8a` careers · `127c4e3` staff attribution, language and translation CMS ·
`779ea05` bus, pooling, fleet owners · `cab5abf` parcel, subscriptions, shared
taxi, spiritual trips · `2d31159` ride bidding · `07f5fd5` rental
simplification · `f908b27` marketing website and CMS
