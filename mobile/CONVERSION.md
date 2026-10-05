# Conversion ledger: delivery partner app

React Native (Expo) build of the web app's **food delivery partner** module, mobile view at 390 px.
Read this file and the original conversion prompt before resuming work. Continue with the first row that is not `done`.

## Parameters

| Key | Value |
| --- | --- |
| SOURCE_DIR | `Frontend/` (Vite + React 19, JS) |
| TARGET_DIR | `mobile/` |
| REFERENCE_DIR | none |
| SCOPE | `/food/delivery` (module `Frontend/src/modules/DeliveryV2`). Other modules come later. |
| VIEWPORT | 390 |

Pre-existing dirty list (`git status --porcelain` before the first write): **empty**.

## Phase 0: discovery

**Stack.** Vite 7, React 19.2, plain JS. React Router 7, route table for this module in
`src/modules/DeliveryV2/DeliveryV2Router.jsx`, mounted at `/food/delivery/*` inside `<div class="delivery-v2-theme">`.
Tailwind v4 (`@tailwindcss/vite`, no custom `screens`). State: a zustand store (`store/useDeliveryStore.js`, persisted) plus
component state; Redux and react-query exist in the app but the delivery module does not use them. HTTP: axios instance
`src/services/api/axios.js`. Toasts: `sonner` (`<Toaster position="top-center" richColors offset="80px" closeButton />`).
Animation: framer-motion. Icons: `lucide-react` 0.555 (plus one `@heroicons/react` import). Maps: `@react-google-maps/api`.
Realtime: socket.io-client. Push: Firebase web messaging. Payments: Razorpay checkout.js.

**Theme.** `deliveryTheme.css` retheme: Tailwind blue/green/orange/indigo/teal/cyan/emerald 500-600 are repainted
`#0A4D2B` (primary), `*-50` to `#E8F2EC`, borders to `color-mix(primary 28%, white)`, gradients to primary -> strong. Fonts:
Nunito Sans everywhere, Sora on h1-h4 / `.font-black` / `.font-extrabold` (`letter-spacing: .01em`). Every `rounded-2xl` /
`rounded-3xl` gets `box-shadow: 0 10px 28px -18px rgba(17,39,67,.24)`. At <=640 px `px-6` and `p-6` become 1.1rem (17.6 px).
`main` max-width `calc(100% - 1rem)`, bottom padding 5.75rem. Inputs: border `#e8dee7`, white bg, focus ring
`0 0 0 4px rgb(21 73 139 / .15)`. All encoded in `src/theme/index.js` (`tw` = resolved palette after the remap).

**Dark mode.** The module has no toggle. `dark:` classes only apply if another module stored a dark preference in the
same browser. Decision: ship light only (see deviations).

**Session.** `localStorage` keys `delivery_accessToken`, `delivery_refreshToken`, `delivery_authenticated`, `delivery_user`.
Signed in = access token present and JWT not expired. 401 -> one refresh via `POST /food/auth/refresh-token`; a refresh
rejected with 400/401/403 clears the session and the router sends the rider to `/food/delivery/login`.

**API.** Base `VITE_API_BASE_URL` (prod `/api/v1` same-origin on tourismdimahasao.in). Body shape `{ success, message, data }`.
All delivery endpoints are in `src/services/api/index.js` `deliveryAPI` + `auth.js`; ported 1:1 to `src/api/delivery.js`.

**Env.** `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_USE_DEFAULT_TEST_PHONE`,
`VITE_DEFAULT_TEST_PHONE`, `VITE_ENABLE_RANGE_BYPASS`, `VITE_APP_MODE` -> `EXPO_PUBLIC_*`.

**Dead code (not ported).** Unreachable from the router: `components/{BottomPopup.example,FeedNavbar,BottomNavigation,
AvailableCashLimit,DeliveryRouter,DeliveryLayout,DepositPopup,GoogleMapsTracking}.jsx`, `components/ui/{GlassCard,PremiumButton}.jsx`,
`components/modals/NewOrderModal.jsx`, `components/map/RiderMarker.jsx`, `pages/auth/Signup.jsx`. `pages/auth/OTP.jsx` is
lazy-imported but no route renders it (the `otp` route renders SignIn).

## Route inventory

Web paths are under `/food/delivery`. RN files keep the same path under `src/app/food/delivery/`.

| web route | web file | RN file | status | notes |
| --- | --- | --- | --- | --- |
| `/login` | pages/auth/SignIn.jsx | food/delivery/login.jsx | done | guest only. Verified side by side: empty, filled. |
| `/otp` | pages/auth/SignIn.jsx (otp step) | food/delivery/otp.jsx | done | Verified: code entry, invalid OTP + toast, 429 lockout, restore dialog. Name step and pending panel are dead on the web (never set) and not ported. |
| `/signup` | redirect -> /login | food/delivery/signup/index.jsx | done | |
| `/signup/details` | pages/auth/SignupStep1.jsx | food/delivery/signup/details.jsx | done | Verified: empty, live email error. Exit modal ported, not yet screenshotted. |
| `/signup/documents` | pages/auth/SignupStep2.jsx | food/delivery/signup/documents.jsx | done | Verified: empty. Preview/uploading states by reading only. |
| `/pending-verification` | pages/auth/VerificationPending.jsx | food/delivery/pending-verification.jsx | done | Verified: pending, rejected with reason. Web's location.state arrives as route params. |
| `/terms`, `/profile/terms` | pages/TermsAndConditionsV2.jsx | food/delivery/terms.jsx, (app)/profile/terms.jsx re-export | done | Verified with HTML content. |
| `/privacy`, `/profile/privacy` | pages/PrivacyPolicyV2.jsx | food/delivery/privacy.jsx, (app)/profile/privacy.jsx re-export | done | Same component as terms. |
| `/help/content` | pages/CMSHelpSupportPage.jsx | food/delivery/help/content.jsx | done | Verified support variant (contacts + FAQ). |
| `/`, `/feed` | DeliveryHomeV2 tab=feed | (app)/(tabs)/index.jsx, (app)/feed.jsx -> redirect | done | Verified: idle offline, pickup sheet, drop card. Verification/summary sheets by reading. Map: react-native-maps (web preview shows a blank stand-in). |
| `/orders` | pages/OrdersV2.jsx | (app)/(tabs)/orders.jsx | done | Verified: offer collapsed and expanded. |
| `/pocket` | DeliveryHomeV2 tab=pocket (PocketV2) | (app)/(tabs)/pocket.jsx | done | Verified: wallet + guarantee rings, deposit sheet. Razorpay via WebView checkout. |
| `/history` | DeliveryHomeV2 tab=history (HistoryV2) | (app)/(tabs)/history.jsx | done | Verified: trips list. Dropdowns/bonus sheet by reading. |
| `/profile` | DeliveryHomeV2 tab=profile (ProfileV2) | (app)/(tabs)/profile.jsx | done | Verified: hub, logout dialog. Balance-warning dialog and referral share are dead on the web, not ported. |
| `/notifications` | pages/NotificationsV2.jsx | food/delivery/(app)/notifications.jsx | todo | protected |
| `/profile/details` | pages/profile/ProfileDetailsV2.jsx | (app)/profile/details.jsx | todo | |
| `/profile/reviews` | pages/profile/MyReviewsV2.jsx | (app)/profile/reviews.jsx | todo | |
| `/profile/bank` | pages/profile/ProfileBankV2.jsx | (app)/profile/bank.jsx | todo | |
| `/profile/documents` | pages/profile/ProfileDocsV2.jsx | (app)/profile/documents.jsx | todo | |
| `/help/tickets` | pages/help/SupportTicketsV2.jsx | (app)/help/tickets/index.jsx | done | Verified with two tickets. |
| `/help/tickets/create` | pages/help/CreateSupportTicketV2.jsx | (app)/help/tickets/create.jsx | done | Verified empty form. Selects open a bottom-sheet list. |
| `/help/tickets/:ticketId` | pages/help/ViewSupportTicketV2.jsx | (app)/help/tickets/[ticketId].jsx | done | Verified. |
| `/help/id-card` | pages/help/ShowIdCardV2.jsx | (app)/help/id-card.jsx | done | Verified (status pill is white-on-soft-green on the web too). |
| `/pocket/payout` | pages/pocket/PayoutV2.jsx | (app)/pocket/payout.jsx | done | Verified. |
| `/pocket/statement` | pages/pocket/PocketStatementV2.jsx | (app)/pocket/statement.jsx | done | Verified. |
| `/pocket/deductions` | pages/pocket/DeductionStatementV2.jsx | (app)/pocket/deductions.jsx | done | Verified empty state. |
| `/pocket/limit-settlement` | pages/pocket/LimitSettlementV2.jsx | (app)/pocket/limit-settlement.jsx | done | History list only (no payment on this page). |
| `/pocket/balance` | pages/pocket/PocketBalanceV2.jsx | (app)/pocket/balance.jsx | done | Verified. |
| `/pocket/cash-limit` | pages/pocket/CashLimitInfoV2.jsx | (app)/pocket/cash-limit.jsx | done | Verified. |
| `/pocket/details` | pages/pocket/PocketDetailsV2.jsx | (app)/pocket/details.jsx | done | Verified. Blurred decorative blob omitted (invisible on web; iOS has no blur filter). |
| `/earnings` | redirect -> /pocket/details | (app)/earnings.jsx | done | |
| `*` | redirect -> /food/delivery | +not-found.jsx | todo | |

Dialogs and sheets acting as screens (stay `Modal`s): restore-account popup (SignIn), PickupActionModal,
DeliveryVerificationModal, OrderSummaryModal, NewOrderCard sheet, BottomPopup (ProfileDetails), OnboardingExitModal,
delete-account / logout confirms in ProfileV2.

## Shared components

| web component | RN component | status |
| --- | --- | --- |
| sonner Toaster | components/Toast.jsx | done (verified: mobile 16 px offset, richColors, sonner icons) |
| @food/components/Loader | components/Loader.jsx (`Loader`, `Spinner`) | done |
| @food/components/ui/skeleton | components/Skeleton.jsx | done |
| AuthLegalLinks | components/AuthLegalLinks.jsx | done |
| components/ui/ActionSlider | components/delivery/ActionSlider.jsx | done (verified static; drag needs a device) |
| components/DeliveryBottomNav | components/delivery/DeliveryBottomNav.jsx | done (verified) |
| components/BottomPopup | components/delivery/BottomPopup.jsx | todo |
| components/WeekSelector | components/delivery/WeekSelector.jsx | done (calendar popover -> OS date picker) |
| components/orders/* | components/delivery/orders/* | done |
| components/modals/* | components/delivery/modals/* | done (Pickup verified on screen) |
| components/map/LiveMap | components/delivery/map/LiveMap.jsx | done (native only; needs device check) |
| shared/components/OnboardingExitModal | components/OnboardingExitModal.jsx | done |
| @food/components/user/CMSPage | components/CMSPage.jsx | done |
| @food/components/ui/{button,calendar,popover} | kit.jsx / DateField | todo |

## Structure of the signed-in app

`(app)/_layout.jsx` = web `ProtectedRoute + DeliveryRealtimeShell` (socket, rider-location sync). `(app)/(tabs)` holds the
five pages that show `DeliveryBottomNav` (feed, orders, pocket, history, profile); the nav is the tab bar.
DeliveryHomeV2's state and effects live in `delivery/DeliveryHomeContext.jsx`, gated on the focused tab like the web's
`currentTab`. Pushed pages (pocket/*, profile/*, help/*, notifications) sit on the `(app)` stack.

## Deviations and decisions

1. **Light palette only.** The delivery module has no theme switch; `dark:` variants only leak in from another module's
   stored preference. Recorded rather than built.
2. **API client returns the axios shape** (`{ data: body }`, errors carry `.response`) so screen logic ports unchanged.
3. **Storage.** `localStorage`/`sessionStorage` are synchronous in-memory mirrors (`lib/storage.js`), AsyncStorage-backed
   for local. Tokens are in SecureStore.
4. **`/uploads/image` token.** Web bug: `uploadAPI.uploadMedia` has no `contextModule`, so the axios interceptor maps
   `/uploads/image` to the *user* module and a delivery-only rider uploads without a token (the route has
   `authMiddleware`). The app has a single session and sends the rider's token. Owner to confirm.
5. **Razorpay** (Pocket deposit, limit settlement): the web's checkout.js runs in a full-screen WebView
   (`components/RazorpayHost.jsx`) with the same options and callbacks; UPI intents are handed to the OS. No native SDK.
6. **Map**: react-native-maps, Google provider on Android (and on iOS when GOOGLE_MAPS_IOS_API_KEY is set, else Apple
   Maps without the custom style). Routes from the Google Routes REST API with EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
7. **Timeouts.** Web axios timeout is 30 s; app uses the kit's 20 s (uploads 120 s).

## Substitutions

- WeekSelector "Select day": the web opens a react-day-picker calendar in a Radix popover; the app opens the OS date
  picker (@react-native-community/datetimepicker). Same result (the chosen day's week), different chrome. Owner to accept
  or ask for a hand-built calendar.
- Native `<select>` fields (vehicle type, ticket category/priority): bottom-sheet option list.
- Admin HTML (policies, CMS): WebView instead of innerHTML.
- Map: react-native-maps instead of the Google Maps JS API (see deviation 6).

## Web bugs reproduced, not fixed

1. VerificationPending `handleReapply` stores `deliverySignupDetails` / `deliveryNeedsRegistration`, then
   `clearPendingState()` deletes both, so Re-apply opens step 1 with an empty phone and the submit goes to
   `completeProfile` unless the rider is signed out (then `register` without a phone).
2. `uploadAPI.uploadMedia` token mismatch (see deviation 4) is the one place the app does not copy the web.

## Open questions

- App name, slug, scheme, bundle id (`in.tourismdimahasao.delivery`): owner to confirm.
- Native push: backend `saveFcmToken` accepts `platform: "mobile"`; native FCM needs a Firebase Android/iOS app config.

## deliveryTheme.css quirks (resolved per element; the web really renders these)

The theme file is unlayered CSS with `!important` and `[class*=...]` substring selectors, so it beats Tailwind's
layered utilities in ways the class names do not suggest:

- **Base font is Poppins, not Nunito Sans.** `.delivery-v2-theme, .delivery-v2-theme * { font-family: inherit }` comes after
  `.delivery-v2-theme { font-family: "Nunito Sans" }` with the same specificity, so the wrapper inherits the body's Poppins.
  Nunito Sans only applies inside a subtree whose root has `font-poppins` or `font-['Poppins']` (the theme rewrites those
  classes to Nunito with `!important`). Per screen: `nunito()` under such a root, `poppins()` otherwise (theme/index.js).
  Verified with getComputedStyle on /signup/details (Poppins) and /login (Nunito, root has `font-['Poppins']`).
- `.font-black` / `.font-extrabold` (and h1-h4) -> Sora, `letter-spacing: .01em` **always**; their `tracking-*` class loses.
- Substring rules also match responsive-prefixed classes that do not otherwise apply at 390 px: `sm:px-6` triggers
  `[class*="px-6"]` (VerificationPending root padding is 17.6 px, not 16).
- `[class*="p-6"]` at <=640 px also matches `gap-6` and `top-6`: those elements get `padding: 1.1rem` (17.6 px).
  `[class*="px-6"]` -> horizontal padding 17.6 px.
- `[class*="bg-orange-50"]` / `bg-green-50` / `bg-emerald-50` also match `bg-*-500`, and come later than the
  `.bg-*-500 -> primary` rule, so `bg-orange-500`, `bg-green-500`, `bg-emerald-500` paint **#E8F2EC**. `*-600` paints primary.
- `[class*="rounded-2xl"]`, `[class*="rounded-3xl"]`: shadow `0 10px 28px -18px rgba(17,39,67,.24)` and border colour
  `#E5DDC3` (visible only where the element has a border width).
- Every `input`/`textarea`/`select`: background `#fff`, border `#E8DEE7`, text `#1F1F24`; focus border `#789D8A`
  (`color-mix(primary 55%, #fff)`) + 4 px ring `rgba(21,73,139,.15)`. Overrides `bg-gray-50`, `border-gray-300`, red error borders.
- `text-blue/green/orange/emerald/indigo/teal/cyan-500|600`, `text-[#ff8100]`, `text-[#10B981]` -> primary.
- `bg-[#121212]` -> `linear-gradient(160deg, #15498b, #000)`.

## Verification method

`/tmp/claude-1000/pair.sh` (scratch, not in the repo) drives Chrome with puppeteer-core at 390x844 against the web dev
server (:5173) and the Expo web build (:8081), intercepts every `/api/v1` call with the same fixture JSON for both, and
writes a side-by-side PNG. Positions are also compared numerically with `getBoundingClientRect`. Findings so far:

- CSS block-layout margins collapse (`space-y-*` + `mt-*` take the larger value, not the sum); RN margins add. Ported
  spacing uses the collapsed value.
- sonner ignores `offset` at <=600 px and uses 16 px.
- An inline `<span>` directly inside a block `<div>` sits in a line box with the parent's strut (16 px x 1.5 = 24 px), so a
  10 px label still takes 24 px of height. `<textarea>` (inline-block) leaves 7 px of descender space below it.
- Inline elements (`<label>`, `<span>` inside a block) sit in a 24 px line box; their vertical padding does not grow it
  (ID card status pill overflows its row).
- Block siblings' `mb-*` / `mt-*` collapse to the larger value (ticket cards, trip cards, ticket footer).
- Text colour remaps apply to `text-*` only: border classes the theme does not list keep Tailwind's colours
  (`border-green-500` #00C950, `border-blue-600` #155DFC on the feed's map buttons).
- The web page scrolls by a few px when an autofocused input calls `scrollIntoView`; static layout is the reference.
- Preview-only artifacts not fixed: Chrome autofill tint on inputs with `autoComplete`, masked-view (gradient text)
  replaced by CSS `background-clip:text` on web only.

## Other recorded web behaviour

- `/legal/:slug` (platform page linked from the sign-in footer) ported as `src/app/legal/[slug].jsx`, Poppins.
- Admin HTML: `@tailwindcss/typography` is not installed, so every `prose*` class on the web is inert and the HTML
  renders with Tailwind preflight only (no margins, no bullets, inherited heading sizes). `components/HtmlContent.jsx`
  (auto-height WebView; `.web.jsx` div for the preview) applies exactly that.
