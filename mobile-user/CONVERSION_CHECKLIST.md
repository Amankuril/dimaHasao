# Conversion checklist — Dima Hasao Tourism user app

Status per row: **Verified** (ran it and saw it work) · **Built, not tested** (code written, needs the device test) ·
**Blocked** (says why) · **todo** (not started; a continued run starts at the first `todo`).

## Discovered inputs

| Input | Value | Source file |
| --- | --- | --- |
| Target app | User (consumer) | stated by the owner |
| Web frontend | `Frontend/` | `Frontend/package.json`, `Frontend/src/app/routes.jsx` |
| Backend | `Backend/` | `Backend/package.json` |
| Flutter wrapper | `flutter/Dima Hasao Tourism- User/` | `lib/config/app_config.dart` (`webUrl = https://tourismdimahasao.in/app`) |
| New app folder | `mobile-user/` | — |
| App name | Dima Hasao Tourism | wrapper `android/app/src/main/AndroidManifest.xml` (`android:label`) |
| Android package | `com.dimahsao.user` | wrapper `android/app/build.gradle` (`applicationId`) |
| Version | 1.0.0 (versionCode 2; wrapper `1.0.0+1`) | wrapper `pubspec.yaml` |
| Icon / splash | launcher mipmaps, `assets/images/splashLogo.png` | wrapper `android/app/src/main/res/mipmap-xxxhdpi/`, `assets/images/` |
| API base URL | `https://tourismdimahasao.in/api/v1` | owner; wrapper `app_config.dart` (`apiBaseUrl`); responds 200 on `/health` |
| Socket origin | `https://tourismdimahasao.in` | `Frontend/src/shared/utils/socketOrigin.js` (same origin in production) |
| Firebase config | `google-services.json` (client `com.dimahsao.user` present) | wrapper `android/app/google-services.json` |
| Google Maps key | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` | `Frontend/.env` (`VITE_GOOGLE_MAPS_API_KEY`) |
| Razorpay key id | `EXPO_PUBLIC_RAZORPAY_KEY_ID` in `.env` (a **test** key, `rzp_test…`) | `Frontend/.env` (`VITE_RAZORPAY_KEY_ID`); the API also returns the key per order |
| Test login | phone `6268204871`, OTP supplied by the owner on request | owner. Backend static OTP is governed by `USE_DEFAULT_OTP` / `DEFAULT_TEST_PHONE` (`Backend/src/core/otp/otp.service.js`) |

## Preconditions

1. Target app stated: **User** — OK
2. Frontend, backend and the user wrapper are in the repo — OK (the wrapper was added during the run)
3. Deployed HTTPS backend responds — OK
4. Credentials present: Firebase config, Maps key, Razorpay key id — OK
5. Working login: OTP to a real phone; owner provides the code — checks that need a session depend on it
6. Expo logged in: `rehan121` — OK

## Auth (how the backend works)

- `POST /auth/otp/request { audience: 'user', phone }` → `{ nextStepIfVerified }`
- `POST /auth/otp/verify { audience: 'user', phone, otp }` → either `{ nextStep: 'collect_name', signupToken }` or
  `{ accessToken, refreshToken, user, taxiAuth: { token, user } }`
- `POST /auth/otp/complete { audience: 'user', signupToken, name }` → the same session payload
- JWT bearer tokens (no cookies). Web stores `user_accessToken`, `user_refreshToken`, `user_user`, and the taxi token as
  `token` / `userToken` (+ `userInfo`) in localStorage. App: SecureStore for the three tokens, AsyncStorage for the user objects.
- Refresh: on 401 → `POST /food/auth/refresh-token { refreshToken }` → `{ accessToken }`, retry once. A refresh rejected with
  400/401/403 ends the session; a network failure does not.
- Logout: `POST /food/auth/logout { refreshToken, fcmToken?, platform? }`, then local clear.
- Session expiry: web treats a missing/expired access token as signed out. **App difference:** an expired access token is still
  restored at launch when a refresh token exists, so the first request renews it and the user stays signed in across restarts.

## State and data fetching on the web

- Tourism shell: React context (`BookingContext`) + `@tanstack/react-query` for the places and hotels lists + a small
  read-through cache (`shared/utils/apiCache.js`: TTL, stale-while-revalidate, in-flight de-dupe) inside the service files.
  Ported as-is: same context, same query defaults (`src/lib/queryClient.js`), the service files and `apiCache.js` are the web's own code.
- Food: Redux Toolkit slices + contexts + zustand. Taxi: zustand + contexts. (see those sections)

## Flutter wrapper capabilities (user-facing)

| Capability | In the wrapper | In the app | Status |
| --- | --- | --- | --- |
| Splash + app icon | native splash 2 s, launcher icons | `expo-splash-screen`, same images | Built, not tested |
| Onboarding slides | 3 slides with placeholder "Mobasket" copy from the template | Not carried over: template text for another product, and the web has no onboarding | left out (see Assumptions) |
| Push (FCM) | `firebase_messaging`, token POSTed to `/api/v1/fcm-tokens/mobile/save` | `lib/push.js`: after sign-in asks the notification permission, saves the device FCM token to the same endpoint (platform `mobile`), re-saves on token refresh, sends it with logout; channel `default` (the id the backend addresses); a tapped notification opens its `data.link` | Built, not tested (needs a real device with Play services) |
| Permissions | camera, location, microphone, photos, notifications asked up front | each asked when its feature is first used | per feature |
| Location | `geolocator` bridged to the page | `expo-location` | per feature |
| File upload / camera | `image_picker` for `<input type=file>` | `expo-image-picker` / `expo-document-picker` | per feature |
| Downloads | `dio` + `open_file` | `expo-file-system` + `expo-sharing` | per feature |
| External links / UPI intents | `url_launcher` (tel, mailto, whatsapp, upi…) | `Linking.openURL` | Built, not tested |
| Share | `share_plus` | RN `Share` | per feature |
| Offline screen | full-screen "no internet" | offline banner + each screen's error state | Built, not tested |
| Exit dialog on back at root | confirm before leaving | confirm dialog on the home screen | Built, not tested |
| Google sign-in, in-app update, SMS autofill | plugins present in the template | Web user login is OTP only (no Google); OTP boxes accept SMS autofill; in-app update not carried (Play handles updates) | n/a |

## Routes — tourism shell (`/app/*`, web `Frontend/src/modules/DimaHasao`)

Guard on the web: `/app` redirects to `/app/login` when signed out; the other `/app/*` paths have no guard of their own.

| Web route | Web file | App file | Status |
| --- | --- | --- | --- |
| `/` | redirect → `/app` | `src/app/index.jsx` | Built, not tested |
| `/app/login` | pages/LoginScreen.jsx | `app/app/login.jsx` | Built, not tested |
| `/app`, `/app/home` | pages/HomeScreen.jsx | `app/app/index.jsx` | Built, not tested |
| `/app/places` | pages/TouristPlacesList.jsx | `app/app/places/index.jsx` | Built, not tested |
| `/app/places/:id` | pages/TouristPlaceDetail.jsx | `app/app/places/[id].jsx` | Built, not tested |
| `/app/hotels` | pages/HotelListScreen.jsx | `app/app/hotels/index.jsx` | Built, not tested |
| `/app/hotels/:id` | pages/HotelDetailScreen.jsx | `app/app/hotels/[id]/index.jsx` | Built, not tested |
| `/app/hotels/:id/book` | pages/HotelBookingScreen.jsx | `app/app/hotels/[id]/book.jsx` | Built, not tested |
| `/app/packages` | pages/TourPackageListScreen.jsx | `app/app/packages/index.jsx` | Built, not tested |
| `/app/packages/:id` | pages/TourPackageDetailScreen.jsx | `app/app/packages/[id]/index.jsx` | Built, not tested |
| `/app/packages/:id/book` | pages/TourBookingScreen.jsx | `app/app/packages/[id]/book.jsx` | Built, not tested |
| `/app/festivals` | pages/FestivalListScreen.jsx | `app/app/festivals/index.jsx` | Built, not tested |
| `/app/festivals/:id` | pages/FestivalDetailScreen.jsx | `app/app/festivals/[id].jsx` | Built, not tested |
| `/app/support` | pages/HelpSupportScreen.jsx | `app/app/support.jsx` | Built, not tested |
| `/app/review` | pages/RatingReviewScreen.jsx | `app/app/review.jsx` | Built, not tested |
| `/app/bookings` | pages/MyBookingsScreen.jsx | `app/app/bookings.jsx` | Built, not tested |
| `/app/profile` | pages/ProfileScreen.jsx | `app/app/profile.jsx` | Built, not tested |
| `/app/more` | pages/MoreScreen.jsx | `app/app/more.jsx` | Built, not tested |
| `/app/book-ride`, `/app/food*` | redirects into taxi / food | `app/app/{book-ride,home}.jsx`, `app/app/food/*` | Built, not tested |
| `/legal/:slug` | shared/pages/LegalDocumentPage.jsx | `app/legal/[slug].jsx` | Built, not tested |

## Routes — food (`/food/user/*`, web `Frontend/src/modules/Food`, router `components/user/UserRouter.jsx`)

Shell: `components/user/UserLayout.jsx` → `src/food/components/FoodShell.jsx` (providers, module header, out-of-zone screen, "Fetching Location..." blocker, login-required prompt) mounted by `app/food/user/_layout.jsx`. Browsing is open; the routes below the *signed-in* line need a session (web `ProtectedRoute` → login).

Resume here: the first row that is not Built / Verified.

| Web route (`/food/user/…`) | Web page | Native file | Status |
| --- | --- | --- | --- |
| `` (Delivery tab), `takeaway` (tab) | pages/user/Home.jsx | `food/screens/Home.jsx` | Built, not tested |
| food tab bar, shell | components/user/{BottomNavigation,UserLayout}.jsx | `food/components/{shell,FoodShell}.jsx` | Built, not tested |
| `restaurants/:slug` | restaurants/RestaurantDetails.jsx | `food/screens/RestaurantDetails.jsx` + `hooks/pages/useRestaurantDetails.js` | Built, not tested |
| `restaurants`, `product/:id` | restaurants/Restaurants.jsx, ProductDetail.jsx | `food/screens/discovery/{Restaurants,ProductDetail}.jsx` | Built, not tested |
| `cart` *(signed-in)* | cart/Cart.jsx | `food/screens/Cart.jsx` + `hooks/pages/useCartPage.js` | Built, not tested |
| `cart/checkout`, `cart/select-address`, `address-selector` | cart/{Checkout,SelectAddress,AddressSelectorPage}.jsx | `food/screens/{Checkout,SelectAddress,AddressSelector}.jsx` | Built, not tested |
| `orders` | orders/Orders.jsx | `food/screens/Orders.jsx` | Built, not tested |
| `orders/:orderId` (live tracking) | orders/OrderTracking.jsx | `food/screens/OrderTracking.jsx` + `hooks/pages/useOrderTracking.js`, map `components/DeliveryTrackingMap.jsx` | Built, not tested |
| `orders/:orderId/details`, `/invoice` | orders/{UserOrderDetails,OrderInvoice}.jsx | `food/screens/{UserOrderDetails,OrderInvoice}.jsx` | Built, not tested |
| live order strip on Home | components/user/OrderTrackingCard.jsx | `food/components/OrderTrackingCard.jsx` | Built, not tested |
| `search` | search/ProfessionalSearch.jsx | `food/screens/discovery/{Search,SearchOverlay}.jsx` | Built, not tested |
| `categories`, `category/:category` | Categories.jsx, CategoryPage.jsx | `food/screens/discovery/{Categories,CategoryPage}.jsx` + `hooks/pages/useCategoryPage.js` | Built, not tested |
| `under-250` (tab) | Under250.jsx | `food/screens/discovery/Under250.jsx` | Built, not tested |
| `dining` (tab), `dining/:category`, `dining/explore/*`, `dining/coffee`, `dining/:type/:slug` | Dining*.jsx, Coffee.jsx | `food/screens/{Dining,DiningCategory,DiningExplore50,DiningExploreNear,Coffee,DiningRestaurantDetails}.jsx` | Built, not tested |
| `dining/book/:slug`, `book-confirmation`, `book-success`, policies, `edit-user`, `bookings` | dining/* | `food/screens/{TableBooking*,Table*Policy,TableEditUserPage,MyBookings}.jsx` | Built, not tested |
| `offers`, `gourmet`, `collections`, `collections/:id` | Offers.jsx, Gourmet.jsx, Collections*.jsx | `food/screens/discovery/*` | Built, not tested |
| `profile` (tab) | profile/Profile.jsx | `food/screens/Profile.jsx` | Built, not tested |
| `profile/edit` | profile/EditProfile.jsx | `food/screens/profile/EditProfile.jsx` | Built, not tested |
| `profile/{payments,payments/new,payments/:id/edit,favorites,coupons,about,report-safety-emergency,accessibility,logout,refer-earn,dining-bookings,settings,support}` | profile/* | `food/screens/profile/*` | Built, not tested |
| `profile/{terms,privacy,refund,shipping,cancellation,support-info}` | profile/* (CMS) | `food/screens/profile/*` via `components/profile/PolicyPage.jsx` | Built, not tested |
| `help`, `help/orders/:orderId`, `complaints/submit/:orderId` | help/*, complaints/* | `food/screens/{Help,OrderHelp,SubmitComplaint}.jsx` | Built, not tested |
| `notifications`, `wallet` | Notifications.jsx, Wallet.jsx | `food/screens/{Notifications,Wallet}.jsx` | Built, not tested |
| `auth/login`, `auth/sign-in`, `auth/otp`, `auth/callback` | redirect to the shared login | handled by `/app/login` | Left out (redirects) |

All food routes are built. None has been opened on a device: the build machine has no Android SDK, and production has no restaurants, so only empty states can be seen there.

## Routes — taxi (`/taxi/user/*`, web `Frontend/src/modules/Taxi/modules/user`, router `TaxiApp.jsx`)

Guard: signed-in user (`TaxiShell` redirects to `/app/login`). Every row is built; nothing is left at `todo`.

| Web route (`/taxi/user/…`) | Web page | Native file | Status |
| --- | --- | --- | --- |
| shell + guard | TaxiApp.jsx | `taxi/components/TaxiShell.jsx`, `app/taxi/user/_layout.jsx` | Built, not tested |
| `` (Home) | pages/Home.jsx, components/ServiceGrid.jsx | `app/taxi/user/index.jsx` → `taxi/screens/Home.jsx` (logic `taxi/hooks/useTaxiHome.js`) | Built, not tested |
| `ride/select-location` | ride/SelectLocation.jsx | `app/taxi/user/ride/select-location.jsx` | Built, not tested |
| `ride/select-vehicle` | ride/SelectVehicle.jsx | `app/taxi/user/ride/select-vehicle.jsx` → `taxi/screens/SelectVehicle.jsx` + `hooks/useSelectVehicle.js` | Built, not tested |
| `ride/searching` | ride/SearchingDriver.jsx | `app/taxi/user/ride/searching.jsx` + `hooks/useSearchingDriver.js` | Built, not tested |
| `ride/tracking` | ride/RideTracking.jsx | `app/taxi/user/ride/tracking.jsx` → `taxi/screens/RideTracking.jsx` + `hooks/useRideTracking.js` | Built, not tested |
| `ride/complete` | ride/RideComplete.jsx | `app/taxi/user/ride/complete.jsx` → `taxi/screens/RideComplete.jsx` + `hooks/useRideComplete.js` | Built, not tested |
| `ride/chat` | ride/Chat.jsx | `app/taxi/user/ride/chat.jsx` | Built, not tested |
| `ride/detail/:id` | ride/RideDetail.jsx | `app/taxi/user/ride/detail/[id].jsx` → `taxi/screens/RideDetail.jsx` | Built, not tested |
| `support` | ride/Support.jsx | `app/taxi/user/support/index.jsx` → `taxi/screens/Support.jsx` | Built, not tested |
| `intercity` | intercity/IntercityHome.jsx | `app/taxi/user/intercity/index.jsx` | Built, not tested |
| `intercity/vehicle` | intercity/IntercityVehicle.jsx | `app/taxi/user/intercity/vehicle.jsx` → `taxi/screens/IntercityVehicle.jsx` (+ `taxi/hooks/useIntercityVehicle.js`) | Built, not tested |
| `intercity/details` | intercity/IntercityDetails.jsx | `app/taxi/user/intercity/details.jsx` → `taxi/screens/IntercityDetails.jsx` (+ `taxi/hooks/useIntercityDetails.js`, `taxi/utils/places.js`) | Built, not tested |
| `intercity/confirm` | intercity/IntercityConfirm.jsx | `app/taxi/user/intercity/confirm.jsx` → `taxi/screens/IntercityConfirm.jsx` (+ `taxi/hooks/useIntercityConfirm.js`) | Built, not tested (scheduling a ride creates a real booking; not run) |
| `activity` | Activity.jsx, components/activity/* | `app/taxi/user/activity.jsx` → `taxi/screens/Activity.jsx` + `hooks/useActivity.js` | Built, not tested |
| `profile`, `profile/settings`, `profile/addresses`, `profile/notifications` | Profile.jsx, profile/* | `taxi/account/screens/*` | Built, not tested |
| `profile/payments`, `profile/delete-account` | profile/{PaymentSettings,DeleteAccount}.jsx | `taxi/screens/{PaymentSettings,DeleteAccount}.jsx` | Built, not tested |
| `wallet`, `notifications`, `promo`, `referral` | Wallet.jsx, Notifications.jsx, PromoCodes.jsx, Referral.jsx | `taxi/account/screens/*` | Built, not tested |
| `safety/sos` | safety/SOSContacts.jsx | `taxi/screens/SOSContacts.jsx` | Built, not tested |
| `support/tickets`, `support/ticket/:id` | support/* | `taxi/screens/{SupportTickets,SupportTicketDetail}.jsx`, `taxi/services/supportTicketService.js` | Built, not tested |
| `terms`, `privacy`, `refund`, `cancellation` | redirects to `/legal/:slug?module=taxi` | `app/taxi/user/{terms,privacy,refund,cancellation}.jsx` | Built, not tested |
| auth pages, Onboarding, SplashScreen, SelectCategory | pages/auth/*, … | not routed for the user app (login is `/app/login`) | Left out |

## Left out (scope)

| What | Why |
| --- | --- |
| `/admin/*`, `/global/*`, `/hotel/admin/*`, `/tours/admin/*`, `/taxi/admin/*`, `/food/admin/*` | admin panels (desktop) |
| `/food/restaurant/*`, `/food/delivery/*`, `/hotel/partner/*`, `/taxi/driver/*`, tours operator | other roles' apps (own wrappers) |
| DimaHasao `CartScreen`, `OrderTrackingScreen`, `RestaurantListScreen`, `RestaurantDetailScreen`, `RideBookingScreen` | not routed on the web; their paths redirect into the food / taxi modules |
| Taxi `auth/Login`, `Signup`, `VerifyOTP`, `Onboarding`, `SplashScreen`, `ride/SelectCategory` | not routed on the web (login is unified at `/app/login`) |

## APIs — tourism shell

| Method + path | Used by | Status |
| --- | --- | --- |
| POST `/auth/otp/request`, `/auth/otp/verify`, `/auth/otp/complete` | login | Built, not tested |
| GET `/food/auth/me`, POST `/food/auth/logout`, POST `/food/auth/refresh-token` | session | Built, not tested |
| GET `/platform/settings?module=`, GET `/legal/:slug?module=` | login footer, legal page | Built, not tested |
| GET `/tours/destinations`, `/tours/destinations/:id` | places | Built, not tested |
| GET `/hotel/properties`, `/hotel/properties/:id`, `/hotel/reviews/:id` (no token) | hotels | Built, not tested |
| POST `/hotel/bookings/quote`, `/hotel/bookings`, `/hotel/payments/verify`; GET `/hotel/bookings/my` | hotel booking | Built, not tested |
| GET `/tours/packages`, `/tours/packages/:id`, `/tours/offers`; POST `/tours/bookings/quote`, `/tours/bookings`, `/tours/payments/bookings/:id/order`, `…/verify`, `/tours/bookings/:id/settle`, `/tours/reviews`; GET `/tours/bookings/my` | tour packages | Built, not tested |
| GET `/festivals`, `/festivals/:id`, `/festivals/bookings/my`; POST `/festivals/bookings/quote`, `/festivals/bookings/checkout`, `…/checkout/:group/release`, `/festivals/payments/orders/:group`, `…/verify`, `…/settle`, `/festivals/bookings/:id/cancel` | festivals | Built, not tested |
| GET `/taxi/rides`, GET `/food/orders` | My Bookings | Built, not tested |
| GET/POST `/support`, POST `/support/:id/messages` | Help & support | Built, not tested |

### API checks run against the live backend (2026-10-05, test account, read-only)

All returned 200 with the shape the app's adapters read:

- Login: `POST /auth/otp/request` → `POST /auth/otp/verify` (returns `accessToken`, `refreshToken`, `user`, `taxiAuth.token`), `GET /food/auth/me`, `POST /food/auth/refresh-token` (returns a new access **and** refresh token; the app stores both).
- Lists: `GET /hotel/bookings/my` (bare array), `/tours/bookings/my`, `/festivals/bookings/my`, `/taxi/rides` (works with either token), `/food/orders`, `/support`.
- Catalogue: `GET /hotel/properties`, `/hotel/properties/:id` (`{ property, roomTypes }`), `/hotel/reviews/:id`, `/tours/packages`, `/tours/packages/:id`, `/tours/offers`, `/tours/destinations`, `/tours/destinations/:id`, `/festivals`, `/festivals/:id`.
- Quotes (compute only, nothing created): `POST /hotel/bookings/quote`, `/tours/bookings/quote`, `/festivals/bookings/quote`.
- **Not run** (they create data or take money): creating bookings, Razorpay orders / verification, support tickets, cancellations. Status for those flows stays "Built, not tested".
- The access token issued for this account is valid for years, so session expiry cannot be observed in a test run; the refresh path is covered by the direct refresh call above.
- Taxi, read-only, second pass (2026-10-05): `GET /taxi/users/me`, `/users/bootstrap`, `/users/intercity-packages` (1 package), `/users/vehicle-types`, `/users/service-locations`, `/rides/active/me` (null), `/rides?limit=5`, `/support/tickets/my`, `/users/wallet`, `/users/notifications`, `/rides/app-settings/tip` → all 200. `GET /taxi/promos/available` → 400 without `service_location_id` (the screen always sends it).
- **Geocode proxy is down on the live server**: `GET /food/geocode/reverse` and `POST /food/geocode/text-search` answer **503 "Google Maps API key is not configured on the server"**. Every address search / "pin on map" label in food and taxi depends on it (the web food pages too). The app now falls back to calling Google directly with its own public Maps key (`src/api/geocode.js`); the same requests were run from this machine with that key and returned results (Geocoding, Places text search). No backend change was made — setting the Maps key in the server environment is the proper fix (see final report).

## Shared components and tokens

| Web | App | Status |
| --- | --- | --- |
| `dimahasao.css`, Tailwind v4 palette | `src/theme/index.js` (`dh`, `tw`, fonts, shadows) | done |
| Fonts: Poppins, Montserrat, Cinzel, Playfair Display, Inter (index.html) | `@expo-google-fonts/*`, loaded in `app/_layout.jsx` | done |
| Font Awesome 6 (`<i class="fa-solid …">`) | `components/Fa.jsx` (FontAwesome6 from `@expo/vector-icons`) | done |
| layout/Header, ModuleShell header, PatternDivider | `components/dh/Header.jsx` | done |
| layout/BottomNav + shared/app/AppBottomNav (+ immersiveRoutes) | `components/dh/AppBottomNav.jsx` (one nav, mounted in the root layout) | done |
| MobileFrame toast, NotificationsDrawer | `components/dh/Overlays.jsx` | done |
| home/* (SearchBar, CategoryCard, QuickLinksGrid, PromoBanner, WhyVisitGrid) | `components/dh/home.jsx` | done |
| places/* (PlaceCard, GalleryViewer, TransportSelector) | `components/dh/places.jsx` | done |
| hotel/* (HotelCard, HotelGallery, RoomCard) | `components/dh/hotel.jsx` | done |
| repeated panel / button / stepper / field / tabs | `components/dh/ui.jsx` | done |
| Razorpay checkout.js (`Food/utils/razorpay.js`) | `lib/razorpay.js` + `components/RazorpayHost.jsx` (WebView for the payment page only) | Built, not tested |

## Web-only APIs found and their replacement

| Web | Native |
| --- | --- |
| localStorage / sessionStorage | SecureStore (tokens), AsyncStorage mirror `lib/storage.js` (rest) |
| axios | `api/client.js` (fetch, same response/error shape) |
| framer-motion | `Animated` (same intent: fades, springs, sheets) |
| OpenStreetMap iframe (place map) | `react-native-maps` (lite mode thumbnail, interactive in the dialog) |
| `navigator.geolocation` | `expo-location` (foreground) |
| `<input type="date">` | OS date picker (`@react-native-community/datetimepicker`) |
| `<select>` | bottom-sheet option list (`kit.SelectField`) |
| `window.confirm`, `window.location.reload()` | confirm dialog, query refetch |
| `tel:` / `mailto:` links | `Linking.openURL` |
| Razorpay checkout.js | WebView for that flow only |
| Web Speech API voice search (`useVoiceSearch`, mic in the food search bar) | no native equivalent without adding a speech module; the mic sits in the search pill and the pill opens the search screen, where the keyboard's own voice typing works |
| `location.state` (objects passed between pages) | `food/utils/routeState.js` in-memory hand-off; every reader also fetches |
| IntersectionObserver (lazy list, filter tabs) | scroll position (`onScroll`) |
| `createPortal` popovers (veg mode) | `Modal` anchored with `measureInWindow` |

## Assumptions and decisions

- The wrapper's onboarding slides are template placeholders ("Welcome to Mobasket"); the web app has no onboarding, so none is built.
- The login background and home hero photos (2–2.5 MB PNGs in `Frontend/public`) load from the site, as the web does, instead of being bundled.
- Hotel booking: the web keeps a `children` state with no control to change it; the app sends `children: 0` the same way.
- "Retry" on the hotels list reloads the page on the web; the app refetches the list.
- Profile > Edit: on the web `Save Changes` calls a local `login(phone)` that only rewrites the in-memory user (and resets the name to a default); nothing is sent to the API. The app keeps the edit for the session only, showing the name and phone that were typed.
- My Bookings refreshes its lists when the screen is shown and on pull-to-refresh. On the web the lists reload whenever the tourism shell remounts (returning from food / taxi); the app's shell never unmounts, so focus is the equivalent moment.
- 43 of the 146 PNGs under `Frontend/src` are damaged in the repository itself (every CR/LF byte was rewritten as CRLF at the first commit, so they no longer decode; the web shows them as broken images). Among them are the four bundled fallbacks of the food "Explore More" tiles. The app shows the admin's icons from `/food/explore-icons/public` as the web does and, where there is none, a matching line icon instead of a broken image. Fix on the web side: re-add the original PNGs with `*.png binary` in `.gitattributes`.
- Food shell: the web swaps the page for the out-of-zone screen / first-load skeleton; the app draws them over the navigator instead of unmounting it, so the stack survives a zone change.
- Food Home: the sticky search + categories header appears below the module header rather than over it.
- Uploaded images arrive as `/uploads/...` paths; `components/Img.jsx` resolves them against the site origin, as the browser does.
- Public read checks (2026-10-05): `GET /tours/destinations`, `/hotel/properties`, `/tours/packages`, `/festivals`, `/platform/settings`, `/food/admin/business-settings/public` all return 200 with the shapes the adapters expect.
- Food search: the web mic button uses the browser speech API; in the app it opens the search screen (no speech recogniser is bundled).
- Food restaurant page: the "flying thumbnail" add-to-cart animation is not ported; the cart pill updates directly.
- Food order tracking: the takeaway / dine-in progress animations are drawn as a plain status panel; delivery tracking keeps the live map.
- Food cart / address: Google Places autocomplete and the JS map are replaced by the geocode lookups and `react-native-maps` with a centre pin; `visualViewport` keyboard handling is left to the OS resize. `components/user/LocationSelectorOverlay.jsx` is not imported anywhere on the web and is not ported.
- Food `cart/checkout` reproduces a web bug: the page prices items ×83, builds a local order and then throws on an undefined `pricing`, ending on the empty-cart view. The real order flow is the Cart screen's place-order, which is ported in full.
- Food dining `explore/upto50`, `explore/near-rated` and `coffee` are static pages on the web (hard-coded lists, not linked from the UI); reproduced as they are. Hover / in-view animations are omitted.
- Taxi SOS contacts: the web seeds two mock contacts; the app starts with an empty list (no fake people in a safety screen).
- Taxi ride detail: the driver avatar shows initials when there is no photo (the web calls ui-avatars.com).
- Taxi select-vehicle: the bid slider is a − / + stepper using the same step and limits.
- Taxi date inputs (`<input type="date">`, `datetime-local`) open the Android date picker, then the time picker, clamped to the web's min / max.
- Taxi delete-account: after the request succeeds the app clears the session and returns to the login screen.
- Taxi intercity details: Google's Autocomplete widget on the two address boxes is replaced by a suggestion list under the focused box (text search biased to the trip's city); the map picker reverse-geocodes the pin with the same debounce and cache as the web. The web page returns `null` above two of its effects when the route state is missing; the hook reports that as `__guard` and the screen renders nothing while it redirects.
- Taxi images: 11 PNGs under `assets/taxi` were damaged copies from the web repo (the live site serves the same broken files, so the web shows broken images there). Android refuses to package them, so they were removed. Stand-ins for the five in use: scooty → bike icon, bus and mini bus → car icon, bus fallback → fallback car, home footer highway background → yellow-taxi photo. Replace with proper artwork when the owner has the originals.
- Deep links: the web has no app links / universal links and the wrapper declared none, so none are added. The `dimahasao://` scheme is kept only because Expo Router requires one.
- Push: a notification whose `data.link` is not a user-app path opens the app without navigating.
- Console output: only error messages from failed requests remain; the web's "TEMPORARY DEBUG LOG" lines were removed. Nothing logs tokens, OTPs or personal data.

## Device test list

Nothing below has been run: the build machine has no Android SDK / emulator. Use the test login recorded above (OTP is read out by the owner).

**Known from the first phone run (2026-10-06)**
0. Maps show blank tiles until "Maps SDK for Android" is enabled for the Maps key in Google Cloud (or an Android key for `com.dimahsao.user` is supplied). Re-check every map screen after that: taxi home, select-location, select-vehicle, tracking, intercity picker, food address selector, food order tracking.

**Start-up and session**
1. Cold start: splash → home; fonts and icons render; no blank frame.
2. Login with phone + OTP; kill and reopen → still signed in. Logout → login screen; Android back never logs out.
3. Airplane mode: offline banner shows; screens show their error state and recover on reconnect.

**Permissions (each asked only when first needed)**
4. Notifications prompt appears once after sign-in; deny → app keeps working.
5. Location prompt on first "use current location" (food address selector, taxi home / select-location, intercity map picker).
6. Camera / photos prompt on profile photo and complaint attachment.

**Tourism shell**
7. Hotels list → detail → quote → booking form (stop before paying). Packages and festivals the same.
8. My Bookings tabs load and pull-to-refresh works. Support ticket list opens.

**Food**
9. Home loads for the saved address; change address via search and via map pin (checks the geocode fallback).
10. Restaurant page: add / remove items, variants sheet, cart pill; cart totals match the web for the same items.
11. Cart → place order with **Cash on delivery only if the owner agrees to a real order**; otherwise stop at the payment sheet. Razorpay sheet opens and can be cancelled.
12. Orders list, order detail, invoice, tracking map for an existing order.
13. Dining, takeaway and under-250 tabs; search; notifications; wallet; profile edit with photo.

**Taxi**
14. Home map centres on the device; pick drop on map and by search.
15. Select vehicle: fares load, schedule picker respects limits, promo list loads. Stop before "Book" unless a real ride is intended.
16. Intercity: choose package → vehicle (date / time pickers, passenger stepper) → details (suggestions under each box, map picker, current-location button) → stop before "Proceed".
17. Activity list and ride detail for the two past rides; support tickets list; wallet; SOS contacts add / remove; payments; legal pages.
18. Searching / tracking / complete / chat screens need a live ride with a driver app — test together with a driver device.

**System**
19. Keyboard never covers the focused input or the submit button (login, addresses, complaint, ticket reply, intercity details).
20. Double-tap on any submit button sends one request.
21. Push: send a test notification from the admin panel → arrives in foreground and background; tapping opens the app.
22. Small (360 dp) and large (412 dp) screens: no clipped text in headers, tab bars and bottom buttons.
