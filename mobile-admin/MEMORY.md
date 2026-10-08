# MEMORY — Dima Hasao Admin (Expo)

Read this first, then `CONVERSION_CHECKLIST.md`, then `PORTING_GUIDE.md`.

## What this app is

Native Android app for the **admin console**: all five admin panels of the web (Food `/admin/food`, Taxi `/taxi/admin`,
Hotel `/hotel/admin`, Tours `/tours/admin`, Global `/global/admin`) behind the one email + password admin login.
Package `com.dimahsao.admin`. There is no Flutter wrapper for admin; nothing was carried over from one.

## Architecture (different from the sister apps — read before editing)

- `src/lib/tw.js`: Tailwind class strings → RN styles (twrnc + the web palette/theme tokens). Drops what does not apply
  at phone width (`md:`, `hover:` …); `flex` = row (CSS); default border colour = `--border`.
- `src/components/web.jsx`: HTML-shaped primitives with `className` (Div, Span, Button, Input, Select/Option, Img, Icon,
  Table, Overlay, ScrollDiv, Form …) emulating CSS text inheritance, grid, divide, space.
- `src/components/shadcn.jsx`: the web's shadcn ui kit with the same names/props.
- `src/components/Text.jsx`: font-weight → bundled font file mapping, `FontFamily` provider (Taxi = Inter).
- `src/lib/storage.js`: `localStorage`/`sessionStorage` globals (sync, AsyncStorage-backed); admin token keys are routed
  to SecureStore via `AuthContext`'s secret listener.
- `src/lib/webRouter.jsx`: react-router API over Expo Router; `Outlet` is a Stack.
- `src/api/client.js` (one client, admin token, refresh), `src/api/food.js` (generated from the web's `adminAPI`).
- `tools/port.js`: the codemod (web file → mirrored app file, `// PORT:` flags). `tools/units.json`: who owns which file.
- Web tree mirrored: `modules/Food/pages/admin/X` → `src/food/pages/admin/X`, etc.

## Commands

```
npm install
npx expo lint
node tools/check-imports.js
npx expo export --platform android
```
Web preview of a screen: `BROWSER=none npx expo start --web --port 8091`, screenshot with puppeteer-core (scratchpad).

## Known

- Production superadmin still uses the seed default password `admin123` (see checklist).
- `admin@gmail.com` / `admin123` is the test login.
