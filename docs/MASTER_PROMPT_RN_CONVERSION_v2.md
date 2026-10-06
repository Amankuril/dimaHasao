# Important Instructions

Enter which app you want to build in Section 0 (user app / driver app / delivery app). This is the only required input.
The backend, frontend, and Flutter wrapper source code must be in the same repository/folder, not just the dist/build folder.
A deployed HTTPS backend URL must be available in the environment/config files, not localhost.
All required credentials must be available in the frontend env, backend env, and Flutter wrapper (google-services.json, maps key, payment public key, etc.).
A working login for the target role must be available; if OTP login is used, a test/bypass OTP must be available in the backend.
If the app uses Google Maps, "Maps SDK for Android" must be enabled in Google Cloud for the maps key (a web browser key alone shows a blank map on Android).
The release build is made on this machine with the local Android SDK. No Expo/EAS account is needed.
Only one session may work on the app folder at a time, and the machine must not go to sleep during a build.


# MASTER PROMPT — MERN Web App → React Native (Expo) Android App

You are a senior React Native engineer. Convert one part of the existing React.js
web frontend in this repository into a native Android app built with Expo. This
is a conversion, not a redesign: the existing product is the specification.

The repository contains the MERN web app (React frontend + Node/Express/MongoDB
backend) and a Flutter wrapper that currently shows the web app on Android. The
Flutter wrapper is reference material only; the new app replaces it.

## 0. What the user provides

- **Target app:** `<e.g. user app / driver app / delivery app>`
- **Optional:** screenshots of the web app at phone width, or a phone connected
  with USB debugging. Use them for the comparison in section 8 if present.

Build exactly one app per run: the target app above.

## 1. How to handle missing things

This task runs in one go. Do not stop to ask questions, with one exception: the
hard stops below.

**Hard stops** — without these the conversion cannot be done correctly. Stop and
report exactly what is missing:

1. The target app is not stated **and** the repository has more than one Flutter
   wrapper (or none). If there is exactly one Flutter wrapper, that wrapper's
   app is the target: use it and record this. Otherwise do not guess.
2. The web frontend source, the backend source, or the Flutter wrapper for the
   target app is not in the repository (a build/dist folder is not source).
3. No deployed HTTPS backend URL can be found, or it does not respond. A
   localhost, LAN-IP or plain HTTP URL does not count.

**Everything else** — do not stop:

- If information is missing, search the whole repository, including config,
  build and deployment files. Use the strongest evidence, record the assumption
  in `CONVERSION_CHECKLIST.md`, and continue.
- If two sources conflict, choose the one the deployed product actually uses,
  record both, and continue.
- If one feature cannot be completed (missing credential, external service,
  unsafe backend change, no device), mark only that feature Blocked and continue
  with everything else. Never stop the whole conversion for one blocker.
- Report all assumptions and blockers in the final report.

## 2. Preconditions — check first and report

Check each item and report the result as a short list before starting section 7.
Items 1–3 are the hard stops from section 1. Items 4–10 never stop the work.

1. Target app is stated, or there is exactly one Flutter wrapper.
2. Web frontend source, backend source and Flutter wrapper are present.
3. A deployed HTTPS backend URL is found and responds.
4. Credentials the target app's features need are present in the frontend env,
   backend env or Flutter wrapper (for example `google-services.json` for push,
   a maps key, the payment public key). If one is missing, the feature that
   needs it will be Blocked.
5. A working login for the target role exists or can be created. If login is by
   OTP, a test/bypass OTP exists. If not, checks that need a login will be
   "Built, not tested".
6. **Local Android toolchain.** A JDK 17 and the Android SDK (platform,
   build-tools, NDK and CMake at the versions the installed React Native asks
   for, plus platform-tools) are installed. If they are not, install them
   yourself at user level (no admin rights: unzip a JDK and the Android
   command-line tools into the user folder, accept the licences, set
   `JAVA_HOME` and `ANDROID_HOME`) and record the paths in `MEMORY.md`. Do this
   early: the downloads take time. Do not install an emulator.
7. **Third-party endpoints on the server.** Call every backend endpoint that
   proxies an outside service (geocoding, maps, SMS, payment order creation in
   test mode). A 5xx "not configured" answer means a server credential is
   missing: report it. Build a client-side fallback only where a public client
   key makes one possible, and say so.
8. **Maps on Android.** If the app uses Google Maps: the key must work from an
   Android app, which needs "Maps SDK for Android" enabled on the key's Google
   Cloud project and no HTTP-referrer-only restriction. You cannot enable an API
   in Google Cloud yourself. Check what you can (the key answers for the APIs
   the app calls; if a phone is connected, read `adb logcat` for the Maps
   authorisation error), state the result, and if it is not confirmed put
   "enable Maps SDK for Android" first in the user's to-do list with the
   package name and the SHA-1 of each signing key.
9. **Payment keys.** Identify the gateway and say whether the public key found
   is a test key or a live key.
10. **Images.** Check that every image the target app uses decodes (see
    section 8, "Images").

## 3. Scope

- Convert only the screens, flows and APIs that belong to the target app's role.
- Do not convert the admin panel or any other desktop-only panel. Those stay on
  the web.
- Do not convert screens that belong to a different app (for example driver
  screens when the target is the user app).
- If it is unclear whether a screen belongs to the target app, check which role
  can reach it in the web app's routing and guards, and follow that.

## 4. Discover everything else yourself

Find these in the repository. Write each one at the top of
`CONVERSION_CHECKLIST.md` with the file it came from.

- **Folders:** identify the web frontend (React), the backend (Node/Express), and
  the Flutter wrapper for the target app. Create the new app in a new folder
  named after the target, for example `mobile-user/` or `mobile-driver/`.
- **App name:** from the Flutter wrapper (`android:label` in
  `android/app/src/main/AndroidManifest.xml`, or `name` in `pubspec.yaml`).
- **Android package name:** `applicationId` in the Flutter wrapper's
  `android/app/build.gradle` (or `build.gradle.kts`). Reuse it exactly.
- **App icon and splash:** from the Flutter wrapper's Android resources/assets.
- **Version:** continue from the wrapper's `version` in `pubspec.yaml`.
- **API base URL:** the deployed production backend URL, from the env files
  (`.env*` in the frontend and backend, build or deployment config) and the URL
  the Flutter wrapper loads. Put it in the app's config/env, not hardcoded in
  screens. The app uses this URL for both testing and the release build.
- **Credentials and config files:** take them from the Flutter wrapper
  (`android/app/google-services.json`, keys in `AndroidManifest.xml`, Gradle and
  Dart config) and from the frontend env files (maps key, payment gateway public
  key, Firebase client config, and similar).
- **Secrets stay out of the app.** Only public/client-side values may go into
  it. Never copy backend secrets into the app: database URLs, JWT secrets,
  payment secret keys, FCM server keys or service-account files, SMTP/SMS
  passwords. Those stay on the backend.
- **Test login:** look for existing seed scripts, demo users or documented
  credentials for the target role. If there are none, create a test user for the
  target role using the project's own seed script or registration flow. If login
  is by OTP, use the test/bypass OTP from the backend code or env. Record the
  login in `CONVERSION_CHECKLIST.md`, never inside the app code.

## 5. Fixed decisions

- Expo (latest stable SDK), JavaScript only, no TypeScript.
- The new app has its own `package.json`. Do not upgrade or change the
  dependencies of the web frontend or the backend.
- Android only. Do not add iOS-specific work, but do not write code that blocks
  iOS later.
- Navigation: Expo Router.
- Check the installed Expo SDK version and read its versioned docs before using
  any Expo API. Do not rely on memory. Install packages with `npx expo install`.
- For every third-party SDK you add (payment gateway, maps, push), read that
  SDK's current React Native / Expo documentation before writing code against it.
- The whole target app is converted in this one task. Nothing is deferred.
- If `MEMORY.md` and `CONVERSION_CHECKLIST.md` already exist in the app folder,
  this is a continued run: read `MEMORY.md` first, then continue from the first
  unfinished row of the checklist. Do not start over.
- Never wrap the web app in a WebView. A WebView is allowed only for a single
  third-party flow that has no usable native SDK.
- Builds are local (section 16). Do not use EAS Build and do not create an Expo
  project or account.
- Only one session works on the app folder at a time. If you find another
  session writing to it, stop that work from colliding before continuing.

## 6. MEMORY.md — required

Create `MEMORY.md` in the new app folder at the start of the work and keep it
updated as you go, not only at the end. If the session ends midway, this file
must already describe the project correctly. The task is not complete without
it.

It is the project's long-term memory: what any future session needs to know to
continue working on this app without re-reading the whole codebase. Write facts
and decisions, not a history of what you did.

It must contain:

1. **What this app is:** target app/role, and the paths of the web frontend,
   backend and Flutter wrapper it was converted from.
2. **Discovered inputs:** app name, package name, version, API base URL, and
   the file each came from.
3. **Stack:** Expo SDK, React Native and Node versions, and the main libraries
   with what each is used for.
4. **Folder structure and conventions:** where screens, components, the API
   client, the theme and assets live; naming rules; how to add a new screen.
5. **Auth:** how login, token/cookie storage, refresh, logout and session expiry
   work in the app.
6. **API layer:** how to call an API, how errors and 401s are handled.
7. **Web → native decisions:** each replacement you chose (charts, maps, push,
   payments, storage, and so on) and why.
8. **Backend changes** made for the app, with file paths.
9. **Commands:** install, run, lint, and the exact local release build steps,
   including the toolchain paths and where the signing keystore lives.
10. **Known issues:** everything Blocked or Built-not-tested, and what is needed
    to finish each one.
11. **Assumptions** made where information was missing or conflicting.

Rules:

- Never write passwords, tokens, API keys or other secrets in it. Say where a
  credential lives (file name), not its value.
- Keep it short and current. When something changes, update the existing line
  instead of adding a new one.
- `CONVERSION_CHECKLIST.md` tracks per-screen and per-API status;
  `MEMORY.md` explains how the project works. Do not duplicate one in the other.

## 7. Audit first, code second

Before writing any app code, read the web frontend, the backend routes it calls,
and the Flutter wrapper. Then add to `CONVERSION_CHECKLIST.md`:

1. Every route/screen that belongs to the target app, with its guard.
2. **Every shell and layout wrapper around those routes.** For each route, list
   the components that wrap the page in the router (shells, layouts, providers
   that draw UI such as a module header, a divider, a bottom bar). They are part
   of the screen. A page built without its shell is incomplete.
3. Every API call those screens make: method, path, payload, response shape.
4. How auth actually works in the backend: login, token or cookie, where it is
   stored, refresh, logout, expiry.
5. Shared components, design tokens (colors, fonts, spacing, radius, shadows),
   assets.
6. The Flutter wrapper's user-facing native capabilities: push notifications,
   permissions, deep links, file handling, camera, location, downloads,
   payments, splash, app icon, back button behavior. Do not reproduce its
   WebView implementation details.
7. Every web-only API or library in use (see section 9).
8. The state management and data-fetching approach the web uses (store, context,
   query/caching library, pagination, refetch rules), so the app keeps the same
   behavior.
9. Screens you left out as admin/desktop-only or belonging to another app, so the
   user can confirm the scope.
10. **Unreachable UI.** Do not build UI that can never appear on the web: state
    whose "open" setter is never called, components imported but not rendered,
    blocks hidden at phone width, old screens whose route now redirects. List
    them as "unreachable on web" so the user can confirm.

Keep this file updated as you work. It is the record that nothing was dropped.

## 8. UI source of truth

The design specification is **the web app as it renders at phone width
(360–412px)**. That is what users see today inside the Flutter wrapper.

- If you can run the web frontend and inspect it in a browser, do so at 360px,
  390px and 412px, including the important states (loading, empty, error, open
  menus and dialogs). Use the rendered result as the visual reference, compare
  each native screen against it, and correct differences in spacing, typography,
  sizing and hierarchy. If you cannot, use the responsive source code and
  existing assets as the reference and continue.
- Where the web code has separate desktop and mobile layouts, build the mobile
  one and ignore the desktop one.
- Reproduce at that width: screens, hierarchy, navigation pattern (if the web
  shows a hamburger menu, drawer or bottom bar on mobile, build that), colors,
  fonts, font sizes and weights, spacing, radius, shadows, icons, images, text
  and labels.
- **Port what is actually rendered.** For each section of a page, build the
  component the page really renders, with that component's own defaults,
  ordering and fallbacks. When a page and a child component both define
  defaults, the child's are what the user sees.
- **Text is not shortened.** If the web lets a line wrap, the app lets it wrap;
  truncate only where the web truncates.
- Tables and wide content: reproduce what the web does at phone width.
- Reproduce existing loading, empty, error and success states as they are.
- Reproduce existing animations in their intent. Add none.

**Images.**

- Every image that works on the web is copied into the app unchanged: same file,
  same crop and fit as the web shows it.
- Before bundling, verify that each image file decodes. Repositories sometimes
  hold damaged files (for example PNGs corrupted by line-ending conversion); the
  web shows those as broken images, and Android refuses to package them.
- For a damaged or missing image: first look for a good copy (the deployed
  site, the Flutter wrapper, another folder of the repository). If there is
  none, replace it with a new image that fits the same slot: same subject,
  same size and aspect ratio, same style as its neighbours. Prefer another
  valid asset of the same set; otherwise make a simple clean one. Never ship a
  broken image and never leave the slot empty.
- List every replaced image in `CONVERSION_CHECKLIST.md` (original path, why,
  what replaced it) so the owner can supply the real artwork later.

**Visual comparison is a required step, not an optional one.** After the screens
are built, compare the main screens of every module against the web at phone
width, using the best means available, in this order:

1. The user's screenshots (section 0): compare each one with the same native
   screen.
2. A phone connected with USB debugging: install the build, capture each
   screen with `adb exec-out screencap`, and compare it with the web at the
   same width.
3. If neither is available, compare the source structure screen by screen and
   run the text-coverage check in section 15. Then list, in the final report,
   the screens the user should screenshot for a second pass.

For each screen, check in particular: the shell (header, bottom bar), the order
and number of items in lists and grids, wrapped versus truncated text, image
crop, and anything fixed to the top or bottom. Fix what differs and record what
was compared and how.

Do not add anything the web app does not have: screens, features, flows,
onboarding, dark mode, biometric login, analytics, ads, new navigation patterns.
When unsure whether to change something, do not change it.

## 9. Web-only code and its native replacement

Change only what the platform forces: touch instead of hover, safe areas, status
bar, keyboard avoidance, Android back button following the web's navigation flow,
FlatList/SectionList for long lists.

When a shell draws a header below the status bar, the screens under it must not
add the top safe-area inset again.

**Authentication.** Keep the backend's existing auth contract; do not invent a
new auth system.

- If the backend uses JWT/bearer tokens, use the same tokens, refresh and expiry
  rules, and store them in SecureStore.
- If the backend uses HTTP-only cookies, keep them: persist and send the session
  cookie from the native API client.
- Send tokens in a header only if the backend already accepts that, or with the
  smallest additive backend change allowed by section 11.
- Do not assume cookies or tokens persist. Verify that the session survives an
  app restart and is sent on every request, using whatever mechanism the
  installed React Native/Expo version actually provides. If you cannot verify
  it at runtime, mark login persistence "Built, not tested".

**Payments.** If the web app takes payments through a gateway:

- Use the gateway's official native SDK for React Native. Read its current
  documentation first, including its Expo / config-plugin instructions, and
  follow them (the app is built with a native project, so native modules are
  allowed).
- Keep the web's payment flow exactly: the same backend calls to create and
  verify the order, the same amounts, the same success and failure handling.
  Only the checkout sheet changes from the web script to the native SDK.
- Only the public key goes into the app. The secret key stays on the backend.
- Use a WebView for the payment page only if the gateway has no usable native
  SDK, and say why.
- Never take a real payment while testing. Use the gateway's test mode if the
  project has a test key; otherwise mark the flow "Built, not tested".

**Maps.** Use the native map component with the Android maps key in the app
config. See precondition 8: the key must be enabled for Maps SDK for Android.
Place search and geocoding use the same service the web uses; if the web's
JavaScript SDK did that work in the browser, call the equivalent web service
with the public key or the backend's proxy.

| Web | Native |
|---|---|
| localStorage / sessionStorage | SecureStore for tokens, AsyncStorage for the rest |
| CSS / Tailwind / UI libraries | StyleSheet plus one shared theme file built from the web's tokens |
| Web dialog, select, dropdown, popover | Native equivalents built to look like the web ones |
| Fonts | The same font family and weights, bundled in the app |
| Icons | The React Native package of the same icon set the web uses |
| Chart libraries | SVG-based charts with the same data, colors and chart type |
| Sockets / realtime | The same client library the web uses, if it supports React Native |
| Maps | A native map component showing the same markers, routes and controls |
| Browser geolocation | Native location, foreground only unless the web or wrapper tracks in background |
| QR / barcode scan or display | Native camera scanner; SVG-based QR rendering |
| Video / audio | Native media player |
| Rich text editor / HTML content | Native HTML renderer for display; an editor component only if the target app edits rich text |
| window.print / PDF generation | Native print and share sheet |
| File download / Excel or CSV export | File system plus share sheet |
| `<input type="file">` | Document picker / image picker / camera |
| Web push | Native push, only if the web app or Flutter wrapper already has push |
| Web payment checkout | The gateway's native SDK (see "Payments" above) |

For anything not listed, use the closest maintained Expo-compatible library that
gives the same behavior and appearance, and list it in the final report.

Add a dependency only when this section or a wrapper feature needs it. Request
only the Android permissions the app actually uses.

If a feature needs a credential that is in neither the Flutter wrapper nor the
env files, build the feature, mark it Blocked, and say exactly which file or key
is missing.

## 10. Mobile behavior

These apply to every screen. They are behavior, not new UI.

- **Network:** every request has a timeout. A screen must never stay on a
  loading spinner forever; on failure show the web's error state with its retry.
  Never auto-retry POST/PUT/PATCH/DELETE.
- **Forms:** the keyboard must not cover the active input. Use the right
  keyboard type for each field (email, number, phone). Keep the web's validation
  rules exactly. Block double-submit while a request is in progress.
- **Back button:** it closes an open modal, dropdown or keyboard first, then
  goes back one screen. On the root screen it follows the existing app. It never
  logs the user out.
- **Permissions:** request each one when its feature is first used, not at
  startup. If the user denies it, the feature shows a clear message and the rest
  of the app keeps working.
- **Push** (only if it already exists): register the device token with the
  backend, update it when it changes, and handle a notification received in the
  foreground, in the background, and tapped while the app is closed.
- **Deep links** (only if they already exist): handle them both when the app is
  closed and when it is open, and send logged-out users to login first.
- **Crashes:** add one app-level error boundary so a screen crash shows a simple
  "something went wrong / retry" screen instead of a blank one.
- **Logs:** no console logs of tokens, passwords, OTPs or personal data in the
  release build. Remove the web's temporary debug logs. Do not put anything
  secret in `EXPO_PUBLIC_*` variables.

## 11. Backend

The app uses the same backend, database and APIs. Treat the backend as
read-only.

- Do not change existing routes, response shapes, models, auth or business logic.
- Only when native functionality cannot work otherwise, make the smallest
  backward-compatible additive change (for example saving a device push token,
  accepting a token in a header where the web used a cookie, CORS/origin
  handling). It must not break the web app.
- If the change needed is larger than that or cannot be made safely, do not make
  it: mark the feature Blocked, describe the change needed, and continue.
- A missing server credential or setting (for example a maps key that is not in
  the server environment) is not a code change: report it for the owner to set.
- List every backend change in the final report.

## 12. App structure

- One API client: base URL from config, auth handling, timeout, token refresh,
  unified error handling, 401/session-expiry handling. No API logic duplicated in
  screens.
- Keep the web app's state management approach where practical. Do not add a new
  state library without need.
- One theme file for all tokens. Shared components for anything used on more than
  one screen.
- HTTPS only. No mock data, fake APIs, placeholder screens or TODOs for existing
  functionality.

## 13. Performance

Before the final checks, review the app once for these and fix what you find:

- Long lists rendered without FlatList/SectionList, or with unstable keys.
- The same API called more than once for one screen, or polling the web app
  does not do.
- Large images loaded at full size where a small one is shown.
- Listeners, timers or socket subscriptions that are never cleaned up.
- Dependencies and permissions that ended up unused.

Do not change the UI or add features for performance. Add memoization only where
you can point to a real re-render problem.

## 14. Feature parity and status

Every in-scope web feature and every user-facing Flutter wrapper capability must
exist in the app, either identically or adapted per sections 9–10. Each row in
`CONVERSION_CHECKLIST.md` ends with one status:

- **Verified**: you ran it and saw it work.
- **Built, not tested**: code is written; needs the user's device test.
- **Blocked**: cannot be completed; say why and what is needed.

Never mark something Verified that you did not run.

## 15. Checks before handing over

Run these in order and fix what they find:

1. Lint passes.
2. `npx expo-doctor` reports no problems, and the Expo config resolves.
3. The Android JS bundle builds (`npx expo export --platform android`).
4. Every bundled image decodes (section 8, "Images").
5. **Text coverage.** Extract the visible strings (JSX text, placeholders,
   labels) of every in-scope web file and confirm each one exists in the app.
   For every string that is absent, give the reason (web-only, unreachable,
   desktop-only) or build what is missing.
6. API checks against the backend with the test login:
   - Read (GET) calls: test freely.
   - Create/update/delete calls: test only with the test account and only on
     data that account created. Do not modify or delete data you did not create.
   - Never trigger a real payment, refund, or a message/notification to real
     users. Use the gateway's test mode if the project is configured for it;
     otherwise mark those flows "Built, not tested".
7. The local release build compiles (section 16).
8. If a phone is connected with USB debugging: install the release APK, walk
   through the screens, do the visual comparison of section 8, and read
   `adb logcat` for errors (maps authorisation, missing permissions, crashes).
   If no phone is connected, mark device-only checks "Built, not tested". Do
   not install or use an emulator.

The user does the final on-device testing. Write a "Device test list" section in
`CONVERSION_CHECKLIST.md`: the screens and flows to walk through, in order,
including login, logout, session expiry, no-network, uploads, downloads and the
Android back button. Also include: install the release APK on a clean phone,
check icon and splash, close and reopen the app (still logged in), send the app
to the background and bring it back, and open it with no network.

## 16. Build — local, on this machine

No cloud build service is used.

- Configure `app.json` (name, package, version, icon, splash from section 4).
- Generate the native project with `npx expo prebuild --platform android`. The
  `android/` folder is build output: keep it out of git.
- **Windows:** the native build fails from a long path (the 260-character
  limit shows up as a ninja "build.ninja still dirty" error). Build from a short
  path such as `C:\app` (a real copy of the project, kept in sync; a `subst`
  drive does not work). Tell the user not to let the machine sleep during a
  build.
- **Signing.** A release needs one permanent keystore:
  - If the app already has a release keystore (from an earlier build or from
    the published app), use that one. An app published with one key can only be
    updated with the same key.
  - Otherwise create one release keystore once. Store it and its passwords
    outside the repository (for example in the user's home folder, with the
    passwords in the user-level `gradle.properties`), never in git and never in
    `MEMORY.md`. Tell the user to back it up: if it is lost, the published app
    can never be updated.
  - Do not sign a release with the debug key.
- Build both outputs with Gradle and say which is for what:
  - `assembleRelease` → the APK, for installing on phones and testing.
  - `bundleRelease` → the AAB, for uploading to Play Store.
- Copy both files to a `dist/` folder in the app (kept out of git) and give
  their full paths in the final report.
- If the build fails, read the error, fix the cause and build again. When
  images or resources were removed, clear the generated resource folders before
  rebuilding.
- Print the SHA-1 of the release key (and of the debug key if the user will
  test debug builds): the user needs it for Google Cloud / Firebase key
  restrictions.
- Record the exact build steps and the toolchain paths in `MEMORY.md`.

## 17. Final report

Keep it short:

1. Target app, and the inputs discovered (app name, package, API URL, folders)
   with where each came from.
2. Screens in scope / screens converted, and screens left out with the reason.
3. APIs found / APIs integrated.
4. Auth: how it works in the app.
5. Flutter wrapper capabilities and how each was carried over.
6. Native replacements made (section 9) and dependencies added, with why.
   Include the payment SDK used and whether its key is test or live.
7. Backend changes, if any, and any server settings the owner must add.
8. Assumptions you made where information was missing or conflicting.
9. Images replaced because the originals were damaged or missing.
10. What was compared visually and how; what is Verified, what is
    Built-not-tested, what is Blocked.
11. Build status, the full paths of the APK and the AAB, the keystore location
    (not its passwords), and the exact build commands.
12. What the user must do next: enable Maps SDK for Android and add the SHA-1
    fingerprints in Google Cloud / Firebase if the app uses maps, Google sign-in
    or Firebase; back up the keystore; switch the payment key to live when
    ready; the device test list.
13. Confirmation that `MEMORY.md` is complete and up to date.
