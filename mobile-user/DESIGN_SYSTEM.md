# User app (Dima Hasao Tourism) — design system

One heritage look across all three modules (tourism, food, taxi): deep-green
headers with gold Cinzel titles, a warm cream page, white cards with a beige
edge, brand-green actions and gold highlights. Readability and an obvious
primary action come before decoration.

Tokens: `src/theme/index.js` (bottom: `color`, `tone`, `type`, `space`, `radii`,
`elevation`, `touch`). Components: `src/components/ds.jsx`. Screen header:
`Header` from `src/components/dh/Header.jsx` (the heritage bar). The older
`tw`, `dh`, `poppins()`, `montserrat()`, `inter()`, `cinzel()`, `playfair()`
helpers still exist for code not yet migrated; redesigned code uses tokens.

## Typography

Three families, each with one job:

| Family | Token(s) | Only for |
| --- | --- | --- |
| **Cinzel** (caps by design) | `type.heroSerif` 24, `type.titleSerif` 17, `type.sectionSerif` 15 | hero / banner titles, header titles, section titles |
| **Playfair italic** | `type.tagline` 13 | the one-line tagline under a header / hero title |
| **Poppins** | everything else | all reading text, labels, buttons, prices |

(`montserrat()` and `inter()` now return Poppins.)

| Token | Use |
| --- | --- |
| `heading` 18 / 700 | sheet, dialog and detail-page titles (names of hotels, restaurants, places) |
| `subheading` 16 / 600 | card titles, names |
| `body` / `bodyStrong` 14 | reading text |
| `small` 13 | addresses, descriptions, supporting lines |
| `label` 13 / 600 | field labels, chips, inline actions |
| `caption` 12 | timestamps, hints, badge text |
| `overline` 12 caps | 1–3 word kickers only |
| `button` 15 / `buttonSm` 13 | button labels — sentence case ("View rooms", "Book now") |
| `price` 18 / `priceLg` 26 | prices and totals |

Rules:
- **Minimum 12 px.** No 8–11 px text.
- **Sentence case** for buttons, badges, chips, empty states and sentences.
  Uppercase appears only through Cinzel titles (they are caps by design) and
  `type.overline` kickers. No `letterSpacing` on Poppins except overline.
- Long names / addresses: `numberOfLines` (2 for addresses) and a text
  container with `flex: 1, minWidth: 0`.

## Colour

Use `color.*` / `tone.*`, never raw hex in screens.

- Page: `color.bg` (cream). Content in white `Card`s (`color.surface`, beige `color.border`).
- `color.primary` (brand green) for the main action, selected chips/tabs, links.
  One primary-filled button per screen.
- `color.primaryDeep` for dark heritage surfaces (header, hero banners, the login panel).
- **Gold** is the accent: ornaments (leaves, `StripeBorder`/`PatternDivider`),
  ratings (`tone.gold`), offers/featured badges, and the `gold` button for a
  premium or hero CTA on a dark surface. Gold text on light backgrounds uses
  `color.goldText` (AA contrast); never gold-on-white for body text.
- Text: `text` → `textSecondary` → `textMuted`; `textDisabled` only when disabled.
- Status: `success`, `warning`, `danger`, `info` + `*Soft`; `tone.<name>` = `{ fg, bg }`.
- **Veg / non-veg marks** (`color.veg`, `color.nonVeg`): FSSAI symbols — keep
  their meaning and shape; never use red/green for anything that could be
  confused with them on food screens.
- Never show state by colour alone; pair with a word or icon.

State → tone:

| State | Tone |
| --- | --- |
| booked / confirmed / placed / accepted / ongoing / on the way | `info` |
| pending / processing / preparing / searching / awaiting payment | `warning` |
| completed / delivered / paid / approved / refunded / checked-out | `success` |
| cancelled / failed / rejected / expired | `danger` |
| featured / offer / rating / premium | `gold` |
| new / available / selected | `primary` |
| other | `neutral` |

## Spacing, radius, elevation

- `space`: 2 4 8 12 16 20 24 32. Screen gutter 16, card padding 16, gap
  between cards 12, between sections 24.
- `radii`: `md` 12 buttons/inputs/tiles, `lg` 16 cards, `xl` 24 sheet tops and
  hero images, `pill` chips/badges.
- `elevation.card` / `elevation.float` / `elevation.sheet` only. No other shadows.
- Gradients only on photo overlays (dark scrim for text over images) and the
  existing heritage hero art. No gradient buttons or cards.

## Icons

- Tourism screens use Font Awesome (`Fa`, solid); food and taxi use lucide.
  Don't mix the two families inside one screen.
- ds components take an icon component; wrap Font Awesome with
  `fa('fa-solid fa-hotel')`.
- Sizes: 18–20 in rows/buttons, 22–24 standalone, 14 in chips/badges.

## Components (`src/components/ds.jsx`)

`Button` (primary · gold · secondary · outline · danger · dangerSoft · ghost;
lg 54 / md 48 / sm 36), `IconButton` (44 px, label required), `Card`,
`SectionHeader` (Cinzel + gold leaf), `ListRow`, `StatusBadge`, `Chip` +
`ChipRow`, `SegmentedControl`, `EmptyState`, `Money`, `formatINR`, `fa()`.
Header: `Header` (props `title`, `subtitle`, `showBack`, `onBack`,
`rightAction`, `right`). Kit: `BottomSheet`, `Dialog`, `SelectField`,
`ErrorView`, `AsyncView` (`components/kit.jsx`).

## Layout

- Screen = `View flex:1 bg color.bg` → `Header` → `ScrollView`/`FlatList`
  with `padding: space.lg`, `gap: space.md`, bottom padding including
  `insets.bottom` (+ the bottom nav height where one shows).
- Pinned bottom CTA bar: white, hairline top border, `padding space.lg`,
  `paddingBottom: space.lg + insets.bottom`; price on the left, primary
  button on the right for booking/checkout screens.
- No hard-coded header offsets; avoid `position: 'absolute'` except over
  images/maps, badges, FABs and the floating cart/nav.
- Touch targets ≥ 44 px; icon-only buttons need `accessibilityLabel`.
- Forms: labels above inputs (48 px tall, `radii.md`, `color.border` at rest,
  `color.primary` focused), error text `color.danger` `type.small`;
  `KeyboardAvoidingView` / `keyboardShouldPersistTaps="handled"`.
- Long or unbounded lists → `FlatList` with a stable key.
- Photos: rounded `radii.lg`, a fixed aspect ratio, a dark gradient scrim when
  text sits on them, and a muted placeholder if the image is missing.

## Frozen behaviour

UI only. Do not change API calls, payloads, navigation targets, store /
context actions, validation, sockets, polling, payment (Razorpay) calls,
cart/booking maths, or which state renders when. Keep every handler wired;
keep every loading / error / empty branch (restyle only). No mock data.
