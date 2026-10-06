# MEMORY — Dima Hasao Tourism user app (Expo)

Long-term notes for anyone continuing this app. Per-screen / per-API status is in `CONVERSION_CHECKLIST.md`:
**read that next and continue at the first `todo` row.**

## 1. What this app is

Native Android (Expo) build of the **consumer ("user") app**. One login reaches three web modules:

| Module | Web path | Web source | App path |
| --- | --- | --- | --- |
| Tourism shell (places, hotels, tours, festivals, bookings, profile) | `/app/*` | `Frontend/src/modules/DimaHasao` | `src/app/app/*` |
| Food & dining | `/food/user/*` | `Frontend/src/modules/Food/{pages,components}/user` | `src/app/food/user/*` |
| Taxi / auto | `/taxi/user/*` | `Frontend/src/modules/Taxi/modules/user` | `src/app/taxi/user/*` |

Backend: `Backend/` (Node/Express/MongoDB), read-only. Flutter wrapper it replaces: `flutter/Dima Hasao Tourism- User/`
(a WebView of `https://tourismdimahasao.in/app`). `mobile/` is a different Expo app (delivery partner); its
infrastructure (API client, storage shim, kit) was the starting point here.

## 2. Discovered inputs

| Input | Value | From |
| --- | --- | --- |
| App name | Dima Hasao Tourism | wrapper `AndroidManifest.xml` `android:label` |
| Package | `com.dimahsao.user` | wrapper `android/app/build.gradle` `applicationId` |
| Version | 1.0.0, versionCode 2 (wrapper was `1.0.0+1`) | wrapper `pubspec.yaml` |
| API base URL | `https://tourismdimahasao.in/api/v1` | owner; wrapper `lib/config/app_config.dart` |
| Socket origin | `https://tourismdimahasao.in` (same origin) | `Frontend/src/shared/utils/socketOrigin.js` |
| Icon / splash | `assets/icon.png`, `assets/android-icon-*.png`, `assets/images/splashLogo.png` | wrapper `assets/`, `res/mipmap-xxxhdpi` |
| Firebase (push) | `google-services.json` (has a `com.dimahsao.user` client) | wrapper `android/app/google-services.json` |
| Maps / Razorpay public keys | `.env` (`EXPO_PUBLIC_*`) | `Frontend/.env` |

## 3. Stack

Expo SDK 57, React Native 0.86, React 19.2, Node 24. JavaScript only. Expo Router (file routes in `src/app`).

| Library | Used for |
| --- | --- |
| expo-secure-store | the three tokens |
| @react-native-async-storage/async-storage | what the web keeps in localStorage (`src/lib/storage.js`) |
| @tanstack/react-query | same lists the web caches with it (places, hotels, packages, festivals) |
| @expo/vector-icons (FontAwesome6) | the tourism shell's `fa-*` icons (`components/Fa.jsx`) |
| lucide-react-native | food and taxi icons (web: lucide-react) |
| @expo-google-fonts/{poppins,montserrat,cinzel,playfair-display,inter} | the web's fonts |
| expo-linear-gradient, expo-blur | gradients, backdrop blur |
| react-native-maps | maps (web: OSM embed / Google Maps JS) |
| expo-location | geolocation (foreground only) |
| socket.io-client | realtime (same client as the web) |
| react-native-webview | Razorpay checkout page, admin-written HTML (policies) |
| expo-notifications | FCM push |
| expo-image-picker, expo-document-picker, expo-image-manipulator | `<input type=file>`, image compression |
| expo-print, expo-sharing, expo-file-system | invoices / downloads |
| @react-native-community/datetimepicker | `<input type="date">` |
| zustand | stores the web keeps in zustand (taxi) |

## 4. Folder structure and conventions

```
src/app/                 routes; file path = web path (/app/hotels/:id -> app/app/hotels/[id]/index.jsx)
src/api/client.js        the one HTTP client
src/api/auth.js          OTP login, /me, logout
src/api/dh/*             tourism services (the web's own files, imports rewritten)
src/api/food.js          the user slice of the web's services/api/index.js
src/components/          shared: kit.jsx (BottomSheet, Dialog, SelectField), ui.jsx (Press), Fa, Img, Toast ...
src/components/dh/       tourism shell components (Header, AppBottomNav, ui, booking, hotel, places, home ...)
src/context/             AuthContext (session), BookingContext (tourism shell state)
src/food/                food module logic ported from the web: context/, hooks/, utils/, constants/
src/shared/              ports of Frontend/src/shared helpers that modules import
src/lib/                 storage, events, notify (toasts), razorpay, images, apiCache, queryClient ...
src/theme/index.js       the only place colours, fonts and shadows are defined
tools/                   porting scripts (see below)
```

- New screen: add the file under `src/app/` at the web path; Expo Router picks it up.
- Styles: `StyleSheet.create` at the bottom of the file; colours from `tw` (Tailwind v4 palette) / `dh` (brand);
  fonts from `poppins()`, `montserrat()`, `cinzel()`, `playfair()`.
- Tourism icons: pass the web's class string, `<Fa name="fa-solid fa-leaf" />`.
- Images from the API may be `/uploads/...` paths: use `components/Img.jsx` (default export `Image`), not RN's Image.
- Toast in the tourism shell: `useBooking().showToast(msg)` (the dark pill). Food/taxi: `toast` from `lib/notify` (sonner API).
- Bottom nav: one component, `components/dh/AppBottomNav.jsx`, mounted in the root layout; it decides by path
  whether to show (`navStateFor`). A screen that needs to clear it adds ~96 px bottom padding.

### Porting web logic (contexts, hooks, utils)

Non-UI web modules are ported with `tools/port-logic.js`, not rewritten:

```
node tools/port-logic.js jobs.json     # jobs: [{ "from": "modules/Food/utils/x.js", "to": "food/utils/x.js" }]
```

It rewrites `@food/*` and `@/shared/*` imports, swaps `localStorage` / `sessionStorage` for `localStore` /
`sessionStore`, `window.addEventListener` / `dispatchEvent(new CustomEvent())` for `events.on` / `events.emit`
(`lib/events.js`; handlers still read `event.detail`), `import.meta.env.VITE_X` for `process.env.EXPO_PUBLIC_X`,
and prints every browser API it could not translate. Those lines are then fixed by hand. `tools/use-img.js <folders>`
swaps RN `Image` for `components/Img` in screen folders.

## 5. Auth

Backend contract: see "Auth" in the checklist. In the app (`src/context/AuthContext.jsx`):

- Login screen calls `/auth/otp/request` → `/auth/otp/verify` (→ `/auth/otp/complete` for a new number), then
  `loginWithAuthData(data)` stores `accessToken`, `refreshToken` and the taxi token (`data.taxiAuth.token`) in
  **SecureStore** (`user_accessToken`, `user_refreshToken`, `taxi_userToken`) and the user objects in AsyncStorage
  (`user_user`, `userInfo`).
- `lib/storage.js` mirrors the tokens in memory under the web's localStorage keys (`user_accessToken`, `token`,
  `userToken` ...) so ported code that reads them keeps working; those keys are never written to disk.
- At launch a stored access token is restored if it is unexpired **or** a refresh token exists (the first 401 renews it).
- 401 → `POST /food/auth/refresh-token` once → retry. Refresh rejected (400/401/403) → session cleared, toast
  "Session expired", screens redirect to `/app/login`. A network failure never signs the user out.
- Logout: `POST /food/auth/logout` (best effort) then local clear. `events.emit('userAuthChanged')` fires on login and
  logout (food's cart and profile contexts listen), `userLoginSuccess` on login (food location refresh).
- `food/utils/auth.js` gives ported code `isModuleAuthenticated('user')`, `clearModuleAuth`, `setAuthData`.

## 6. API layer

`src/api/client.js`: `api.get/post/put/patch/delete(path, body, config)` resolves `{ data, status }` like axios and
rejects with `ApiError` (`.response.status`, `.response.data`). Timeout 20 s (uploads 120 s; `config.timeout` overrides).
GETs are de-duplicated while in flight and retried twice on network/502-504; writes are never retried.

Which token goes out follows the web's interceptor: user token by default; `config.auth: 'taxi'` sends the taxi token;
`config.auth: false` none; a request whose URL or `contextModule` belongs to the admin / restaurant / delivery module
goes out with no token (the user app holds none of those), exactly as from the web's user screens.

## 7. Web → native decisions

| Web | Native | Why |
| --- | --- | --- |
| localStorage / sessionStorage | `lib/storage.js` sync mirrors (AsyncStorage / memory); tokens in SecureStore | ported code reads storage synchronously |
| window CustomEvents | `lib/events.js` | modules signal each other through events |
| axios | `api/client.js` (fetch) with the axios result/error shape | screens and services port unchanged |
| framer-motion | `Animated` / `LayoutAnimation` | same intent (fades, springs, sheets, accordions) |
| Tailwind classes | StyleSheet + `theme` tokens | — |
| Font Awesome / lucide-react | `@expo/vector-icons` FontAwesome6 / lucide-react-native | same icon sets |
| OSM iframe, Google Maps JS | react-native-maps | — |
| navigator.geolocation | expo-location, foreground; `food/hooks/useLocation.jsx` keeps the web hook's contract | — |
| Google Places JS SDK (address search) | backend geocode proxy (`geocodeAPI`) | no JS SDK on native; **todo with the address selector** |
| `<input type="date">`, `<select>` | OS date picker; bottom-sheet list (`kit.SelectField`) | — |
| Razorpay checkout.js | the same checkout page in a WebView (`components/RazorpayHost.jsx`, `lib/razorpay.js`) | no native SDK in Expo managed; WebView is limited to the payment page |
| `<input type=file>` | expo-image-picker (`lib/images.js`) | — |
| sonner toasts | `lib/notify.js` + `components/Toast.jsx` | same API |
| web push (Firebase web SDK) | expo-notifications device token → `/fcm-tokens/mobile/save` | **todo** |

## 8. Backend changes

None.

Server configuration gap found (not changed, owner must fix): the live server has no Google Maps key in its environment, so
`/food/geocode/*` answers 503. The app falls back to Google directly with its public Maps key (`src/api/geocode.js`).

### Porting whole page logic (large screens)

Big web pages (cart, restaurant details, order tracking, category, taxi ride flow) are not re-typed. `tools/extract-hook.js`
turns the non-JSX half of the page component into a hook that returns every top-level name; the screen file then only
rewrites the JSX. Jobs live in `tools/hook-jobs.json` (`patches` there are hand edits that survive a re-run):

```
node tools/extract-hook.js tools/hook-jobs.json
```

Shims that make that code run unchanged: `lib/webRouter.js` (react-router's `useNavigate` / `useLocation` /
`useParams` / `useSearchParams`; `location.state` is kept in memory by `food/utils/routeState.js`, keyed by path),
`lib/webShim.js` (`window`, `document`, `navigator`, `alert`, `Image`, `Audio`, `CustomEvent` with native
equivalents or no-ops). Do not attach refs that the web used for DOM measuring (IntersectionObserver, getBoundingClientRect):
left null, those effects return early. Hooks under `food/hooks/pages` and `taxi/hooks` that are not listed in
`tools/hook-jobs.json` were generated from one-off job files and may carry hand edits: do not regenerate them blindly.
`node tools/check-imports.js` lists every relative import that points at a missing file (Metro stops at the first).

## 9. Commands

```
npm install
npx expo start                                   # dev server
npx expo lint                                    # add --quiet for errors only
npx expo-doctor
npx expo export --platform android               # JS bundle check
EAS_NO_VCS=1 npx eas-cli build --platform android --profile production --non-interactive   # release APK (see note)
```

### EAS (cloud) build

- EAS uploads from the **repository root**, not from `mobile-user/` (even with `EAS_NO_VCS=1`). The root `.gitignore`
  ignores every `.env`, so the app's `.env` never reaches the builder. The first cloud build (2026-10-05) failed in
  "Read app config" for that reason (`app.config.js` refuses a production build without the live HTTPS API URL).
- Fix in place: the five `EXPO_PUBLIC_*` values (public client values only) are stored as EAS environment variables
  for the `production` environment, and a root `.easignore` (root `.gitignore` + Backend, Frontend, flutter, docs…)
  keeps the upload down to the app.
- EAS project: `@rehan121/dima-hasao-user` (id in `app.json` → `extra.eas.projectId`). The Android keystore was
  generated by and lives on EAS (remote credentials); nothing signing-related is in the repository.
- Free tier: the build waits ~2 hours in the queue before it starts.

### Local release build (Windows, no queue)

Installed 2026-10-05: JDK 17 at `C:Usersadmin.jdksjdk-17.0.20.1+1` (`JAVA_HOME`), Android SDK at
`C:UsersadminAppDataLocalAndroidSdk` (`ANDROID_HOME`; platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1).

1. The native build **must run from a short path**. From the real folder ninja fails with
   "manifest 'build.ninja' still dirty after 100 tries" (Windows 260-character limit); a `subst` drive does not work
   either (Expo autolinking's node call fails). A plain copy at `C:dh` is used:
   `robocopy . C:dh /E /MT:16 /XD .expo .cxx .gradle` (first time), then `robocopy src C:dhsrc /MIR` and
   `robocopy assets C:dhassets /MIR` after changes. Re-copy `package.json` / `node_modules` when dependencies change.
2. `npx expo prebuild --platform android --no-install` (creates `android/`, gitignored) — rerun after app.json / plugin changes.
3. In `C:dhandroid`: `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a --no-daemon`.
   First run ~30 min, later runs ~10 min. Output: `appuildoutputsapkeleaseapp-release.apk`.
4. If images were removed, delete `android/app/build/generated/res/react` first: the bundle step does not clean it and
   aapt then fails on the stale files.
5. Do not let the PC sleep during the build.

The local APK is a real release build (minified, Hermes) but is **signed with the debug key**: fine for installing and
testing, not accepted by Play Store, and it cannot update / be updated by the EAS-signed build (uninstall first).

## 10. Known issues / unfinished

See the checklist for per-row status. As of 2026-10-05 (night):

- **Every user route is built**: tourism shell, food, taxi (including intercity vehicle / details / confirm). No `todo` rows remain.
- Lint: 0 errors. `npx expo-doctor`: 21/21. `npx expo export --platform android`: passes.
- Nothing has been run on a device or emulator (no Android SDK on the build machine). Everything is "Built, not tested";
  the checklist ends with the device test list.
- Push registration is in `src/lib/push.js` (mounted from `src/app/_layout.jsx`); the token key in local storage is
  `fcm_registered_token_user` (AuthContext sends it with logout). Untested without a device.
- Geocoding: `src/api/geocode.js` tries the backend proxy, and on 503 calls Google with the public Maps key.
  `taxi/utils/places.js` wraps it for the intercity screen; `app/taxi/user/ride/select-location.jsx` has its own copy of the same helpers.
- Part of Food and Taxi was written by a second, parallel session on 2026-10-05. That work was checked only by lint +
  bundle; treat those screens as less reviewed than the rest. Its notes are merged into the checklist's assumptions.
- Write / payment / ticket / ride-creation API calls have never been run against production.
- No deep links (the web has none).
- 2026-10-06: EAS production build **finished** (build 34213118-29a9-4dcd-9455-2c21f6637552, APK, EAS keystore). It predates the taxi header / home grid fixes below. The first EAS build (6ec9f505…) failed at "Read app config" (see section 9).
- First run on a real phone (owner, 2026-10-06): the **map tiles are blank** in the APK although the key is in the manifest. Most likely cause: "Maps SDK for Android" is not enabled for that key's Google Cloud project (the key works for Maps JS, Geocoding, Places, Directions). Owner must enable it / supply an Android key. Not confirmed by logcat.
- 2026-10-06 UI comparison: taxi screens were missing the web's module header ("TAXI / AUTO", from routes.jsx TaxiUserShell → ModuleShell); added in `taxi/components/TaxiShell.jsx`, which also zeroes the top safe-area inset for the screens under it. Taxi home grid now uses ServiceGrid.jsx's own defaults (Bike Taxi, Book now, All Services), wraps the subtitle and crops the image like the web. Food takeaway / dine-in tracking panel uses the web's wording.
- `scratchpad/text-audit.js` (session temp) compared every visible string of the web's user pages with the app: what is still absent is web-only (desktop-only `hidden` blocks, browser map-load errors, error-boundary text, alt text) or unreachable on the web (dialogs whose "open" setter is never called, unused components, retired v1 screens that now redirect).
- 2026-10-06 phone pass (owner's Oppo CPH2695, Android 16, USB debugging): logcat confirms the blank map is "Authorization failure … Ensure that the Maps SDK for Android is enabled" for package `com.dimahsao.user`, debug-key SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25. 55 screens that open by deep link (`dimahasao://<route>`) were opened and looked at: all render, no crashes. Fixed from that pass: Android wraps long TextInput hints (food Help, food Search — Search now draws its own one-line hint), and `/legal/*` needs a dark status bar. **Not seen on the phone:** screens that need data or route state (restaurant page, cart with items, checkout, order tracking, hotel / package / festival detail and booking, dining detail and booking, taxi select-vehicle / searching / tracking / complete / chat, intercity vehicle / details / confirm) and every sheet / dialog. The test account sits in Indore, outside the service zone, so food lists were empty.
- Phone screenshots: `adb exec-out screencap -p` after `adb shell am start -a android.intent.action.VIEW -d "dimahasao://<route>" com.dimahsao.user`. Never open `food/user/profile/logout` this way.
- 2026-10-06: local release APK built successfully (`dist/DimaHasaoTourism-1.0.0-local-release.apk`, 84 MB, arm64 + armv7). Not yet installed on a phone.
- 11 taxi PNGs copied from the web repo were damaged (same CRLF damage; the live site serves the same broken files) and made aapt fail. They were deleted; the five that code used now point at valid stand-ins (scooty → bike icon, bus / mini bus → car icon, bus fallback → fallback car, highway background → yellow-taxi photo).

## 11. Assumptions

- The wrapper was added during the first run as `flutter/Dima Hasao Tourism- User/`; its package `com.dimahsao.user` is reused.
- `.env` holds only public client values copied from `Frontend/.env` (Maps browser key, Razorpay **test** key id).
- The wrapper's onboarding slides are template placeholders for another product; the web has no onboarding, so none is built.
- Web bugs are reproduced rather than fixed where a screen depends on them; each is listed in the checklist.
