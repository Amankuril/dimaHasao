# MEMORY — Dima Hasao Taxi Driver (driver app, Expo)

Read this first, then `AUDIT.md` (routes, APIs, socket, wrapper capabilities), then `CONVERSION_CHECKLIST.md`.
Master prompt: `docs/MASTER_PROMPT_RN_CONVERSION_v2.md` (repo root). Do not redesign: the web at 360–412px is the spec.

## What this is
Native Android app for the **taxi driver role**, converted from `Frontend/src/modules/Taxi/modules/driver/**`
(router: `Frontend/src/modules/Taxi/TaxiApp.jsx`, block `<Route path="driver" element={<DriverLayout/>}>`, web base
`/taxi/driver`). Backend: `Backend/` (taxi API at `<origin>/api/v1/taxi`, OTP auth at `<origin>/api/v1/auth/otp`).
Replaces the Flutter wrapper `flutter/Dima Hasao Tourism - Taxi Driver/` (package `com.dimahsao.taxidriver`).
Sister apps: `mobile-user/` (rider; its `src/taxi` is a finished port of the user half of the same taxi module — copy
helpers from there) and `mobile-restaurant/` (infra source of this folder).

## Stack
Expo SDK 57, RN 0.86, JavaScript only, Expo Router (`src/app`), `lucide-react-native`, `react-native-maps`,
`expo-notifications`, `expo-image-picker`, `expo-location`, `expo-document-picker`, `expo-audio`, `expo-clipboard`,
`socket.io-client`, `@tanstack/react-query`. Node 24. **Do not run `npm install` / `npx expo install` yourself** (parallel
installs corrupt package.json): list the packages you need in your final reply and the lead installs them.

## Layout
- `src/app/` Expo Router files only. Driver routes live under `src/app/taxi/driver/*.jsx` (web path `/taxi/driver/<x>`
  is the same path in the app, dynamic `:id` -> `[id].jsx`). Each file just re-exports a screen from
  `src/driver/screens/`. Create them with `node tools/add-route.js <route> <ScreenFile>` (route relative to
  `/taxi/driver`, e.g. `wallet`, `support/ticket/:id`). `src/app/taxi/driver/_layout.jsx` = `DriverShell` (the web's
  DriverLayout guard + ride-request listener); do not edit it unless your task says so.
- `src/driver/screens/` screens; `src/driver/components/` driver components; `src/driver/hooks/`; `src/driver/utils/`;
  `src/driver/services/registrationService.js` (the web's service, driver subset, already ported: `getCurrentDriver`,
  `getLocalDriverToken`, `persistDriverAuthSession`, `clearDriverAuthState`, onboarding calls, notifications, ...);
  `src/driver/api/client.js` = the web's Taxi `axiosInstance` (see below); `src/driver/api/socket.js` = web `socketService`
  (`connect/disconnect/on/off/emit`); `src/driver/shared/` map (`live/parts.jsx`, `live/mapStyle.js`), `utils/googleRoutes.js`,
  `utils/googleMaps.js`, `chat/*` copied from mobile-user.
- `src/api/client.js` base fetch client (don't use it directly for taxi calls); `src/api/auth.js` = web `otpAuthClient`
  (`requestOtp/verifyOtp/completeSignup`, `AUDIENCE.TAXI_DRIVER`).
- `src/lib/` helpers: `webRouter.js` (react-router-dom shim: `useNavigate`, `useLocation` with `location.state`,
  `useParams`, `useSearchParams`, `navigate(-1)`; **import it as the replacement for `react-router-dom`**), `notify.js`
  (`toast`, `confirm` — replaces `react-hot-toast`/`sonner`/`window.confirm`), `storage.js` (`localStore`/`sessionStore`:
  synchronous localStorage/sessionStorage look-alikes — use them wherever the web uses `localStorage`/`sessionStorage`),
  `events.js` (window CustomEvent bus: `events.on/off/emit`), `images.js` (picker + compression), `links.js`
  (`openExternal`), `webShim.js` (`window`, `document`, `navigator`, `Audio`, `Image`), `useAsync.js`, `apiError.js`.
- `src/components/`: `ui.jsx` (`Press`, `Card`, `GradientButton`, `ThemedInput`), `kit.jsx` (`BottomSheet`, `Dialog`,
  `SelectField`, `ErrorView`, `AsyncView`), `Img.jsx` (resolves `/uploads` paths), `Loader.jsx`, `Skeleton.jsx`, `HtmlContent.jsx`.
- `src/theme/index.js`: `tw` (Tailwind v4 palette: web class `text-slate-500` -> `tw.slate500`), `driver` (driver.css tokens),
  `shadow('md')`, fonts `outfit(w)` (the taxi module's body font — default for driver screens), `jakarta(w)` (onboarding),
  `poppins(w)`, `inter(w)`. Android needs a family per weight, always spread a font helper into the style.
- `tools/slim.js <path under Frontend/src> [from] [to]` prints a web file with Tailwind variants that don't apply at phone
  width removed — the quickest way to read a big page. `tools/check-imports.js` lists unresolved relative imports.

## Auth (driver)
- OTP login: `requestOtp/verifyOtp(AUDIENCE.TAXI_DRIVER, ...)` -> tokens in the answer; the web then calls
  `persistDriverAuthSession({ token, role })` (already ported; stores the token in SecureStore through `AuthContext`).
  `getLocalDriverToken()` is synchronous and always current. One bearer token, **no refresh token**. A 401 /
  "jwt expired" from any taxi call emits `app:auth-stale`; `AuthContext` clears the session and the shell sends the
  driver to `/taxi/driver/login`. Web code that calls `clearDriverAuthState()` for logout works unchanged.
- `useAuth()` from `src/context/AuthContext.jsx`: `{ booting, signedIn, token, user, loginWithAuthData, logout, updateUser }`.

## The taxi API client (`src/driver/api/client.js`)
`import api from '../api/client'` (path relative to your file) is a drop-in for the web's `shared/api/axiosInstance`:
`api.get/post/put/patch/delete(path, ...)`, base `<api>/taxi`, resolves to the response BODY wrapped in the web's
"compatible view" proxy (so `res.data.results`, `res.results`, `res.data.data.results` all work as on the web) and rejects
with `{ ...responseBody, status }` or `{ message: 'Network error or server down.' }`. Calls carry the driver token
automatically except the web's public routes. File uploads: pass a `FormData` with `{ uri, name, type }` parts.
Web imports map: `@/shared/api/axiosInstance` / `../../shared/api/axiosInstance` -> `src/driver/api/client`;
`shared/api/socket` -> `src/driver/api/socket`; `react-router-dom` -> `src/lib/webRouter`; `react-hot-toast` / `sonner` ->
`src/lib/notify`; `lucide-react` -> `lucide-react-native` (same icon names); `framer-motion` -> RN `Animated` (reproduce
intent only); `@react-google-maps/api` -> `react-native-maps` + `src/driver/shared/live`; `axios` direct calls -> the client.

## Rules for porting
1. One screen per web page, same text, hierarchy, colours, spacing, radius, shadows, icons, assets, states
   (loading/empty/error/success). Nothing added, nothing dropped. Phone width only; ignore md:/lg: variants.
2. Keep the web's data logic (calls, polling intervals, socket events, payload keys, validation) unchanged. If the web
   has a bug (undefined variable, call to a route that doesn't exist), keep its behaviour, and note it in the checklist.
3. Replace only what the platform forces (section 8 of the master prompt): hover->press, `window`/`document`/`navigator`,
   `localStorage`, `<input type=file>`, browser geolocation (`expo-location`, foreground), Notification/Audio/vibrate,
   CSS animations, maps, `window.open`/`<a href>` (`openExternal`, `tel:` via `Linking`), clipboard, print/share.
4. Lists use `FlatList`/`SectionList` when long. Clean up every listener, timer, interval and socket subscription.
5. Web images/sounds: copy from `Frontend/src/modules/Taxi/assets/...` into `assets/` (keep names) and `require` them.
6. Never hardcode a URL or key: `process.env.EXPO_PUBLIC_*` only (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`,
   `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`). No mock data, no TODO placeholders.
7. Stay inside your own files. Shared infra (`src/api`, `src/lib`, `src/components`, `src/theme`, `src/context`,
   `src/driver/api`, `src/driver/services/registrationService.js`, `DriverShell.jsx`, `package.json`, `app.json`) may only get
   small additive changes — say so in your reply. Put new shared pieces in a new file with a specific name under
   `src/driver/components` or `src/driver/utils` and tell the lead.
8. Verify: `cd mobile-driver && npx eslint <your files>` (0 errors) and `node tools/check-imports.js` (nothing missing for
   your files). Don't run `expo export` (the lead does).
9. Record each route row you finish in `CONVERSION_CHECKLIST.md` only through the lead: list in your reply, per route:
   web file, native file(s), status (Built, not tested), deviations/bugs kept.

## Test login
No working driver login yet (OTP 1234 is rejected by production for the default test phone). Everything that needs a
signed-in driver is "Built, not tested"; do not guess OTPs.
