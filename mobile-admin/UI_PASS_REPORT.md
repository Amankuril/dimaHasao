# Admin app — final production UI report

Scope: the native admin app (`mobile-admin`), all five panels — Food, Taxi,
Hotel, Tours & Festivals, Global. Functionality was frozen throughout: no
backend route, controller, service, model, query, auth rule, payment, order,
delivery or notification path was touched, and no API contract changed.

## 1. Screens audited and improved

233 screens audited, 231 restyled. The two left alone are
`src/app/+not-found.jsx` and the Expo router fallback, which already use the
kit. Work was split into 22 units by import graph (`tools/units.json`) so each
agent owned a disjoint set of files; per-unit results are in
`tools/ui-reports.jsonl`.

| | |
| --- | --- |
| Screens audited | 233 |
| Screens restyled | 231 |
| Tables rebuilt on `DataTable` | 120 |
| Forms rebuilt on `Field` + `INPUT` | 135 |
| Layout bugs fixed | 175 |
| Responsive fixes | 118 |
| Loading / empty / error states added | 156 |
| Touch-target and label fixes | 116 |

## 2. Design system

`src/admin/ui.jsx`, documented in `DESIGN_SYSTEM.md`. One page background
(`#F8FAFC`), one card treatment (white, `rounded-xl`, `#E2E8F0` border, 16px
padding), one primary action colour (`#155DFC`), one status palette driven by
the status word so the same state is never two colours, and a 44px minimum
control height.

Components: `AdminPage`, `PageHeader`, `Card`, `SectionTitle`, `StatCard`,
`StatGrid`, `Toolbar`, `DataTable`/`THead`/`TBody`/`Row`/`Cell`, `StatusBadge`,
`Pagination`, `Skeleton`, `TableSkeleton`, `LoadingState`, `EmptyState`,
`ErrorState`, `Field`, plus `INPUT`/`BTN_*` class tokens, `useLayoutWidth`,
`useChartWidth`, `chartSpacing`, `AXIS_TEXT`, `formatCount` and `toneFor`.

## 3. Typography

Measured before changing anything: 13 distinct font sizes across 14 screens at
390px, including 8px and 9px labels in the reports, and five font families.

Three causes, all in shared code:

- `font-sans` (65 uses) and `font-mono` (43) resolved to CSS stacks the app
  does not bundle, so that text silently fell back to the OS font next to
  Poppins. On the taxi dashboard alone, 92 elements were affected.
- No type scale. Sizes now snap to **11, 12, 14, 16, 18, 20, 24, 28, 34**, with
  11px as the floor; the unreadable 8–9px report labels are gone.
- Taxi ran Inter plus a serif for page titles. Everything is Poppins now. This
  is a deliberate departure from the web, which runs two families — say so if
  you want Taxi kept visually distinct.

Verified after: every panel on bundled Poppins, every size on the scale.

## 4. Colour

`gray-*` and `slate-*` were used interchangeably (647 screens on `bg-slate-50`,
611 on `bg-gray-50`). They are different hues, so pages looked subtly dirty.
`colors.gray` is now aliased to the slate ramp in `src/lib/tw.js`, so both
spellings resolve to one neutral.

## 5. Layout and responsiveness

`AdminPage` applies the gutter and, on a tablet, caps and centres the content
instead of stretching a phone layout across ten inches. `StatGrid` is 1 column
on a phone, 2 from 700px, 3 from 1000px. `DataTable` columns are authored in px
for a phone, scroll sideways there, and stretch to fill on a tablet (measured
with `onLayout`, after seeing dead space on the right).

## 6. Tables

Columns sized to content, no hidden columns (the table scrolls instead), row
actions at 44px or more, a header row in the label style, `StatusBadge` for
state, and `TableSkeleton` while loading. Cells clip: a booking id was painting
over the hotel name in the column beside it.

## 7. Forms

Label, control, then error *or* hint, via `Field`. Inputs are 44px. Related
fields group into two columns from 700px. Password fields keep their visibility
toggle, now with a 44px hit area and a label.

## 8. States

Every restyled screen covers all four paths. Empty states say what is missing
and offer the next step where one exists; error states carry a Try again wired
to the loader the screen already had.

## 9. Bugs found by rendering the result

Static review cannot see these. Each was fixed once, at the shared layer:

1. **`Slot` erased the child's styles.** `cloneElement` writes an explicit
   `undefined` over a prop, so every `asChild` trigger — dropdowns, dialogs,
   popovers — lost its classes and rendered as an unstyled column. The orders
   Export button was stacked and hanging off the edge.
2. **Four taxi screens crashed into the error boundary** on
   `window.setTimeout is not a function`. Missing from `lib/webShim` since the
   conversion; pre-existing, not from this pass.
3. **Charts overflowed by exactly the y-axis label width** — gifted-charts
   draws those labels outside the width you give it. `adjustToWidth` also blew
   a single-point series up to twice the viewport.
4. **Chart axis labels used the OS font**, since the library renders a bare RN
   `Text` that bypasses `components/Text.jsx`.
5. **`import.meta.env` crashed two screens** — Vite inlines it, Metro does not
   define it.
6. **Inputs could not shrink.** A `TextInput` keeps an intrinsic width, so
   `flex-1` alone pushed the control beside it off screen on four screens.

## 10. Accessibility

Every icon-only control has an `accessibilityLabel` and a 44px target. Rows
that act as buttons carry `accessibilityRole` and a label naming the record and
its state. Breadcrumb crumbs were a 12px line of text with a tap handler; they
now have padding, `hitSlop` and a link role. No text renders below 11px.

## 11. What was deliberately not done

199 behavioural defects were found and left alone, listed in
`UI_PASS_FINDINGS.md`. The dominant pattern: dozens of screens catch a failed
fetch by setting an empty array, so "the server is down" and "you have no
records" render identically. Fixing that means adding an error flag inside a
catch block, which is a handler change.

One is worth acting on soon: **hotel › Bookings** reads `NaN` for pending
approvals because `getDashboardStats()` returns no `confirmedBookings` field.
The card now shows an em dash rather than `NaN`, but the number is still
missing.

## 12. Verification

Rendered against the live production API in headless Chrome, signed in as a
real admin. Not sampled — every route.

| | 390px (phone) | 1024px (tablet) |
| --- | --- | --- |
| Routes visited | 251 | 251 |
| Crashed into the error boundary | 0 | 0 |
| Blank screens | 0 | 0 |
| Page errors thrown | 0 | 0 |
| `body.scrollWidth` wider than the viewport | 0 | 0 |
| Elements past the right edge outside a scroller | 0 | 0 |

Deeper measurement on 26 representative routes at both widths: font sizes all
on the scale, one family, no horizontal overflow.

Caveat, stated plainly: this is the Expo **web** build in a desktop browser at
those two widths. It exercises the same JavaScript, layout and API calls as the
Android app, and the Android bundle builds clean, but it is not the same
renderer. The APK has not been installed on a physical device in this session —
`CONVERSION_CHECKLIST.md` has the 13-step on-device test list for that.

## 13. Functional-safety check

Every one of the 246 changed files was diffed against `HEAD` on its API paths,
request verbs (`get`/`post`/`put`/`patch`/`delete`), storage keys and handler
names. **Zero decreases** — nothing lost an API call, a handler or a navigation
target. Control counts were checked the same way; every apparent drop resolved
to a legitimate substitution (`<Label>` into `Field`, seven inputs factored into
one helper, pagination handlers moving into the kit component).

## 14. Build

- `npx expo lint`: **0 errors** (688 warnings, all pre-existing patterns from
  the port — effect dependency arrays and unused port-time helpers).
- `node tools/check-imports.js`: **0 missing targets**.
- `npx expo export --platform android`: succeeds, 12MB bundle.
- `./gradlew assembleRelease`: succeeds.

## 15. The APK

`apps/DimaHasao-Admin.apk` — 72MB, `com.dimahsao.admin` 1.0.0, targetSdk 36,
arm64-v8a (matching the other four apps), V2-signed with
`CN=Dima Hasao Admin`, SHA-1
`AF:8C:F2:F6:5C:13:A2:D2:C8:EF:40:D7:84:90:90:C6:F7:1F:C2:81`.

The first build of this pass produced a 141MB APK because it packed all four
ABIs; it was rebuilt arm64-only to match the rest of the suite.

## 16. Gaps left in the kit

Reported by the agents, in frequency order: no `Tabs`/segmented control, no
`DropdownMenu` or `Dialog`/`Sheet` export, no `Switch`, no select or textarea
token to match `INPUT`, no two-column form container, no inline (non-card)
variant of the state components, no rows-per-page control on `Pagination`, and
`AdminPage` is not a `forwardRef`. Each is a convenience, not a defect; screens
that needed them hand-rolled a matching style. The chart gap was closed during
this pass.

## 17. Still owed by you

- Change the production superadmin password.
- Add `com.dimahsao.admin` + the SHA-1 above to the Google Maps key
  restrictions, or map screens will render blank on device.
- Back up `~/dimahasao-keystores/admin-release.jks`. Lose it and this package
  name can never be updated.
- Supply replacement artwork for the 18 corrupt PNGs if you want them back
  (they are CRLF-damaged in the web repo since its first commit and broken on
  the live site too; they ship as 1×1 transparent placeholders so layouts keep
  their box).
