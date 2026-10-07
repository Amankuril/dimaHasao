# Delivery Partner app — design system

The rider uses this app outdoors, often one-handed, between tasks. Every
decision below favours **readability, obvious primary actions and clear
status** over decoration.

Tokens live in `src/theme/index.js` (`color`, `tone`, `type`, `space`, `radii`,
`elevation`, `touch`). Components live in `src/components/ds.jsx`. The older
`tw` palette and the `poppins()` / `ff()` / `display()` helpers still exist for
code not yet migrated. New and redesigned code uses the tokens.

## Typography

Two families only: **Nunito Sans** for text and **Sora** for titles and money.
(`poppins()` now resolves to Nunito Sans; Poppins is no longer drawn.)

| Token | Use |
| --- | --- |
| `type.display` 30 Sora | one hero amount per screen (wallet balance, weekly earnings) |
| `type.title` 22 Sora | large in-page title (rare; `ScreenHeader` uses `heading`) |
| `type.heading` 18 Sora | header titles, sheet titles, section heroes |
| `type.subheading` 16 Nunito 800 | card titles, restaurant / customer names |
| `type.body` / `bodyStrong` 15 | normal reading text |
| `type.small` 13 | addresses, supporting lines |
| `type.label` 13 bold | field labels, row labels, inline actions |
| `type.caption` 12 | timestamps, hints, badge text |
| `type.overline` 12 uppercase | short section kickers ("TODAY", "PAYMENT") — max 2-3 words |
| `type.button` 16 / `buttonSm` 14 | button labels (sentence case) |
| `type.money` 18 / `type.metric` 24 Sora | amounts in rows / HUD numbers |

Rules:
- **Minimum 12 px.** No 8/9/10/11 px text.
- **Sentence case.** Uppercase only via `type.overline`, for short kickers.
  No uppercase empty states, buttons, or sentences.
- Money uses `Money` / `SoraMoney` (Sora has no ₹ glyph; these draw it in Nunito).
- Long names/addresses: give them `numberOfLines` (2 for addresses) and
  `flex: 1, minWidth: 0` on the text container so they wrap instead of pushing
  buttons off-screen.

## Colour

Use `color.*` and `tone.*`, never raw hex in screens.

- `color.bg` (#F5F6F4) is the screen background; content sits in white `Card`s.
- `color.primary` (#0A4D2B, brand green) for the primary action, active tab,
  links. One primary-filled button per screen.
- Text: `text` → `textSecondary` → `textMuted`. `textDisabled` only for disabled.
- Status: `success`, `warning`, `danger`, `info` + their `*Soft` backgrounds.
  Use `tone.<name>` = `{ fg, bg }` for badges and banners.
- Rider state: `online` (bright green) / `offline` (grey). Offline is neutral,
  not red.
- Never communicate state by colour alone: pair it with a word or icon.

Order / payment state → tone:

| State | Tone |
| --- | --- |
| new, available | `primary` |
| accepted, picking up, on the way | `info` |
| reached / waiting / pending / processing | `warning` |
| delivered, completed, paid, approved, credited | `success` |
| cancelled, rejected, failed, debited/deduction, blocked | `danger` |
| unknown / other | `neutral` |

## Spacing, radius, elevation

- `space`: 2 4 8 12 16 20 24 32. Screen gutter `space.lg` (16). Card padding
  `space.lg`. Gap between cards `space.md`. Between sections `space.xxl`.
- `radii`: `md` 12 for buttons/inputs/icon tiles, `lg` 16 for cards,
  `xl` 24 for bottom-sheet top corners, `pill` for badges/toggles/chips.
- `elevation.card` for cards (subtle), `elevation.float` for floating map
  controls, `elevation.sheet` for bottom sheets. No other shadows.
- No gradients on surfaces. (The login hero keeps its brand artwork.)

## Components (`src/components/ds.jsx`)

- `ScreenHeader({ title, subtitle, onBack, right })` — every non-tab screen's
  top bar. In normal flow (not absolute), handles the safe area itself. Do not
  add `paddingTop: insets.top` again below it, and drop any hard-coded content
  offsets (e.g. `FIXED_HEADER_CONTENT_TOP`).
- `Button({ title, variant, size, icon, loading, disabled })` — variants
  `primary` `secondary` `outline` `danger` `dangerSoft` `ghost`; sizes `lg` 56
  (main CTA at the bottom of a screen), `md` 48, `sm` 36.
- `IconButton({ icon, label, variant })` — 44 px, label is required.
- `Card({ onPress })`, `SectionHeader({ title, action })`,
  `ListRow({ icon, title, subtitle, value, onPress, tone })`,
  `StatusBadge({ label, tone, icon })`, `EmptyState({ icon, title, message, actionLabel, onAction })`,
  `Money({ value })`, `formatINR(n)`.
- Existing kit still used: `BottomSheet`, `Dialog`, `SelectField`, `ErrorView`,
  `AsyncView` (`components/kit.jsx`), `ThemedInput` (`components/ui.jsx`).

## Layout rules

- Screen = `View flex:1 backgroundColor color.bg` → `ScreenHeader` →
  `ScrollView`/`FlatList` with `contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl + insets.bottom }}`.
- Main CTA pinned at the bottom: a white bar with `padding space.lg` and
  `paddingBottom: space.lg + insets.bottom`, top hairline border.
- Avoid `position: 'absolute'` except for overlays on the map, badges on
  icons, and FABs.
- Touch targets ≥ 44 px (`touch` = 48 preferred). Icon-only buttons need
  `accessibilityLabel`.
- Text inputs inside a screen that has a keyboard: wrap in
  `KeyboardAvoidingView` (`behavior="padding"` on iOS, `undefined` on Android
  works with `softwareKeyboardLayoutMode: resize`) or use
  `keyboardShouldPersistTaps="handled"` on the ScrollView.
- Long lists use `FlatList` with a stable `keyExtractor`.

## Frozen behaviour

UI only. Do not change API calls, payloads, navigation targets, store
actions, validation, socket events, polling, or which state shows when.
Keep every `onPress` wired to the same handler. Keep every loading / error /
empty branch; only restyle it.
