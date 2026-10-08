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

## Units and screens

Filled in per unit as the ports land (see `tools/units.json`).

## Device test list

Written at hand-over.
