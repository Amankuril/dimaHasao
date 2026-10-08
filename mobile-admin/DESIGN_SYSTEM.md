# Admin design system (mobile-admin)

The five panels must read as one product. Everything below is already built in
`src/admin/ui.jsx` — use it instead of restyling a card, header or table per screen.

This is a **UI/UX pass only**. Never change API calls, payloads, handlers, validation,
navigation targets, state or business rules. If a screen is ugly *and* buggy, fix the looks
and report the bug.

## 1. Tokens

| | |
| --- | --- |
| Page background | `bg-slate-50` |
| Card | `bg-white rounded-xl border border-slate-200`, padding `p-4` |
| Primary action | `bg-blue-600` (pressed `blue-700`), text white |
| Secondary action | `border border-slate-300 bg-white`, text `slate-700` |
| Destructive | `bg-red-600` / text `red-600` |
| Text | title `slate-900`, body `slate-700`, secondary `slate-500`, disabled `slate-400` |
| Status | success green, warning amber, danger red, info blue — via `StatusBadge` only |
| Radius | cards `rounded-xl`, controls/buttons `rounded-lg`, pills `rounded-full` |
| Control height | 44 px (`h-11`) for inputs and buttons — the minimum touch target |
| Gutter | page `p-4`; gaps between blocks `gap-3` / `mb-4` |

`gray-*` and `slate-*` now resolve to the same ramp, so either spelling is safe — prefer `slate-*`.

**Type scale** (enforced in `components/Text.jsx`; any other size snaps to the nearest):
11, 12, 14, 16, 18, 20, 24, 28, 34. Page title `text-xl font-bold`, section `text-base font-semibold`,
body `text-sm`, labels/table headers `text-xs font-semibold uppercase tracking-wide text-slate-500`.
Never go below `text-xs`. One family app-wide (Poppins) — do not set `fontFamily` or `font-sans`.

## 2. The components

```jsx
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, StatGrid, Toolbar,
         DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination,
         LoadingState, TableSkeleton, EmptyState, ErrorState, Field,
         INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
         BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth, toneFor } from '../../admin/ui';
```

- **`AdminPage`** — the screen root (replaces the page's outer `ScrollDiv`). Scrolls, applies the
  gutter and background, and on a tablet caps the content at 900 px and centres it. `maxWidth={1200}`
  for table-heavy screens, `maxWidth={720}` for forms, `scroll={false}` when the screen owns a FlatList.
- **`PageHeader`** — breadcrumb (scrolls sideways, never clipped), title, subtitle, `actions`.
  Replaces hand-built title rows.
- **`Card` / `SectionTitle`** — the one surface treatment.
- **`StatCard` / `StatGrid`** — KPI tiles; the grid is 1 column on a phone, 2 on a tablet, 3 when wide.
- **`Toolbar`** — filter/search/action rows; wraps instead of overflowing.
- **`DataTable` + `THead` + `TBody` + `Row` + `Cell`** — `cols` are px widths authored for a phone;
  the table scrolls sideways there and **stretches to fill** on a tablet. Pick widths that fit the
  content: ids 60–110, names 150–200, dates 120–150, money 100–120, status 110–130, actions 44 per icon.
- **`StatusBadge`** — pass `status="pending"`; the colour comes from the word, so the same status is
  never two colours. `toneFor(status)` if you need the tone alone.
- **`Pagination`** — the standard prev/next + count row.
- **`LoadingState` / `TableSkeleton` / `EmptyState` / `ErrorState`** — every screen must have all four
  paths covered. Empty states say what is missing and offer the next step where one exists.
- **`Field`** — label (+ required star), control, then error *or* hint. Use `INPUT` / `INPUT_ERROR`.

## 3. Rules per screen

1. Root becomes `AdminPage`; the title block becomes `PageHeader`.
2. Every white box becomes `Card`. Remove ad-hoc shadows (`shadow-sm` on a bordered card is noise).
3. Every table becomes `DataTable` with chosen `cols`. Do not hide columns that matter —
   the table scrolls. Row actions: icon buttons at ≥ 44 px, or a `DropdownMenu` when more than two.
4. Buttons use `BTN_PRIMARY` / `BTN_SECONDARY` / `BTN_DANGER`. One primary action per screen.
   An icon-only button needs `accessibilityLabel`.
5. Inputs use `INPUT` inside a `Field`. Group related fields; two columns on a tablet via
   `useLayoutWidth()`.
6. Loading / empty / error states use the kit components — never a bare spinner or a blank screen.
7. Nothing may overflow horizontally except inside a `DataTable` or `HScroll`.
8. Charts: pass the chart a width from `useWindowDimensions()` minus the page and card padding
   (32 + 32). Axis/label text must be ≥ 11 px and `color: '#62748E'`.
9. Delete decoration that carries no meaning: empty coloured circles, duplicated search buttons,
   gradient headers, stacked shadows.

## 4. What not to do

- No new dependencies, no new screens, no removed functionality or routes.
- Do not change what a control does, only how it looks.
- Do not introduce colours outside the tokens above (module brand colours in the sidebar stay).
- Do not add animation beyond what the kit provides.
- Do not set a fixed width on anything that holds text.
