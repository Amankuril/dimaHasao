# Conversion checklist — Dima Hasao Taxi Driver (driver app)

Status: **Verified** (run, seen working) · **Built, not tested** · **Blocked** (why). Full route/API/socket audit: `AUDIT.md`.

## Discovered inputs

| Input | Value | Source |
| --- | --- | --- |
| Target app | Taxi driver | stated by the owner; also the only Taxi Driver wrapper |
| Web frontend | `Frontend/src/modules/Taxi/modules/driver/**`, router block in `Frontend/src/modules/Taxi/TaxiApp.jsx` | repo |
| Backend | `Backend/` (taxi API `/api/v1/taxi`, OTP `/api/v1/auth/otp`) | `Frontend/src/modules/Taxi/shared/api/runtimeConfig.js` |
| Flutter wrapper | `flutter/Dima Hasao Tourism - Taxi Driver/` (WebView of `https://tourismdimahasao.in/taxi/driver`) | `lib/config/app_config.dart` |
| App name | Dima Hasao Tourism - driver | wrapper `AndroidManifest.xml` `android:label` |
| Package | `com.dimahsao.taxidriver` | wrapper `android/app/build.gradle` |
| Version | 1.0.0 (versionCode 2; wrapper 1.0.0+1) | wrapper `pubspec.yaml` |
| API base URL | `https://tourismdimahasao.in/api/v1` (HTTPS, answers 200) | `Frontend/.env` + wrapper `apiBaseUrl`; app `.env` and `eas.json` production env |
| Firebase | `google-services.json` with the `com.dimahsao.taxidriver` client | wrapper `android/app/google-services.json` |
| Maps key, Razorpay key id | public client values | `Frontend/.env` → app `.env` (git-ignored) |
| Icon / splash | wrapper `mipmap-xxxhdpi/ic_launcher_*`, `assets/images/logo.png`, `splashLogo.png` | copied to `assets/` |
| Test login | **none working** — see below | |

## Preconditions (2026-10-06)

1. Target stated. OK
2. Web, backend, wrapper present. OK
3. HTTPS backend responds. OK
4. Credentials present (google-services, Maps key, Razorpay key id). OK
5. **Login: not available.** Backend env says default test phone `8962843670` / OTP `1234`, but production answers `Invalid OTP`, and that number is not a registered driver (`isRegistered:false`). OTPs were not guessed. Every signed-in check is "Built, not tested". (One OTP request was sent to that number while probing.)
6. Expo logged in as `rehan121`. OK

## Routes (`/taxi/driver/*`)

| Route | Web file | Native | Status |
| --- | --- | --- | --- |
| `login`, `reg-phone` | registration/PhoneRegistration | screens/PhoneRegistration | Built, not tested |
| `otp-verify` | registration/OTPVerification | screens/OTPVerification | Built, not tested |
| `step-personal` / `step-vehicle` / `step-documents` | registration/Step* | screens/Step* | Built, not tested |
| `registration-status`, `status` | RegistrationStatus, ApplicationStatus | screens/RegistrationStatus, ApplicationStatus | Built, not tested |
| `home`, `dashboard` | DriverHome | screens/DriverHome (+ IncomingRideRequest, DriverRideRequestListener, HomeMap) | Built, not tested |
| `active-trip` | ActiveTrip | screens/ActiveTrip (+ useActiveTrip, TripMap, TripPhaseSheets) | Built, not tested |
| `chat` | shared ride Chat | screens/Chat | Built, not tested |
| `wallet` | DriverWallet | screens/DriverWallet (+ DriverRazorpayCheckout WebView) | Built, not tested (no payment triggered) |
| `incentives` | DriverIncentives | screens/DriverIncentives | Built, not tested |
| `profile`, `profile/bank-details`, `edit-profile` | DriverProfile, DriverBankDetailsPage, EditProfile | screens/ | Built, not tested |
| `history` | RideRequests | screens/RideHistory | Built, not tested |
| `documents`, `notifications`, `referral`, `delete-account`, `security` | settings/* | screens/ | Built, not tested |
| `support`, `help-support`, `support/chat`, `support/tickets`, `support/ticket/:id` | settings/Support*, user/support/* | screens/ | Built, not tested |
| `vehicle-fleet`, `vehicle-fleet/edit/:vehicleId` | VehicleFleet | screens/VehicleFleet | Built, not tested |
| `/legal/:slug` (terms/privacy) | shared LegalDocumentPage | app/legal/[slug] | Built, not tested |

**Left out:** user, admin, owner/fleet, pooling/bus and service-centre routes (other roles/apps); `RegistrationDashboard`, `PortalSupportPage`, `DriverDashboard` (not routed / empty on the web); `LowBalanceModal` (ported, mounted nowhere, as on the web).

## Auth
Phone + 4-digit OTP, audience `taxi-driver` (`POST /auth/otp/request|verify`). One bearer JWT, **no refresh token**; stored in SecureStore (`driver_accessToken`), non-secret web keys in AsyncStorage-backed `localStore`. Token sent on every taxi call except the web's public routes. Any 401 / "jwt expired" → `app:auth-stale` → session cleared → login. Logout is client-side, as on the web. Persistence across restart: Built, not tested.

## Flutter wrapper capabilities

| Capability | Wrapper | App | Status |
| --- | --- | --- | --- |
| Push (FCM) | token → `/fcm-tokens/mobile/save` | device FCM token → `POST /taxi/drivers/fcm-token {token, platform:'android'}` (same `fcmTokenMobile` field), channel `default`; tap opens `/taxi/driver/...` link | Built, not tested |
| Ride-request alert | looping sound via FCM util; wrapper ignored `type:'ride_request'` (silent) | socket `rideRequest` → looping `ride-request-alert.mp3` (silent mode too), vibration, MAX-priority local notification when backgrounded | Built, not tested |
| Background location / service | foreground service only logged location, never posted it | foreground only (as the web's loops). Foreground service + background location **not** added | Built, not tested — decision: add `startLocationUpdatesAsync` foreground service if drivers must stay online with screen off |
| Permissions | camera, mic, location, storage, notifications, exact alarm… | location, camera, notifications, vibrate only | Built, not tested |
| Splash / icon | launcher + splash | same images | Built, not tested |
| Offline screen | full-screen | offline banner (shared) | Built, not tested |
| Exit dialog | on back at root | hardware back on home does nothing (web's pushState trap) | Decision: not carried over |
| In-app update, downloads, onboarding slides, overlay | present / unused | not carried over (EAS builds; web has none) | n/a |

## Native replacements / dependencies
`react-native-maps` (Google JS map), `expo-location`, `expo-audio` + Vibration (alerts), `expo-image-picker` + `expo-image-manipulator` (documents, selfie, photos), `@react-native-community/datetimepicker`, `react-native-webview` (Razorpay checkout only), `expo-notifications`, `expo-secure-store`, `socket.io-client`, `simplify-js` (trip route simplification), `@expo-google-fonts/outfit|plus-jakarta-sans`. Contact picker: web feature-detects `navigator.contacts` (never present in the wrapper) so the native button is disabled the same way; `expo-contacts` not added.

## Backend changes
None.

## Assumptions / web bugs kept
- Only the driver role is converted; owner/pooling/bus branches are dead on the web.
- Production JWT lifetime unknown (local env 7y, code default 15m).
- Kept as on the web: `claimDriverIncentiveReward` is never defined (claiming throws), route-booking toggle references an unimported `updateDriverProfile`, bidding events never emitted, `DriverHome` navigates to active-trip before server confirms accept, ActiveTrip simulation panel always shown, fixed "2 mins" ETA, OTP compared client-side, `/support/*` 403 for pending drivers, `OTPVerification` reads a `payload.driver` the API never returns (login always passes via registration-status).
- Typography: Plus Jakarta Sans has no 900 weight (800 used).

## Checks
- Lint: 0 errors (warnings are react-hooks/React-Compiler advisories). Pass
- `npx expo-doctor`: 21/21. Pass
- `npx expo export --platform android`: OK. Pass
- API checks with login: **not run** (no working login). Unauthenticated: OTP request returns 200.
- Device / emulator: not run. Local Android build: not run (EAS cloud build used).

## Device test list
1. Install APK; splash → login. 2. Enter driver phone → OTP → lands on home (or registration-status if unapproved). 3. New driver: personal → vehicle → documents (camera + gallery) → submit → status. 4. Close and reopen: still signed in. 5. Home: allow location + notifications; go online; map shows you. 6. Receive a ride request with app open, in background, and screen locked: sound, vibration, notification, accept/reject. 7. Active trip: arrive → OTP start → complete → payment (cash / QR) → rating. 8. Chat with rider; call via dialer; SOS. 9. Wallet: view, withdraw, top-up in Razorpay **test mode** only. 10. Incentives, history, notifications, referral share, bank details, documents re-upload, vehicle edit. 11. Support chat and tickets. 12. Profile photo, edit profile. 13. Logout → login. 14. Session expiry (invalid token) → back to login with toast. 15. Airplane mode: offline banner, error states. 16. Android back button on every screen. 17. Delete account (OTP) on a throwaway account only.
After the build: add the new build's SHA-1 in Firebase / Google Cloud (Maps key restrictions, FCM).
