# Conversion checklist — Dima Hasao Food Partner (restaurant app)

Status values: **Verified** (run and seen working) · **Built, not tested** · **Blocked** (says why) ·
**todo** (not started; a continued run starts at the first `todo`).

## Discovered inputs

| Input | Value | Source |
| --- | --- | --- |
| Target app | Restaurant (food partner) | stated by the owner |
| Web frontend | `Frontend/src/modules/Food/pages/restaurant`, `components/restaurant` | router `components/restaurant/RestaurantRouter.jsx` |
| Backend | `Backend/` (routes under `/api/v1/food/restaurant`, `/api/v1/auth/otp`) | `Frontend/src/services/api/index.js` |
| Flutter wrapper | `flutter/Dima Hasao Tourism - Restaurant/` | `lib/config/app_config.dart` loads `https://tourismdimahasao.in/food/restaurant` |
| App name | Dima Hasao - Food Partner | wrapper `AndroidManifest.xml` |
| Package | `com.dimahsao.restaurant` | wrapper `android/app/build.gradle` |
| Version | 1.0.0, versionCode 2 | wrapper `pubspec.yaml` (1.0.0+1) |
| API base URL | `https://tourismdimahasao.in/api/v1` | `Frontend/.env`; app `.env` |
| Test login | phone `6268204871`, OTP supplied by the owner on request. A demo restaurant "Demo Test Kitchen (App Testing)" was registered for this number on 2026-10-06 through `POST /food/restaurant/register` (Haflong zone); it is **pending** until an admin approves it | owner |

## Preconditions (2026-10-06)

1. Target stated: restaurant app. OK
2. Web source, backend source and wrapper present. OK
3. Backend answers over HTTPS. OK
4. Credentials: `google-services.json` (wrapper), Maps key and Razorpay key id (`Frontend/.env`). OK
5. Login: on 2026-10-06 the owner's number `6268204871` verified with the partner audience, and the answer was
   `isRegistered: false`, `nextStep: "onboarding"`: **this number owns no restaurant**. Every signed-in API check is
   therefore still open. Needed: a number that owns an approved restaurant (the seed scripts name a default restaurant
   phone in `Backend/scripts/seed-default-credentials.js`, but its OTP goes to whoever holds that SIM), or the owner's
   go-ahead to register a test restaurant with their own number and have an admin approve it. Until then every
   signed-in screen is "Built, not tested" at best.
6. Local toolchain: JDK 17 and Android SDK already installed (paths in `MEMORY.md`). OK
7. Third-party endpoints: geocode proxy `/food/geocode/*` answered 503 on 2026-10-05 (server has no Maps key); the app
   falls back to Google with the public key (`src/api/geocode.js`). Re-check at hand-over.
8. Maps on Android: on 2026-10-06 the user app's log showed "Maps SDK for Android" not enabled for the Maps key; the
   owner said it will be enabled. Re-check with `adb logcat` once a build is on the phone. This app's package is
   `com.dimahsao.restaurant`.
9. Payment key: Razorpay key id in `Frontend/.env` is a **test** key. Whether the restaurant role takes payments at all
   is decided in the audit below.
10. Images: checked when assets are copied.

## Flutter wrapper capabilities (restaurant)

| Capability | In the wrapper | In the app | Status |
| --- | --- | --- | --- |
| Splash + icon | launcher icons, `assets/images/splashLogo.png` | same images | Built, not tested |
| Push (FCM) | `firebase_messaging`, token saved with platform `mobile` | `expo-notifications` device token (`src/lib/push.js`) → `POST /fcm-tokens/mobile/save` `{token, platform:'mobile'}`, re-saved on token refresh, sent with logout; channel `default` (the id the backend's FCM payload names); tap opens the `/restaurant/...` link | Built, not tested |
| New-order alert | `new_order_notification_util.dart`, full-screen intent, looping ringtone (`assets/audio/*.mp3`), foreground service | to be decided in the audit (sound + high-priority notification channel) | Built, not tested: `hooks/useRestaurantNotifications.js` on socket `new_order` plays bundled `restaurant_alert.mp3` (silent mode too), vibrates, local notification in background; channel `default` is MAX importance. Foreground service / full-screen intent not rebuilt (decision in MEMORY) |
| Permissions | camera, microphone, location, storage, notifications, exact alarm | each asked at first use; only those the app uses | Built, not tested: app.json has location, camera, notifications, vibrate; photos via image-picker plugin text. Microphone, storage, exact alarm, full-screen intent, foreground service dropped (unused) |
| Location | `geolocator` / `location` | `expo-location` (foreground, asked at first use; `restaurantLocation.js`) | Built, not tested |
| File upload / camera | `image_picker` | `expo-image-picker` via `utils/imageUploadUtils.js` (camera + gallery) | Built, not tested |
| Downloads | `dio` + `open_file` | the web has no file download; the only file output, the receipt, is a PDF via expo-print + share sheet (`utils/printReceipt.js`). "Download report" only emails, as on the web | Built, not tested |
| External links | `url_launcher` | `Linking` through `lib/links.js` `openExternal` (http(s), tel, mailto) | Built, not tested |
| Offline screen | full-screen "no internet" | offline banner + screen error states | Built, not tested (shared component) |
| Exit dialog | confirm on back at root | "Exit App?" confirm on hardware back at the home screen (`OrdersMain.jsx`) | Built, not tested |
| Onboarding slide | one template slide | not carried over if the web has none | Decided: not carried over (the web has no onboarding slides) | Built |
| Google sign-in, in-app update | plugins present | to be checked | Checked: the web login is phone + OTP only (`auth/GoogleCallback.jsx` has no route); no Google sign-in, in-app update not needed (store/EAS updates) | Built |

## Routes — `/food/restaurant/*` (web router `components/restaurant/RestaurantRouter.jsx`)

Shell: `<div class="restaurant-theme">` + `PartnerWorkspaceSwitcher` above every route. Bottom bars are drawn by the
pages themselves (`BottomNavOrders`, `BottomNavbar`), top bar by `RestaurantNavbar` where a page uses it.

| Route | Guard | Web file (lines) | Native file | Status |
| --- | --- | --- | --- | --- |
| `login`, `otp` | AuthRedirect | auth/Login.jsx (813) | `app/food/restaurant/{login,otp}.jsx` → `restaurant/screens/auth/Login.jsx` | Built, not tested |
| `signup` | AuthRedirect | auth/Signup.jsx (296) | — | unreachable on web: no reachable screen links to it (only the unrouted `auth/SignIn.jsx`); owner to confirm |
| `forgot-password` | AuthRedirect | auth/ForgotPassword.jsx (432) | — | unreachable on web: linked only from the unrouted `auth/SignIn.jsx`; the backend has no password login |
| `pending-verification` | none | auth/VerificationPending.jsx (454) | `app/food/restaurant/pending-verification.jsx` → `restaurant/screens/auth/VerificationPending.jsx` | Built, not tested |
| `onboarding` | none | Onboarding.jsx (3304) | `app/food/restaurant/onboarding.jsx` → `restaurant/screens/Onboarding.jsx` | Built, not tested |
| `` (home) | restaurant | OrdersMain.jsx (4994) | `app/food/restaurant/index.jsx` → `restaurant/screens/OrdersMain.jsx` + `screens/orders/{parts,lists,popups}.jsx`, hooks `hooks/pages/useOrdersMain.js`, `hooks/pages/orders/*` | Built, not tested |
| `orders/all` | restaurant | AllOrdersPage.jsx (1035) | `app/food/restaurant/orders/all.jsx` → `restaurant/screens/AllOrdersPage.jsx` | Built, not tested |
| `orders/:id` | restaurant | OrderDetails.jsx (1057) | `app/food/restaurant/orders/[id].jsx` → `restaurant/screens/OrderDetails.jsx` | Built, not tested |
| `notifications` | restaurant | Notifications.jsx (218) | `app/food/restaurant/notifications.jsx` → `restaurant/screens/Notifications.jsx` | Built, not tested |
| `delivery-settings` | restaurant | DeliverySettings.jsx (410) | `app/food/restaurant/delivery-settings.jsx` → `restaurant/screens/DeliverySettings.jsx` | Built, not tested |
| `rush-hour` | restaurant | RushHour.jsx (139) | `app/food/restaurant/rush-hour.jsx` → `restaurant/screens/RushHour.jsx` | Built, not tested |
| `menu-categories` | restaurant | MenuCategoriesPage.jsx (531) | `app/food/restaurant/menu-categories.jsx` → `restaurant/screens/MenuCategoriesPage.jsx` | Built, not tested |
| `status` | restaurant | RestaurantStatus.jsx (562) | `app/food/restaurant/status.jsx` → `restaurant/screens/RestaurantStatus.jsx` | Built, not tested |
| `explore` | restaurant | ExploreMore.jsx (2021) | `app/food/restaurant/explore.jsx` → `restaurant/screens/ExploreMore.jsx` | Built, not tested |
| `outlet-timings` | restaurant | OutletTimings.jsx (411) | `app/food/restaurant/outlet-timings.jsx` → `restaurant/screens/OutletTimings.jsx` | Built, not tested |
| `outlet-timings/:day` | restaurant | DaySlots.jsx (846) | `app/food/restaurant/outlet-timings/[day].jsx` → `restaurant/screens/DaySlots.jsx` | Built, not tested |
| `outlet-info` | restaurant | OutletInfo.jsx (515) | `app/food/restaurant/outlet-info.jsx` → `restaurant/screens/OutletInfo.jsx` | Built, not tested |
| `ratings-reviews` | restaurant | RatingsReviews.jsx (285) | `app/food/restaurant/ratings-reviews.jsx` → `restaurant/screens/RatingsReviews.jsx` | Built, not tested |
| `edit-owner` | restaurant | EditOwner.jsx (1916) | `app/food/restaurant/edit-owner.jsx` → `restaurant/screens/EditOwner.jsx` | Built, not tested |
| `edit-cuisines` | restaurant | EditCuisines.jsx (302) | `app/food/restaurant/edit-cuisines.jsx` → `restaurant/screens/EditCuisines.jsx` | Built, not tested |
| `edit-address` | restaurant | EditRestaurantAddress.jsx (661) | `app/food/restaurant/edit-address.jsx` → `restaurant/screens/EditRestaurantAddress.jsx` | Built, not tested |
| `inventory` | restaurant | Inventory.jsx (2833) | `app/food/restaurant/inventory.jsx` → `restaurant/screens/Inventory.jsx` | Built, not tested |
| `feedback` | restaurant | Feedback.jsx (701) | `app/food/restaurant/feedback.jsx` → `restaurant/screens/Feedback.jsx` | Built, not tested |
| `share-feedback` | restaurant | ShareFeedback.jsx (215) | `app/food/restaurant/share-feedback.jsx` → `restaurant/screens/ShareFeedback.jsx` | Built, not tested |
| `dish-ratings` | restaurant | DishRatings.jsx (45) | `app/food/restaurant/dish-ratings.jsx` → `restaurant/screens/SmallPages.jsx` (DishRatings) | Built, not tested |
| `fssai` | restaurant | FssaiDetails.jsx (100) | `app/food/restaurant/fssai/index.jsx` → `restaurant/screens/Fssai.jsx` (FssaiDetails) | Built, not tested |
| `fssai/update` | restaurant | FssaiUpdate.jsx (152) | `app/food/restaurant/fssai/update.jsx` → `restaurant/screens/Fssai.jsx` (FssaiUpdate) | Built, not tested |
| `hyperpure` | restaurant | Hyperpure.jsx (30) | `app/food/restaurant/hyperpure.jsx` → `restaurant/screens/SmallPages.jsx` (Hyperpure) | Built, not tested |
| `hub-menu/item/:id` | restaurant | ItemDetailsPage.jsx (1641) | `app/food/restaurant/hub-menu/item/[id].jsx` → `restaurant/screens/ItemDetailsPage.jsx` | Built, not tested |
| `hub-finance` | restaurant | HubFinance.jsx (1468) | `app/food/restaurant/hub-finance.jsx` → `restaurant/screens/HubFinance.jsx` | Built, not tested |
| `withdrawal-history` | restaurant | WithdrawalHistoryPage.jsx (198) | `app/food/restaurant/withdrawal-history.jsx` → `restaurant/screens/FinancePages.jsx` (WithdrawalHistoryPage) | Built, not tested |
| `finance-details` | restaurant | FinanceDetailsPage.jsx (643) | `app/food/restaurant/finance-details.jsx` → `restaurant/screens/FinanceDetailsPage.jsx` | Built, not tested |
| `phone` | restaurant | PhoneNumbersPage.jsx (468) | `app/food/restaurant/phone.jsx` → `restaurant/screens/PhoneNumbersPage.jsx` | Built, not tested |
| `download-report` | restaurant | DownloadReport.jsx (167) | `app/food/restaurant/download-report.jsx` → `restaurant/screens/FinancePages.jsx` (DownloadReport) | Built, not tested |
| `manage-outlets` | restaurant | ManageOutlets.jsx (144) | `app/food/restaurant/manage-outlets.jsx` → `restaurant/screens/SmallPages.jsx` (ManageOutlets) | Built, not tested |
| `update-bank-details` | restaurant | UpdateBankDetails.jsx (360) | `app/food/restaurant/update-bank-details.jsx` → `restaurant/screens/UpdateBankDetails.jsx` | Built, not tested |
| `reservations` | restaurant | DiningReservations.jsx (1167) | `app/food/restaurant/reservations.jsx` → `restaurant/screens/DiningReservations.jsx` | Built, not tested |
| `zone-setup` | restaurant | ZoneSetup.jsx (573) | `app/food/restaurant/zone-setup.jsx` → `restaurant/screens/ZoneSetup.jsx` | Built, not tested |
| `privacy` | none | PrivacyPolicyPage.jsx (23) | `app/food/restaurant/privacy.jsx` → `restaurant/screens/SmallPages.jsx` (PrivacyPolicyPage) | Built, not tested |
| `terms` | none | TermsAndConditionsPage.jsx (23) | `app/food/restaurant/terms.jsx` → `restaurant/screens/SmallPages.jsx` (TermsAndConditionsPage) | Built, not tested |
| `help-centre/support` | none | RestaurantSupport.jsx (287) | `app/food/restaurant/help-centre/support.jsx` → `restaurant/screens/RestaurantSupport.jsx` | Built, not tested |
| `help-content` | none | CMSHelpSupportPage.jsx (23) | `app/food/restaurant/help-content.jsx` → `restaurant/screens/SmallPages.jsx` (HelpContentPage) | Built, not tested |
| `add-hotel` | restaurant | shared/partner/AddHotelBusiness | — | left out: hotel business belongs to the hotel partner app |

Shared restaurant components to port: `BottomNavOrders` (117), `BottomNavbar` (92), `RestaurantNavbar` (391),
`MenuOverlay` (420), `NewOrderNotification` (256), `ResendNotificationButton` (74), `LocationSearchInput` (223),
`shared/partner/PartnerWorkspaceSwitcher`.

Files in the folder with no route (confirm unreachable before skipping): `HubMenu.jsx` (2383), `OrdersPage.jsx` (572),
`RestaurantDetailsPage.jsx` (353), `HelpCentre.jsx` (167), `AddZone.jsx` (8), `auth/OTP.jsx`, `auth/SignIn.jsx`,
`auth/SignupEmail.jsx`, `auth/GoogleCallback.jsx`.

## APIs

`restaurantAPI` methods the restaurant pages call (from `Frontend/src/services/api/index.js`; call counts in brackets):
getCurrentRestaurant (28), getOrders (16), updateProfile (12), sendOTP (6), refreshCurrentRestaurant (4),
markOrderReady (4), getMenu (4), verifyOTP (3), updateFood (3), updateAddon (3), rejectOrder (3), logout (3),
getWithdrawalHistory (3), getFinance (3), updateTakeawaySettings, updateCategory, updateAcceptingOrders,
optimisticallyUpdateOrderStatus, getPendingDiningRequest, getOrderById, getAddons, addAddon, uploadProfileImage,
uploadMenuImages, uploadMenuImage, uploadCoverImages, scheduleItemAvailability, saveOutletTimings, reverify,
resetPassword, resendDeliveryNotification, requestDiningUpdate, register, login, getSupportTickets,
getRestaurantOrderSettings, getRestaurantByOwner (web stub), getOutletTimings, getComplaints, getCategories,
getAllCategories, deleteFood, deleteCategory, deleteAddon, createWithdrawalRequest, createSupportTicket, createFood,
createCategory, completeTakeawayOrder, acceptOrder.
Others: `uploadAPI.uploadMedia` (9), `diningAPI.getRestaurantBookings` (4), `diningAPI.updateBookingStatusRestaurant`,
`diningAPI.getCategories`, `authAPI.deleteAccount`, `authAPI.checkBalance`, `authAPI.logoutFromAllDevices`,
`zoneAPI.getPublicZones`.

Per-endpoint table (base `https://tourismdimahasao.in/api/v1`; status of every row: Built, not tested, since the demo restaurant is pending and signed-in calls answer 403):

| Method | Path | App function |
| --- | --- | --- |
| POST | /auth/otp/request, /auth/otp/verify | sendOTP, verifyOTP (audience partner) |
| POST | /food/auth/refresh-token | client refresh |
| GET | /food/restaurant/current | getCurrentRestaurant, refreshCurrentRestaurant |
| GET | /food/public/restaurant-settings | platform settings |
| POST | /food/restaurant/register | register |
| PATCH | /food/restaurant/profile | updateProfile |
| PATCH | /food/restaurant/dining-settings, POST .../dining-settings/request, GET .../dining-settings/pending | updateDiningSettings, requestDiningUpdate, getPendingDiningRequest |
| PATCH | /food/restaurant/takeaway-settings, /food/restaurant/availability | updateTakeawaySettings, updateAcceptingOrders |
| GET/POST/PATCH/DELETE | /food/restaurant/categories[/:id] | get/create/update/deleteCategory |
| GET/PATCH | /food/restaurant/menu | getMenu, updateMenu |
| POST/PATCH/DELETE | /food/restaurant/foods[/:id] | createFood, updateFood, deleteFood |
| GET/POST/PATCH/DELETE | /food/restaurant/addons[/:id] | getAddons, addAddon, updateAddon, deleteAddon |
| GET/PUT | /food/restaurant/outlet-timings | getOutletTimings, saveOutletTimings |
| GET | /food/restaurant/orders, /orders/:id | getOrders, getOrderById |
| PATCH | /food/restaurant/orders/:id/status | accept / reject / markOrderReady |
| POST | /food/restaurant/orders/:id/complete-takeaway, /resend-notification | completeTakeawayOrder, resendDeliveryNotification |
| GET | /food/restaurant/finance, /withdrawals; POST /withdraw | getFinance, getWithdrawalHistory, createWithdrawalRequest |
| GET/POST | /food/restaurant/complaints, /support/tickets | getComplaints, getSupportTickets, createSupportTicket |
| DELETE | /food/restaurant/account | deleteAccount |
| GET/PATCH/DELETE | /food/notifications/inbox, /:id/read, /:id, /inbox/all | inbox |
| GET/PATCH | /food/dining/bookings/by-restaurant/:id, /bookings/:id/status; GET /food/dining/categories/public | diningAPI |
| GET | /food/zones/public | zoneAPI.getPublicZones |
| POST/DELETE | /uploads/image, /uploads | uploadAPI |
| POST/DELETE | /fcm-tokens/mobile/save, /fcm-tokens/remove/:token | saveFcmToken, removeFcmToken |

Web `restaurantAPI` methods not in the app are user-side only (getRestaurants, getRestaurantById, getMenuByRestaurantId, getPublicOffers, etc.); no restaurant page calls them.

## Auth (web)

OTP by phone: `POST /auth/otp/request` then `POST /auth/otp/verify` with `audience: "restaurant"`
(`services/api/auth.js`). Tokens are kept per module in localStorage (`restaurant_accessToken`,
`restaurant_refreshToken`, `restaurant_user`); every restaurant call carries `contextModule: "restaurant"` so the axios
interceptor sends that token. Refresh: `POST /food/auth/refresh-token`. A failed refresh raises `authRefreshFailed`
and the router sends the partner to `/food/restaurant/login`.
In the app there is one role, so the app session is the restaurant session: tokens in SecureStore (`restaurant_accessToken`, `restaurant_refreshToken`), the restaurant object in local storage (`restaurant_user`), owned by `AuthContext`; the client sends the bearer token, retries once after refresh on 401, and a failed refresh clears the session and redirects to login with a "Session expired" toast. Status pending/rejected/banned redirects to pending-verification (ProtectedRoute behaviour). Logout sends the saved push token.

## Assumptions and decisions

- Hotel side of the partner account (workspace switcher, `add-hotel`, hotel onboarding, the "What are you listing?"
  chooser's hotel options) is left out: it belongs to the hotel partner app. A newly verified number opens the
  restaurant onboarding directly; a hotel-only number gets a message to use the hotel app.
- Login: the "Restaurant Found! restore / new account" popup is unreachable on the web (`setShowRestorePopup(true)` is
  never called) and is not built.
- Home: the web's "print receipt" handler reads an undefined variable and always fails; the app prints the receipt it was meant to (`utils/printReceipt.js`, PDF → share sheet).
- Home: the table-request popup's "View Request" points at `/dining-reservations`, a path the web router does not have; the app opens `/reservations`.
- Home: `restaurantAPI.reverify()` and `getRestaurantOrderSettings()` are called by the web but never defined there, so "Reverify" ends in the web's error message and the accept timeouts stay at their defaults; reproduced as is.
- New-order alert: sound (bundled `restaurant_alert.mp3`, plays in silent mode), vibration and a local notification when the app is in the background. The old wrapper also rang through a foreground service with a full-screen intent while the app was closed; that part is not rebuilt (a closed app is alerted by the push notification only).
- Finance details: the web page calls `useMemo` without importing it, so it throws on the web; the app imports it and the page renders.
- Smooth scrolling: every web page starts the Lenis library in an effect; native scrolling needs none, so those effects are dropped by the porting tool.
- Status page dialogs: the web's icon is a broken character ("??"); a warning mark is shown in its place.
- Image upload: the web's choice between the wrapper's picker bridge and a browser file input becomes the native camera / gallery picker (`utils/imageUploadUtils.js`).
- Explore > logout also signs out of Firebase on the web (Google sign-in); the app signs in by OTP only, so that step is dropped.
- Texts that still name another brand on the web ("Zomato" in Important contacts and Finance details) are reproduced as they are; the owner may want them changed on both sides.
- Sign-in asks for the notification permission at the moment of verifying the code, because the web sends the push
  token with the verify call.

## Device test list

1. Install the release APK on a clean phone; check the icon and splash.
2. Sign in with phone + OTP. A new number goes to onboarding; the demo restaurant stays on the pending-verification screen until an admin approves it. Best test: an approved restaurant.
3. Home: new / preparing / ready / out-for-delivery lists, accept and reject an order, new-order sound and vibration, notification when backgrounded.
4. Orders > all, order details, print receipt (share sheet), table reservations, takeaway verify.
5. Menu: categories, items, inventory, item photo upload (camera and gallery), outlet timings, rush hour, delivery settings.
6. Profile pages: owner, address (location permission, map), cuisines, FSSAI, bank details, phone numbers, zone setup.
7. Finance: hub finance, withdrawal request and history, download report.
8. Ratings, feedback, notifications, help and support, privacy, terms.
9. Logout, then sign in again; close and reopen the app (still signed in); background and return; open with no network (offline banner and retry); session expiry.
10. Android back button: closes sheets and dialogs first, goes back one screen, asks "Exit App?" on the home screen.
11. Maps: confirm the map draws (needs Maps SDK for Android enabled) - check `adb logcat` for the authorisation error.
