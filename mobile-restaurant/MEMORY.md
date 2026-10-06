# MEMORY — Dima Hasao Food Partner (restaurant app, Expo)

Read this first, then `CONVERSION_CHECKLIST.md`; continue at the first row that is not finished.
The master prompt for this conversion is `docs/MASTER_PROMPT_RN_CONVERSION_v2.md` (repository root).

## 1. What this app is

Native Android app for the **restaurant (food partner) role**, converted from the web module
`Frontend/src/modules/Food/pages/restaurant` + `components/restaurant` (router: `components/restaurant/RestaurantRouter.jsx`,
mounted at `/food/restaurant`). Backend: `Backend/`. Flutter wrapper it replaces: `flutter/Dima Hasao Tourism - Restaurant/`.

The sister app `mobile-user/` (user role) was converted first. This folder started as a copy of its infrastructure
(API client, storage, router shim, UI kit, theme, tools); its user screens are not part of this app.

## 2. Discovered inputs

| Input | Value | Source |
| --- | --- | --- |
| App name | Dima Hasao - Food Partner | wrapper `android/app/src/main/AndroidManifest.xml` (`android:label`) |
| Package | `com.dimahsao.restaurant` | wrapper `android/app/build.gradle` |
| Version | 1.0.0 (versionCode 2; wrapper was 1.0.0+1) | wrapper `pubspec.yaml` |
| Web URL the wrapper loads | `https://tourismdimahasao.in/food/restaurant` | wrapper `lib/config/app_config.dart` |
| API base URL | `https://tourismdimahasao.in/api/v1` | `Frontend/.env`, wrapper `app_config.dart`; in the app: `.env` (`EXPO_PUBLIC_API_URL`) |
| Firebase config | `google-services.json` (has the `com.dimahsao.restaurant` client) | wrapper `android/app/google-services.json` |
| Icon / splash | wrapper `res/mipmap-xxxhdpi/ic_launcher*.png`, `assets/images/splashLogo.png` | copied to `assets/` |
| Brand colour | `#B80B3D` (restaurant theme) | `components/restaurant/restaurantTheme.css` |

## 3. Stack

Same as `mobile-user`: Expo SDK 57, React Native 0.86, JavaScript, Expo Router (routes in `src/app`),
`lucide-react-native` icons, `react-native-maps`, `expo-notifications`, `expo-image-picker`, `expo-location`,
`@react-native-community/datetimepicker`, `@tanstack/react-query`. Node 24.

## 4. Folder structure and conventions

- `src/app/` — Expo Router routes; each file re-exports a screen from `src/restaurant/screens/`.
- `src/restaurant/` — this app's code: `screens/`, `components/`, `hooks/` (page logic), `utils/`.
- `src/api/` — `client.js` (the one API client), `restaurant.js` (the web's `restaurantAPI` etc.).
- `src/lib/` — `webRouter.js` (react-router shim over Expo Router), `webShim.js`, `storage.js`, `notify.js` (toasts), `push.js`.
- `src/components/` — `ui.jsx` (`Press`), `kit.jsx` (`BottomSheet`, `Dialog`), `Img.jsx` (resolves `/uploads` paths).
- `src/theme/` — tokens (`tw`, `poppins()`, `shadow()`).
- `tools/` — conversion scripts (see section 9).

Porting method (same as the user app): `tools/extract-hook.js` turns the non-JSX half of a web page into a hook that
returns every top-level name; the screen is written by hand from the web's JSX (`tools/slim.js` prints it compactly).

## 5. Auth

- Sign-in is phone + 4-digit OTP with the **partner** audience (`POST /auth/otp/request`, `/auth/otp/verify`,
  `audience: "partner"`; `src/api/auth.js`). The answer carries `restaurant: { accessToken, refreshToken, user, status }`
  and/or `hotel`, or `nextStep: "onboarding"`.
- `src/context/AuthContext.jsx` owns the session: tokens in SecureStore (`restaurant_accessToken`,
  `restaurant_refreshToken`), the restaurant object in local storage as `restaurant_user`. `useAuth()` gives
  `{ booting, signedIn, user, loginWithAuthData, logout, updateUser }`.
- Ported page code keeps calling the web helpers: `src/restaurant/utils/auth.js` (`setAuthData`, `clearModuleAuth`,
  `isModuleAuthenticated`, `getCurrentUser`) and `src/restaurant/utils/partnerSession.js`.
- Refresh: the API client retries once after `POST /food/auth/refresh-token`; a rejected refresh clears the session,
  shows "Session expired" and the shell redirects to `/food/restaurant/login`.
- Guard: `src/restaurant/components/RestaurantShell.jsx` (public routes listed there; everything else needs a session).
- Logout: `restaurantAPI.logout(refreshToken)` sends the saved push token (`fcm_registered_token_restaurant`) with it.

## 6. API layer

- One client: `src/api/client.js` (base URL from `.env`, bearer token, timeout, refresh on 401, no retry of writes).
  It resolves `{ data, status }` and rejects with an error carrying `.response = { status, data }`, like axios.
- `src/api/restaurant.js` is the web's `restaurantAPI` / `diningAPI` / `zoneAPI` / `uploadAPI` / `authAPI` for this role,
  same method names, paths and short caches. The web's `contextModule: "restaurant"` tag is not needed (one role).
- Files for upload are `{ uri, name, type }` objects from the image picker; `lib/images.js` compresses them first.
- Some pages call `restaurantAPI` methods the web never defined (`scheduleItemAvailability`, `reverify`,
  `resetPassword`, `getRestaurantOrderSettings`): on the web those throw. Handle each when its page is ported.

## 7. Web → native decisions

- Push: `src/lib/push.js` replaces `Food/utils/firebaseMessaging.js` (device FCM token via `expo-notifications`,
  saved to `/fcm-tokens/mobile/save`, channel `default`).
- Auth shell: `src/restaurant/components/AuthShell.jsx` = `shared/components/auth/DimaHasaoAuthShell.jsx` at phone width.
- Router: web paths are kept (`/food/restaurant/...`), so `navigate()` calls in ported code work unchanged
  (`src/lib/webRouter.js`; `/restaurant/...` links are mapped to `/food/restaurant/...`).
- Porting tools are retargeted to this folder: `@food/api` → `api/restaurant`, `@food/(utils|hooks|components)/x` →
  `restaurant/…/x`, `@food/utils/firebaseMessaging` → `lib/push`.

## 8. Backend changes

None.

## 9. Commands

```
npm install
npx expo start
npx expo lint
npx expo-doctor
npx expo export --platform android
```

Local release build (no EAS): JDK 17 at `C:\Users\admin\.jdks\jdk-17.0.20.1+1` (`JAVA_HOME`), Android SDK at
`C:\Users\admin\AppData\Local\Android\Sdk` (`ANDROID_HOME`). The native build must run from a short path on Windows
(ninja fails past 260 characters; a `subst` drive does not work): keep a copy at `C:\dr`
(`robocopy . C:\dr /E /MT:16 /XD .expo .cxx .gradle`, then `robocopy src C:\dr\src /MIR`), run
`npx expo prebuild --platform android --no-install`, then in `C:\dr\android`:
`gradlew.bat assembleRelease bundleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a --no-daemon`.
The PC must not sleep during a build. Copy node_modules WITHOUT excluding `dist` (it has `dist` folders inside). Run gradle from PowerShell (`.\gradlew.bat`), not `cmd /c` from Git Bash.

Signing: release keystore `C:/Users/admin/dimahasao-keystores/restaurant-release.jks` (alias `restaurant`), passwords in the user-level `~/.gradle/gradle.properties` (`RESTAURANT_UPLOAD_*`). `plugins/withReleaseSigning.js` (an Expo config plugin) wires them into the generated `android/app/build.gradle`. **Back the keystore up**: losing it means the app can never be updated. Outputs are copied to `dist/` (git-ignored).

Tools: `node tools/slim.js <path under Frontend/src> [from] [to]`, `node tools/extract-hook.js tools/hook-jobs.json`,
`node tools/check-imports.js`.

## 10. Known issues / unfinished

- 2026-10-06: built so far: scaffold, API layer, session, shell, sign-in, pending-verification, and the home
  (orders, all lists and popups, bottom bar, top bar, new-order alert). Lint 0 errors, Android bundle builds.
  Continue with the checklist's first `todo` row.
- 2026-10-06 (later): every route row in the checklist is now Built (orders/all, orders/:id, reservations, inventory, hub-menu/item/:id, outlet-timings/:day, edit-owner, edit-address, zone-setup, hub-finance, onboarding). Lint 0 errors, Android export OK. Left: the wrapper-capability rows (push, permissions, exit dialog, etc.) and all device testing. Web bug kept: DaySlots Save always fails (undeclared STORAGE_KEY). Onboarding city list is the web's fixed list.
- Theme: the web repaints its old brand hexes at run time; use `src/restaurant/theme.js` (`RT`) and the mapping
  table at its top when porting class names.
- New-order alert plumbing: `hooks/useRestaurantNotifications.js` (web logic) on `utils/alertPlatform.js`
  (expo-audio, Vibration, AppState, local notification).
- Test account: demo restaurant on the owner's number, **pending approval** (see checklist). Signed-in APIs other
  than `/food/restaurant/current` answer 403 until an admin approves it.
- The user app's `src/food`, `src/shared`, `src/data`, `components/dh` were removed; copy single helpers back from
  `mobile-user/src` when a ported page needs one (`node tools/check-imports.js` lists what is missing).
- 2026-10-06 (final): wrapper-capability rows all closed (see checklist). Push channel `default` matches Backend `firebase.service.js` (`channel_id: 'default'`). app.json: added VIBRATE and notification `defaultChannel`. Web route audit: every RestaurantRouter route has a native route; all `restaurantAPI` methods the restaurant pages use exist in `src/api/restaurant.js`. Not verifiable without a device: push delivery, alert sound, permissions prompts, maps, any signed-in screen (demo restaurant is pending).
- Release keystore created 2026-10-06 (new: the wrapper's `dimahsao.jks` is not in the repository or on this PC, so if the old app was already published with it, Play Store will need that key or a Play App Signing key reset).
- Home screen now asks "Exit App?" on hardware back (wrapper parity). Lint 0 errors, expo-doctor 21/21, Android export OK.
- Not run: text-coverage script and signed-in API checks (the only test number has no approved restaurant).

## 11. Assumptions

- Hotel side of the partner account is out of scope (it has its own wrapper / app, `com.dimahsao.hotelpartner`):
  no workspace switcher, no `add-hotel`, no hotel onboarding. A new number goes straight to the restaurant onboarding
  (the web first asks "restaurant, hotel or both"); a number that owns only a hotel is told to use the hotel app.
