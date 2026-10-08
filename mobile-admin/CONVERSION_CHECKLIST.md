# Conversion checklist — Dima Hasao Admin (admin app)

Status values: **Verified** (run and seen working) · **Built, not tested** · **Blocked** (says why) ·
**todo** (not started; a continued run starts at the first `todo`).

## Discovered inputs

| Input | Value | Source |
| --- | --- | --- |
| Target app | Admin (all five admin panels: Food, Taxi, Hotel, Tours & Festivals, Global) | stated by the owner, 2026-10-08 ("every admin screen") |
| Web frontend | `Frontend/src/modules/Food/{pages,components}/admin`, `modules/Taxi/modules/admin`, `modules/Hotel/app/admin`, `modules/Tours/app/admin`, `modules/Global/app/admin`, `shared/components/admin` | routers: `Food/components/admin/AdminRouter.jsx`, `Taxi/TaxiApp.jsx`, `Hotel/routes.jsx`, `Tours/routes.jsx`, `Global/routes.jsx`; mounted by `app/AdminModulesKeepAlive.jsx` |
| Backend | `Backend/` (admin login `POST /food/auth/admin/login`; panels under `/food/admin`, `/taxi/admin`, `/hotel/admin`, `/tours`, `/admin`) | `Frontend/src/services/api/*`, each panel's service files |
| Flutter wrapper | **none** — there is no admin wrapper in `flutter/` (the admin console was web-only) | `ls flutter/` |
| App name | Dima Hasao - Admin | chosen: same pattern as the other apps ("Dima Hasao - Food Partner"); no wrapper to take it from |
| Android package | `com.dimahsao.admin` | chosen: same pattern as `com.dimahsao.restaurant` / `.hotelpartner`; no wrapper |
| Version | 1.0.0, versionCode 1 | new app |
| Icon / splash | the district crest (`Frontend/public/logo.jpeg`), which the web admin console shows (`DEFAULT_BRAND_LOGO`, `shared/constants/brandLogo.js`) | generated into `assets/` |
| API base URL | `https://tourismdimahasao.in/api/v1` | `mobile-*/eas.json` (production), deployed VPS (memory: vps-deployment); `.env` + `eas.json` here |
| Maps key (Android) | the Android Maps key the other apps' `eas.json` use | `mobile-delivery/eas.json` |
| Firebase / push | **not needed**: the admin web registers no FCM token and receives no push (no `firebaseMessaging` / `getToken` in any admin file) | grep over the admin source |
| Payment key | not needed: the admin panels take no payments | — |
| Test login | `admin@gmail.com` / `admin123` (platform superadmin from `Backend/scripts/seed-super-admin.js`); works on production 2026-10-08 | seed script defaults |

## Preconditions (2026-10-08)

1. Target stated: admin app (owner). There is no admin Flutter wrapper; the owner asked for the app anyway and for a
   new package name. Proceeding without a wrapper (nothing to carry over from one). OK
2. Web source and backend source present; no wrapper (see 1). OK
3. `https://tourismdimahasao.in/api/v1/food/admin/business-settings/public` answers 200 over HTTPS. OK
4. Credentials: Maps key present. No Firebase needed (no push in the admin web). OK
5. Login: the seeded superadmin signs in on production. OK — **and a security problem**: the production superadmin still
   has the seed script's default password. Change it (Global › Profile) after testing.
6. Expo: `eas whoami` → not logged in. The release build is done locally with the Android SDK (`~/Android/Sdk`, JDK 17)
   or with `eas login` + `eas build`.

## Fixed decisions

- Same stack as `mobile-user` / `mobile-restaurant`: Expo SDK 57, RN 0.86, Expo Router, JavaScript.
- **Styling**: the web's Tailwind class strings are kept and turned into React Native styles by `twrnc` with the web's
  own palette and theme tokens (`src/lib/tw.js`). The master prompt asks for "StyleSheet plus one theme file"; with
  ~250 screens / ~127k lines this keeps the port faithful (exact spacing, sizes, colours) and tractable. The output is
  still plain RN style objects; the theme is `src/theme/index.js` + `themeColors` in `src/lib/tw.js`.
- **HTML-shaped primitives** (`src/components/web.jsx`) and the **shadcn kit** (`src/components/shadcn.jsx`) carry the
  web's markup over with CSS behaviour that RN lacks (text inheritance, flex = row, grid, divide, space, forms).
- **Codemod** `tools/port.js` does the mechanical part of each file; agents resolve the `// PORT:` flags.
- One admin session for all five panels (the web uses `admin_accessToken` on every admin route).
- No push, no payments, no wrapper capabilities to carry over.
- Work split: `tools/units.json` (22 units, every web file has one owner).

## Auth (how the backend does it)

| Step | Web | App |
| --- | --- | --- |
| Login | `POST /food/auth/admin/login {email,password}` → `{ accessToken, refreshToken, user }`; `setAuthData('admin', …)` + `setUnifiedAdminSession` | same call; tokens in SecureStore (`admin_accessToken`, `admin_refreshToken`), profile in storage as `admin_user` / `adminInfo` (`src/context/AuthContext.jsx`) |
| Token | `Authorization: Bearer <admin_accessToken>` on every admin request (all 5 panels) | same, in `src/api/client.js` |
| Refresh | on 401: `POST /food/auth/refresh-token {refreshToken}`, retry once; rotated refresh token kept; 400/401/403 on refresh → session cleared | same |
| Expiry | access token JWT `exp`; the web treats an expired token as signed out | an expired access token is kept while a refresh token exists (renewed on the first 401), so the session survives restarts |
| Logout | `POST /food/auth/logout {refreshToken}` then clear | same (`useAuth().logout()`) |
| Landing | `resolveAdminHome(profile)`: first panel the admin can see, else Global | same (`src/admin/access.js`) |
| Forgot password | `POST /auth/admin/forgot-password/request-otp`, `…/reset` | ported with the Food core unit |

Status: login against production — **Verified** with curl (2026-10-08); in-app — Built, not tested.

## Flutter wrapper capabilities

None: there is no admin wrapper. Native capabilities the admin web itself needs: camera / photo picker (uploads),
location (map centring), file export (share sheet), print (PDF). Permissions in `app.json`: location, camera only.

## Units and screens (2026-10-08)

Every admin screen of all five panels is ported: **332 source files, 306 Expo Router routes**, no `PORT:` flags left,
`npx expo lint` 0 errors, `npx expo export --platform android` builds (13 MB Hermes bundle).
Each unit's own report (files, routes, deviations, kit gaps) is in `tools/port-reports.jsonl`.

| Unit | Files | Routes | Lint errors | PORT flags |
| --- | --- | --- | --- | --- |
| food-catalog | 11 | 11 | 0 | 0 |
| food-core | 36 | 11 | 0 | 0 |
| food-customers | 17 | 14 | 0 | 0 |
| food-delivery-ops | 18 | 9 | 0 | 0 |
| food-delivery-partners | 10 | 8 | 0 | 0 |
| food-landing | 5 | 3 | 0 | 0 |
| food-orders | 20 | 14 | 0 | 0 |
| food-promotions | 14 | 9 | 0 | 0 |
| food-reports | 15 | 10 | 0 | 0 |
| food-restaurants | 6 | 5 | 0 | 0 |
| food-settings | 14 | 13 | 0 | 0 |
| food-system | 22 | 20 | 0 | 0 |
| food-zones | 10 | 8 | 0 | 0 |
| hotel-core | 17 | 13 | 0 | 0 |
| hotel-records | 23 | 8 | 0 | 0 |
| taxi-core | 15 | 11 | 0 | 0 |
| taxi-drivers | 11 | 10 | 0 | 0 |
| taxi-drivers-settings | 22 | 27 | 0 | 0 |
| taxi-geo-promo | 14 | 25 | 0 | 0 |
| taxi-pricing | 13 | 27 | 0 | 0 |
| taxi-users-ops | 23 | 18 | 0 | 0 |
| tours-global | 32 | 22 | 0 | 0 |

Left out on purpose (the only two):
- `components/admin/campaigns/AddEditFoodCampaignDialog.jsx` — not imported by any routed page on the web.
- `LandingPageManagement.jsx`'s delete-confirmation block — dead on the web (its `open` is always false).

223 adaptations were recorded across the units (charts → `react-native-gifted-charts`, Google Maps JS →
`react-native-maps`, file inputs → pickers, Blob downloads → the share sheet, `window.print` → native print,
DOM scroll/focus → refs). They are listed per unit in `tools/port-reports.jsonl`.

## Verified by running the app (2026-10-08)

Run in the Expo web preview against the **live production API**, signed in as the seeded superadmin:

| Check | Result |
| --- | --- |
| Admin login against production | **Verified** — lands on `/admin/food` |
| Session survives a reload / app restart | **Verified** in the preview; on a device SecureStore holds the tokens — re-test on the phone |
| Food dashboard | **Verified** — real figures (gross revenue, commission, delivery fee) |
| Sidebar drawer + module switcher | **Verified** — sections, icons, badges, all five panels |
| Taxi / Hotel / Tours / Global panels | **Verified** — each loads with real data |
| 110 routes visited in one pass | **Verified** — 0 JS errors, 0 blank screens, 0 unexpected bounces to login |
| Everything needing a device (maps, camera, pickers, print/share, back button) | Built, not tested |

Six integration bugs were found this way and fixed (commit `88f02bb`): the tours API service still calling axios
interceptors (crashed the route tree at import), `mx-auto` making pages wider than the screen, bundled images not
rendering, the storage global shadowing AsyncStorage, a missing page padding, and the maps module breaking the preview.

## Device test list

Walk these in order on the phone, signed in as an admin:

1. **Login** — wrong password shows the server's message; correct password lands on the first panel you can open.
2. **Session** — kill the app and reopen: still signed in. Leave it overnight and reopen: still signed in (token refresh).
3. **Navigation** — open the drawer, switch between Food, Taxi, Hotel, Tours and Global; use the Android back button
   after each (it should retrace, and ask nothing at the panel root).
4. **Lists and filters** — Orders, Restaurants, Customers, Drivers, Bookings: filter, search, paginate, open a row's
   detail and come back.
5. **Tables** — scroll a wide table sideways; check no column is cut off mid-word.
6. **Writes (use test data only)** — create and then delete one coupon; toggle a restaurant's status back and forth.
7. **Uploads** — change the admin profile photo from camera and from gallery; check the permission prompts appear once.
8. **Maps** — Food zone setup: draw a zone by tapping, drag a vertex, save; Taxi geo-fencing and god's-eye.
   If the map is blank, the Maps key needs `com.dimahsao.admin` + the release SHA-1 added.
9. **Exports** — export a report to CSV, Excel and PDF; each should open the Android share sheet with the right name.
10. **Print** — print an order receipt; the Android print dialog should offer "Save as PDF".
11. **No network** — turn on airplane mode: lists show their error state, the offline banner appears, and retry works
    once you are back online.
12. **Session expiry** — in Global › Administrators, sign out; you land on the login screen with everything cleared.
13. **Logout** — then reopen the app: it asks you to sign in again.

## Build

- Signing: release keystore at `~/dimahasao-keystores/admin-release.jks` (alias `admin`), passwords in the user-level
  `~/.gradle/gradle.properties` (`ADMIN_UPLOAD_*`). **Back this file up** — losing it means the app can never be updated.
  Release SHA-1: `AF:8C:F2:F6:5C:13:A2:D2:C8:EF:40:D7:84:90:90:C6:F7:1F:C2:81`.
- Local APK: `npx expo prebuild --platform android --no-install`, then in `android/`:
  `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`.
- EAS instead: `npx eas-cli login` then `npx eas-cli build --platform android --profile production --non-interactive`
  (`eas.json` already outputs an APK and carries the production API and Maps keys).
