# Porting guide — admin web → mobile-admin (Expo)

Read this whole file before porting anything. The web admin (`Frontend/src`) is the specification:
the app must look and behave like the web **at phone width (360–412 px)**. Port, don't redesign.

## 0. Ground rules

- Expo SDK 57, React Native 0.86, JavaScript only, Expo Router (`src/app`). Node 24.
- **Do not run** `expo start`, `expo export`, Metro, Gradle, an emulator or a browser (the machine has 7 GB RAM and
  other agents are working). Allowed checks: `npx eslint <your files>`, `node tools/check-imports.js`.
- **Do not edit shared kit files**: `src/components/{web,shadcn,Text,maps,kit,ui}.jsx`, `src/lib/*`, `src/api/{client,food,auth,config}.js`,
  `src/admin/*`, `src/app/_layout.jsx`, `tools/*`. If the kit lacks something, write a helper inside your own module
  folder and report the gap in your result. (Exception: the unit that owns a module's API service files.)
- Touch only the files your unit owns (listed in `tools/units.json`) plus the route files for your unit's pages.
- Never `git commit`, `git add`, `git stash` or `git checkout`. The coordinator commits.
- Keep every API call identical to the web: same method, path, params, body, and the same response reading.
- Do not add features, screens, mock data, placeholders or TODOs. Keep the web's empty / loading / error states.
- Backend is read-only. Never change anything under `Backend/` or `Frontend/`.

## 1. Where things go

The app mirrors the web tree. `tools/port.js` does the mapping:

| Web (`Frontend/src/…`) | App (`mobile-admin/src/…`) |
| --- | --- |
| `modules/Food/pages/admin/X.jsx` | `food/pages/admin/X.jsx` |
| `modules/Food/components/admin/…` | `food/components/admin/…` |
| `modules/Taxi/modules/admin/…` | `taxi/modules/admin/…` |
| `modules/Taxi/shared/…` | `taxi/shared/…` |
| `modules/Hotel/app/admin/…`, `modules/Hotel/services/…` | `hotel/app/admin/…`, `hotel/services/…` |
| `modules/Tours/…`, `modules/Global/…` | `tours/…`, `global/…` |
| `shared/…` | `shared/…` |

Because the tree is mirrored, relative imports between ported files stay valid.

Already provided (the codemod rewrites imports to these):

| Web | App |
| --- | --- |
| `@food/api` (`services/api/index.js`): `adminAPI`, `uploadAPI`, `zoneAPI`, `supportAPI`, `notificationAPI`, `restaurantAPI.getRestaurantById` | `src/api/food.js` (same names, paths, caches) |
| `services/api/axios.js` (`apiClient`) / `axios` | `src/api/client.js` (`api.get/post/put/patch/delete`, resolves `{ data, status }`, rejects with `err.response = { status, data }`), `createApi('/prefix')` = `axios.create({ baseURL })` |
| `@food/api/config` | `src/api/config.js` |
| `@food/utils/auth`, `shared/utils/moduleAuth`, Taxi `adminSession` | `src/admin/session.js` (`getCurrentUser('admin')`, `setAuthData`, `getUnifiedAdminProfile`, …) |
| `shared/utils/adminHome`, `activeModule` | `src/admin/access.js` |
| `shared/components/admin/AdminModuleSwitcher` | `src/admin/AdminModuleSwitcher.jsx` (prop `onNavigate` closes your drawer) |
| `@food/components/ui/*` (shadcn) | `src/components/shadcn.jsx` (same component names and props) |
| `react-router-dom` | `src/lib/webRouter.jsx` (`useNavigate`, `useParams`, `useSearchParams`, `useLocation` with `state`, `Navigate`, `Outlet`, `matchPath`, `useMatch`); `Link`/`NavLink` from `components/web` |
| `sonner`, `react-hot-toast` | `src/lib/notify.js` (`toast`, `toast.success/error/info/warning/loading/dismiss`) |
| `framer-motion` | `src/lib/motion.jsx` (`motion.div` …, `AnimatePresence`) |
| `clsx`, `tailwind-merge`, `cn` | `cn` from `src/lib/tw.js` |
| `imageCompressor`, `emailValidation`, `apiError`, `brandLogo` | `src/lib/images.js`, `src/lib/emailValidation.js`, `src/lib/apiError.js`, `src/admin/brandLogo.js` |
| `localStorage` / `sessionStorage` | globals (synchronous, persisted; token keys are routed to SecureStore) |
| `window`, `document`, `navigator`, `alert` | `src/lib/webShim.js` (codemod adds the import) |

## 2. The workflow for each file

1. `node tools/port.js <path under Frontend/src>` → writes the mirrored file with every mechanical change done.
   Port shared helpers/components before the pages that use them (or all your files in one command).
2. Open the result and resolve **every** `// PORT:` comment (then delete the comment). `grep -n "PORT:" <file>` must be empty.
3. Read the web original side by side for anything the codemod cannot know (layout at phone width, DOM, files, maps).
4. Add the route files for your pages (§6).
5. `npx eslint <your files>` — 0 errors. Fix warnings that point at real bugs.

## 3. The kit (what the codemod emits)

### `src/components/web.jsx` — HTML-shaped primitives, all take `className` (+ `style`)
- Containers: `Div Section Article Aside Header Footer Main Nav Ul Ol Li Form Fieldset …` (Views). Text classes on a
  container are **inherited** by text inside it (CSS inheritance); bare strings are wrapped in Text; a container holding
  only strings and inline text (`Span`, `Strong`, …) renders as one inline Text. `onClick` makes it pressable.
- Text: `Span P H1–H6 Label Strong B Em Small Code Pre` (`truncate` → 1 line, `line-clamp-N` → N lines), `Br`, `Hr`.
- `Button` (HTML button): inside a `Form`, no type / `type="submit"` submits `onSubmit`, as in HTML.
- `Input` (`onChange(e)` with `e.target.value` string / `e.target.checked`; types `text number email password tel search
  date time datetime-local month checkbox radio`; Enter → `onKeyDown({key:'Enter'})`), `Textarea rows`,
  `Select` + `Option` / `Optgroup` (or `options=[{value,label}]`), `CheckBox`.
- `Img src className fallback` (resolves `/uploads/…`), `Icon as={LucideIcon} className="w-4 h-4 text-slate-500"`
  (the codemod imports it as `UiIcon`), `A` / `Link` (`to` / `href`).
- `ScrollDiv` (a scrolling container: padding/gap go to the content), `HScroll` (sideways row).
- `Overlay` — a hand-made `fixed inset-0` modal rendered in a Modal. Pass `onClose` (hardware back). Panel content
  that can be taller than the screen: make the panel a `ScrollDiv className="… max-h-[90vh]"`.
- `Table cols={[w1, w2, …]}` + `Thead Tbody Tr Th Td` (`colSpan` ok, no `rowSpan`): scrolls sideways like the web's
  `overflow-x-auto` table at phone width. Choose `cols` widths (px) that fit each column's content without wrapping
  (the web uses `whitespace-nowrap`): IDs 90–120, names 160–200, dates 120–150, amounts 100–120, status 110–130,
  actions = icons × 36 + 24. Drop the web's `<div className="overflow-x-auto">` wrapper around a table (Table scrolls).

Layout CSS that the bridge handles for you: `flex` (= row, as CSS), `grid grid-cols-N` + `col-span-K` (a wrapping row at
phone width; `grid-cols-1 md:grid-cols-3` is a plain column), `space-y-*`/`space-x-*`, `divide-y divide-*`, default
border colour, `sm:/md:/lg:` (dropped — the unprefixed class is the phone layout), `hover:/focus:` (dropped),
`disabled:` (applied while disabled), `fixed` (→ absolute), `sr-only`, `h-screen`.

Not handled (fix by hand): `overflow-y-auto` (→ `ScrollDiv`), `overflow-x-auto` (→ `HScroll`), gradients
(`bg-gradient-to-r from-x to-y` → `LinearGradient` from `expo-linear-gradient`), `sticky`, `truncate` on a container
(put it on the text), `ring-*` focus rings (drop), `backdrop-blur` (drop), `before:`/`after:` content, `whitespace-pre-wrap`
(text already wraps), CSS `style={{}}` values that RN rejects (`backgroundImage`, `cursor`, `'1rem'` strings, `calc()`).

### `src/components/shadcn.jsx` — the web's `@food/components/ui/*`
`Button Input Textarea Label Badge Skeleton Card CardHeader CardTitle CardDescription CardContent CardFooter Switch
Checkbox RadioGroup RadioGroupItem Tabs TabsList TabsTrigger TabsContent Dialog DialogTrigger DialogContent DialogHeader
DialogTitle DialogDescription DialogFooter DialogClose AlertDialog* Sheet SheetContent … Select SelectTrigger SelectValue
SelectContent SelectItem DropdownMenu DropdownMenuTrigger DropdownMenuContent DropdownMenuItem DropdownMenuCheckboxItem
DropdownMenuLabel DropdownMenuSeparator Popover PopoverTrigger PopoverContent` — same props as the web.
Other web ui files (calendar, date-range-calendar, carousel …): build what the page needs from `Input type="date"` and
the primitives.

### Text and fonts — `src/components/Text.jsx`
Use `Text`/`TextInput` from here (never react-native's). Font weight classes map to bundled font files. Default family is
Poppins (Food, Hotel, Tours, Global). The **Taxi** admin renders in **Inter** (`.redigo-admin-root *` in
`Taxi/index.css`): the Taxi layout wraps its content in `<FontFamily family="Inter">`.

### Toasts / confirm
`toast.success(…)` etc. from `lib/notify`. `window.confirm(msg)` is synchronous on the web: use
`if (!(await window.confirmAsync(msg))) return;` (make the handler async). `alert(msg)` works (webShim).

### Files — `src/lib/files.js`
- `<input type="file">` → a button calling `pickImage({ multiple })`, `pickDocument({ type })`, `pickSpreadsheet()`.
  They return RN upload objects `{ uri, name, type, size }` that `FormData.append()` takes like a browser `File`; preview
  with `objectUrl(file)` (= `URL.createObjectURL`). `FileReader` reading a spreadsheet → `pickSpreadsheet()` (`{ file, workbook }`,
  SheetJS workbook); reading an image as data URL → you rarely need it (upload the file object).
- Downloads (`new Blob` + `<a download>`): `saveTextFile(name, text, mime)` (CSV/TSV/JSON), `saveBase64File`,
  `saveWorkbook(wb, 'x.xlsx')` (= `XLSX.writeFile`), `tableToPdf({ filename, title, subtitle, columns, rows })` and
  `saveHtmlAsPdf(name, html)` (= jsPDF / autoTable), `printHtml(html)` (= `window.print`), `downloadAndShare(url, name)`
  (server export endpoints; sends the admin token). All open the Android share sheet. Keep the web's file names, columns
  and row values.

### Maps — `src/components/maps.jsx`
`GMap` (react-native-maps, Google provider, sized by `className`), `Marker Polygon Polyline Circle Heatmap Callout`,
`EditablePolygon points={[{lat,lng}]} onChange` (draggable vertices), `regionFor(points)`, `toLatLng/fromLatLng`,
`DEFAULT_CENTER`. The web draws zones by "each map click adds a vertex": `onPress={(e) => add(fromLatLng(e.nativeEvent.coordinate))}`.
Places search / geocoding: `geocodeAPI` from `src/api/geocode.js` (`textSearch`, `place`, `reverse`, `nearby`).
Location: `expo-location` (foreground, ask at first use).

### Charts
`recharts` → `react-native-gifted-charts` (`LineChart`, `BarChart`, `PieChart`; needs `react-native-svg`, installed). Same
data, colours and chart type; width = screen width minus the card padding.

### Lists
A paginated table (≤ 50 rows) can map rows. An unpaginated list that can grow (notifications, chat messages, logs) uses
`FlatList` with stable keys; then the page root is the FlatList (`ListHeaderComponent` for the header), not a ScrollDiv.

### Sockets
`socket.io-client` works in React Native; use the web's socket code with `src/shared/utils/socketOrigin.js` (ported by
food-orders) / the Taxi socket helper (taxi-core).

## 4. Phone-width layout rules

- The web page sits in `<main className="flex-1 overflow-y-auto">`: the codemod turns a page's root `Div` into
  `ScrollDiv`. Keep the page's root classes (`p-4 lg:p-6 bg-slate-50` …).
- Where the web has separate desktop/mobile markup (`hidden md:block` / `md:hidden`), only the mobile one shows —
  the bridge already does this; delete the desktop-only branch if it is dead weight.
- No hover: anything revealed on hover (row actions, tooltips) is shown as the web shows it on a touch device
  (usually always visible, or on tap).
- Safe areas / status bar / keyboard are handled by the shell and Modal; forms in long pages need nothing extra.
- Back: `navigate(-1)` works (router stack). The Android back button follows the web's history.

## 5. Things that differ and must be adapted

| Web | Here |
| --- | --- |
| `document.querySelector('main').scrollTo(…)` / `window.scrollTo` | a ref on the page `ScrollDiv`: `ref.current?.scrollTo({ y: 0 })`; or drop it if only cosmetic |
| `element.focus()` | `inputRef.current?.focus()` |
| `e.preventDefault()` in submit/click | keep (the event objects support it) |
| `window.open(url, '_blank')` | works (opens outside the app) |
| `window.location.reload()` | re-run the page's load function |
| `navigator.clipboard.writeText` | works |
| `setInterval` polling | keep exactly the web's intervals; clear them on unmount |
| `new Audio(src).play()` | dropped (no sound) unless the page's purpose is an alert sound |
| `<iframe>` / `<video>` | `expo-video` for video; open an iframe URL with `window.open` |
| `contentEditable` rich text | `Textarea` with the same value (HTML string) |
| `dangerouslySetInnerHTML` preview | `src/components/HtmlContent.jsx` (`<HtmlContent html={…} />`) |
| `<input type="color">` | an `Input` for the hex value + a swatch `View` showing it |

## 6. Routes (Expo Router files in `src/app`)

Mirror the web URL. Thin files only:

```jsx
// src/app/admin/food/coupons.jsx            (web: /admin/food/coupons)
export { default } from '../../../food/pages/admin/Coupons';
```
```jsx
// src/app/admin/food/orders/all.jsx         (web: <OrdersPage statusKey="all" />)
import OrdersPage from '../../../../food/pages/admin/orders/OrdersPage';
export default function Route() {
  return <OrdersPage statusKey="all" />;
}
```
- Path params: `restaurants/edit/[id].jsx` (read with `useParams()` as on the web).
- A segment that has sub-routes uses `<segment>/index.jsx` (not `<segment>.jsx` next to a `<segment>/` folder).
- Panel roots: Food `/admin/food`, Taxi `/taxi/admin`, Hotel `/hotel/admin`, Tours `/tours/admin`, Global `/global/admin`.
- Each panel's `_layout.jsx` is owned by its **core** unit:
  ```jsx
  // src/app/admin/food/_layout.jsx
  import RequireAdmin from '../../../admin/RequireAdmin';
  import AdminLayout from '../../../food/components/admin/AdminLayout';
  export default function Layout() {
    return (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    );
  }
  ```
  The ported layout renders its navbar + drawer sidebar and `<Outlet />` (from `lib/webRouter`, a Stack) for the page.
- Web redirects (`<Navigate to=… />` routes, `index` routes) become route files that render `<Redirect href=… />`
  from `expo-router`.
- `useLocation().state` works when the sender used `navigate(path, { state })`.

## 7. Shell (core units only)

At phone width the web shows a top navbar with a hamburger; the sidebar slides in as an overlay drawer (`lg:` styles
are desktop). Port exactly that: navbar → fixed top bar (respect the top safe-area inset), sidebar → a left drawer in
a Modal (or an absolutely positioned panel with a backdrop) with the same sections, icons, badges and the
`AdminModuleSwitcher` at its top. Sub-admin permission filtering of the menu and the route guard (`canAccessPath`)
must work as on the web. Logout: `useAuth().logout()` from `src/context/AuthContext.jsx`, then
`navigate('/admin/login', { replace: true })`.

## 8. What to report (your final message)

1. Files written (app paths) and route files added (path → screen).
2. Every web file of your unit you did NOT port, with the reason (e.g. dead code not reachable from a route).
3. Every web behaviour you could not reproduce, and what you did instead.
4. Kit gaps you worked around.
5. `npx eslint` result for your files (0 errors), and `grep -rn "PORT:"` over your files (empty).
