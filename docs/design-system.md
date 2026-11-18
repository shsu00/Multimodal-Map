# Multimodal Router: Design System (Hi-Fi v0.1)

| | |
|---|---|
| **Status** | **Decided** (2026-11-17) |
| **Date** | 2026-11-13 |
| **Figma** | [HCP-Multimodal-Router](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=49-5410), page **Hi-Fi · Design System** |
| **Built from** | The v1 low-fi wireframes (now the page **Wireframes v1 (archive)**). **The current UX is the v2 wireframes on page [Main Wireframe Layout](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5412)** (2026-11-16, see section 10). The hi-fi screens in section 5 still follow v1 and need a refresh to v2 |
| **Inputs** | [product-requirements.md](product-requirements.md), [user-flows.md](user-flows.md), [api-contract.md](api-contract.md), current web styles in apps/web/src/styles.css |
| **Scope** | Tokens, 38 icons, 29 component sets (200 variants), 13 single components, and the hi-fi Trip Planner and Route Results screens (desktop 1440 and mobile 390). No application code |

### Reading guide

- **section 0** lists the design decisions that need team sign-off.
- **section 1** links every Figma section and frame.
- **section 3** lists the tokens and **section 4** the components. Both use the exact names in Figma.
- **section 7** maps today's CSS variables to the new tokens, for whoever implements this later.

---

## 0. Design decisions for review

| ID | Decision | Why |
|---|---|---|
| **DS-1** | **Colour means mode of travel, and nothing else.** The interface is ink on cool neutral surfaces. Each mode has one hue, always shown together with an icon, a label and a line pattern. | Users can tell how they travel from any coloured pixel. It follows the PRD rule "nothing conveyed by colour alone", because each colour is also an icon, a label and a pattern. It also keeps the UI calm next to a busy map. |
| **DS-2** | **Build on the existing web styles; don't start over.** Keep Archivo, IBM Plex Mono for clock times, the 4 px grid and its `--s*` names, and the 448 px panel. **Retire** the warm paper background (`#f2efe6`) and the signal-red accent (`#bf3014`). | The brief asks for subtle neutral surfaces. In an app full of warnings and errors, red as the action colour can be mistaken for an error. Ink actions read as precise and stay neutral. |
| **DS-3** | **Info is neutral.** Only warnings (amber) and errors (red) get a hue. | Follows from DS-1. Blue for info would be confused with Bus. |
| **DS-4** | **Shadows mean only "this floats above the map":** map controls, legend, popovers, dialogs. Cards in the panel are flat, with a hairline border. | Elevation carries meaning instead of decoration. |
| **DS-5** | **The focus ring is a 2 px white halo plus a 2 px ink ring** (effect style `Focus/Ring`). | It stays visible on white, on ink buttons and over the map. A red outline would be read as an error. |
| **DS-6** | **The label column is 80 px.** The code has 64 px. | The approved wireframes use 80 px, and "Stopover 1" in Label/M doesn't fit in 64 px. |
| **DS-7** | **Cost is designed but hidden.** `Trip Duration` has cost variants, but every MVP frame uses `Cost=Hidden`. | PRD PD-1, UX-6 and the user-flows acceptance checks say no cost in the MVP. The API keeps `cost` null until `cost_estimates` is enabled. The variants are ready for when it is. |
| **DS-8** | **The header keeps Help, Settings and Sign in** from the approved wireframes. `App Header` has a signed-out and a signed-in variant. *Superseded by UI v2: the web top bar has Help · Log in · Sign up (guest) or Help · Saved · Settings · account menu (signed in).* | It preserves the approved structure. Accounts are decided: optional, guest first. |
| **DS-9** | **On mobile, "Use my location" lives in the full-screen search overlay, not inside the From field.** | The v1 flows put Locate in the overlay (v2 keeps this: Search screen C3). Inside a 270 px field it would cut off the place name. Desktop keeps it inside the field (shown as "Locate"). |
| **DS-10** | **Light mode only for now.** The Color collection is semantic, so a Dark mode can be added as a second mode without touching any component. | The web app already follows `prefers-color-scheme`, but dark values haven't been designed or checked for contrast. |
| **DS-12** | **"Continue with Google" follows Google's sign-in branding guidelines** in hi-fi (official "G" mark, approved wording and colours). The grayscale wireframes use a placeholder mark (`v2/Social Button`). **Delete account** uses a Danger button: 2 px strong border in grayscale, `border/error` + `text/error` in hi-fi. | Google requires its branding rules for sign-in buttons. Destructive actions must look different from Secondary, and not by colour alone (the label and the trash icon carry it too). |
| **DS-11** | **The basemap is illustrative.** `Basemap / Seattle` is a hand-drawn vector map for design frames only. Production uses OpenFreeMap tiles restyled with the `map/*` tokens. | No images and no third-party tile screenshots in Figma, and the geography stays editable. |

---

## 1. Figma file map

Base URL: `https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=`

| What | Link | Notes |
|---|---|---|
| Page **Hi-Fi · Design System** | [49-5410](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=49-5410) | Everything below is on this page |
| 00 · Read me | [67-8151](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=67-8151) | Idea, principles, links |
| 01 · Foundations | [66-7976](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=66-7976) | Live swatches (bound to variables), type scale, spacing, radius, elevation, breakpoints, states |
| 02 · Components | [50-5410](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=50-5410) | Icons, all component sets, basemap |
| 03 · Hi-Fi Screens · Desktop | [61-6441](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=61-6441) | |
| ↳ **Desktop 01 · Trip Planner** | [61-6442](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=61-6442) | 1440 × 900. From low-fi [18-122](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=18-122) |
| ↳ **Desktop 02 · Route Results** | [61-6914](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=61-6914) | 1440 × 900. From low-fi [20-338](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=20-338) |
| 04 · Hi-Fi Screens · Mobile | [62-7246](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=62-7246) | |
| ↳ **Mobile 01 · Trip Planner** | [62-7247](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=62-7247) | 390 wide, fold marked at 844. From low-fi [28-1231](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=28-1231) |
| ↳ **Mobile 02 · Route Results** | [62-7725](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=62-7725) | 390 wide, fold marked at 844. From low-fi [28-1480](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=28-1480) |

---

## 2. Principles

1. **Map first.** There is one persistent map and one panel view at a time. The panel never covers the map on desktop.
2. **Colour = mode**. A coloured pixel always tells you how you travel.
3. **Shape before colour.** Markers, line patterns and text carry the meaning in greyscale:
   - origin = ring, destination = square, stopover = numbered disc;
   - transfer = diamond, intermediate stop = dot;
   - walk = dotted line, bike = dashed line, transit = solid line.
4. **Durations lead.** On a card the duration is the largest type and nothing else competes with it. Then come the times and the mode strip, then facts and flags (user-flows section 6).
5. **Honest data.** Times are labelled "Scheduled times, not live" with the data date. No cost appears in the MVP.
6. **The signature element is the mode strip.** Every route card's strip reads like a transit line diagram: proportional segments, route names on the transit legs, and numbered stopover discs on the line. The same language continues on the map and in the timeline rail. Everything around it stays quiet.

---

## 3. Tokens

### 3.1 Collections

| Collection | Modes | Count | Scopes | Web code syntax |
|---|---|---|---|---|
| `Primitives` | Value | 54 colours | none (hidden from pickers) | `var(--primitive-neutral-900)` |
| `Color` | Light | 84 | Background, text, stroke or icon, per token | `var(--color-text-primary)` |
| `Spacing` | Value | 12 | Gap and padding | `var(--s4)`, the same names as `styles.css` |
| `Radius` | Value | 7 | Corner radius | `var(--radius-md)` |
| `Layout` | Value | 17 | Width and height (breakpoints have no scope) | `var(--panel-width)` |

Semantic tokens always **alias** primitives; they never hold raw values. Components use only `Color`, `Spacing`, `Radius` and `Layout`, plus the text and effect styles.

### 3.2 Primitives

| Ramp | Values |
|---|---|
| `neutral` | 0 `#FFFFFF` · 25 `#FAFAFB` · 50 `#F4F5F7` · 100 `#EBEDF0` · 150 `#E3E6EA` · 200 `#DCDFE4` · 300 `#C3C8D0` · 400 `#9AA1AC` · 450 `#80878F` · 500 `#727A86` · 550 `#666D78` · 600 `#59606B` · 700 `#434951` · 800 `#2C3036` · 900 `#1B1E23` · 950 `#121417` |
| `alpha` | `ink-6` `#1B1E230F` (shade outside the service area) · `ink-48` `#1B1E237A` (scrim) |
| Modes (600 / 50) | walk `#5A6270`/`#EEF0F2` · bike `#1C7C3A`/`#E6F2EA` · bus `#1859C9`/`#E7EEFA` · light-rail `#6A3BC2`/`#F0EBFA` · streetcar `#B5520B`/`#FBEEE5` · commuter-rail `#9B2D52`/`#F8E9EF` · ferry `#0A7280`/`#E4F2F3` · monorail `#8A6A00`/`#F6F0DF` |
| Status (50 / 300 / 600) | amber `#FEF4E6`/`#F0C48E`/`#9A4A06` · red `#FDEDEB`/`#F1B3AC`/`#B42318` · green `#E8F5EE`/`#A9D8BC`/`#1E7B45` |
| Map | land `#EDEFEA` · block `#E5E8E2` · water `#C3D9E8` · water-ink `#2F5673` · park `#D3E5CC` · park-ink `#3D6B3A` · road `#FFFFFF` · road-casing `#D9DCD5` · highway `#F4E2B2` · highway-casing `#DFC487` · label `#5E6570` |

### 3.3 Semantic colour (`Color` collection)

| Group | Tokens → primitive | Used for |
|---|---|---|
| Surfaces | `bg/surface` → neutral/0 · `bg/surface-subtle` → 25 · `bg/canvas`, `bg/surface-sunken`, `bg/surface-hover` → 50 · `bg/surface-selected`, `bg/skeleton` → 100 · `bg/inverse` → 900 · `bg/scrim` → alpha/ink-48 | Panel, cards, segmented track, skeletons, the hint pill |
| Text | `text/primary` → 900 · `text/secondary` → 600 · `text/placeholder` → 550 · `text/disabled` → 400 · `text/inverse`, `text/on-mode` → 0 · `text/link` → 900 · `text/warning` → amber/600 · `text/error` → red/600 · `text/success` → green/600 | |
| Icons | `icon/primary` · `icon/secondary` · `icon/disabled` · `icon/inverse` · `icon/warning` · `icon/error` · `icon/success` | Vector strokes in every icon |
| Borders | `border/subtle` → 150 (dividers) · `border/default` → 200 (cards) · `border/control` → 450 (inputs, chips, secondary buttons; ≥ 3:1) · `border/strong`, `border/focus` → 900 · `border/error` → red/600 · `border/warning` → amber/300 · `border/inverse` → 0 | |
| Actions | `action/primary` → 900 · `-hover` → 800 · `-pressed` → 950 · `action/on-primary` → 0 · `action/secondary` → 0 · `-hover` → 50 · `-pressed` → 100 · `action/disabled` → 100 · `action/on-disabled` → 400 · `action/selected` → 900 · `action/on-selected` → 0 | Buttons and selected chips |
| Status | `status/{info,warning,error,success}-{bg,border}` | Banners. Info uses neutral/50 and neutral/200 |
| Modes | `mode/{walk,bike,bus,light-rail,streetcar,commuter-rail,ferry,monorail}` and `mode/*-subtle` | Badges, strip segments, timeline rails, map lines |
| Map | `map/land`, `block`, `water`, `water-label`, `park`, `park-label`, `road`, `road-casing`, `highway`, `highway-casing`, `label`, `route-preview` → neutral/450, `route-casing` → 0, `service-area` → 600, `outside-area` → alpha/ink-6 | Basemap styling and route overlays |

### 3.4 Mode colours

| Mode | Token | Hex | White text on it | Line on map land | Line pattern | Icon |
|---|---|---|---|---|---|---|
| Walk | `mode/walk` | `#5A6270` | 6.2:1 | 5.3:1 | Dotted | Icon/Walk |
| Bike | `mode/bike` | `#1C7C3A` | 5.3:1 | 4.5:1 | Dashed | Icon/Bike |
| Bus | `mode/bus` | `#1859C9` | 6.3:1 | 5.5:1 | Solid | Icon/Bus |
| Light rail | `mode/light-rail` | `#6A3BC2` | 7.0:1 | 6.0:1 | Solid | Icon/Light Rail |
| Streetcar | `mode/streetcar` | `#B5520B` | 5.0:1 | 4.3:1 | Solid | Icon/Streetcar |
| Commuter rail | `mode/commuter-rail` | `#9B2D52` | 7.3:1 | 6.3:1 | Solid | Icon/Commuter Rail |
| Ferry | `mode/ferry` | `#0A7280` | 5.6:1 | 4.9:1 | Solid | Icon/Ferry |
| Monorail | `mode/monorail` | `#8A6A00` | 5.1:1 | 4.4:1 | Solid | Icon/Monorail |

The modes follow the API's `Mode` and `TransitSubmode` enums. Bike share and scooter share are hidden in the MVP (user-flows section 4), so they have no tokens yet.

### 3.5 Typography (text styles)

| Style | Font | Size / line | Use |
|---|---|---|---|
| `Display/L` | Archivo SemiBold | 40/48, −1.5% | Web landing headline *(added for v2)* |
| `Display/M` | Archivo SemiBold | 30/36, −1.5% | Screen titles on onboarding, account and settings screens *(added for v2)* |
| `Duration/L` | Archivo SemiBold | 32/36, −1.5% | Route header duration |
| `Duration/M` | Archivo SemiBold | 22/28, −1% | Route card duration |
| `Title/L` | Archivo SemiBold | 24/30 | Panel view titles (h1): "Plan a trip", "3 routes" |
| `Title/M` | Archivo SemiBold | 18/24 | Section, dialog and state-panel titles |
| `Title/S` | Archivo SemiBold | 15/20 | Row titles, place names, wordmark |
| `Body/L` | Archivo Regular | 16/24 | Input values (16 px avoids iOS zoom on focus) |
| `Body/M` | Archivo Regular | 14/20 | Default body |
| `Body/S` | Archivo Regular | 13/18 | Facts, helper and hint text |
| `Label/M` | Archivo Medium | 14/20 | Buttons, chips, field labels |
| `Label/S` | Archivo Medium | 12/16, +0.5% | Tags, badges, strip labels, map labels |
| `Caption` | Archivo Regular | 12/16 | Attribution, data notice |
| `Time/M` | IBM Plex Mono Medium | 14/20 | Clock times on cards |
| `Time/S` | IBM Plex Mono Regular | 13/18 | Timeline times |

Archivo is already loaded by the web app. The monospace is used only for clock times, so departure columns line up like a timetable. Everything is sentence case; there are no all-caps labels. The low-fi wireframes' "FASTEST" tags become "Fastest".

### 3.6 Spacing (`Spacing` collection, same names as `styles.css`)

| Token | `space/half` | `space/1` | `space/2` | `space/3` | `space/4` | `space/5` | `space/6` | `space/8` | `space/10` | `space/12` | `space/16` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| px | 2 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |
| CSS | `--s0-5` | `--s1` | `--s2` | `--s3` | `--s4` | `--s5` | `--s6` | `--s8` | `--s10` | `--s12` | `--s16` |

Panel padding is `space/6` (24) on desktop and `space/4` (16) on mobile. Card padding is `space/4`, and the gap between cards is `space/3`.

### 3.7 Radius

| `radius/none` 0 | `radius/xs` 4 | `radius/sm` 6 | `radius/md` 8 | `radius/lg` 12 | `radius/xl` 16 | `radius/full` 999 |
|---|---|---|---|---|---|---|
| — | Tags, badges, strip segments | Segments, suggestion rows | Inputs, buttons, banners, map buttons | Cards, legend, suggestion list | Mobile sheets | Chips, markers, avatar |

Radius grows with the size of the surface. Not everything uses the same radius.

### 3.8 Elevation and focus (effect styles)

| Style | Value | Use |
|---|---|---|
| `Elevation/1 Raised` | 0 1 2 / 10% + 0 2 6 / 6% | Map controls, map labels, the selected segment |
| `Elevation/2 Overlay` | 0 1 3 / 8% + 0 6 16 / 12% | Suggestion list, legend, hint pill |
| `Elevation/3 Modal` | 0 2 8 / 8% + 0 16 40 / 18% | Dialogs and mobile sheets |
| `Focus/Ring` | spread 2 white + spread 4 ink | Every focus state. **The node needs clip content on**, or Figma won't render the spread |

### 3.9 Component states

| State | Primary | Secondary / outline | Ghost | Chips (selected / not) | Inputs |
|---|---|---|---|---|---|
| Default | `action/primary` | `action/secondary` + `border/control` | no fill | `action/selected` / `bg/surface` + `border/control` | `bg/surface` + `border/control` |
| Hover | `action/primary-hover` | `action/secondary-hover` + `border/strong` | `bg/surface-hover` | `action/primary-hover` / `bg/surface-hover` + `border/strong` | — |
| Pressed | `action/primary-pressed` | `action/secondary-pressed` | `bg/surface-selected` | — | — |
| Focus | Default + `Focus/Ring` | Default + `Focus/Ring` | `Focus/Ring` | Default + `Focus/Ring` | 2 px `border/strong` + `Focus/Ring` |
| Disabled | `action/disabled` + `action/on-disabled` | `bg/surface` + `border/subtle` + `text/disabled` | `text/disabled` | Not used: disabled modes are hidden (user-flows section 4) | `bg/surface-sunken` + `border/subtle` |
| Loading | Label kept ("Finding routes…") + spinner | Spinner | Spinner | — | "Locating…" + spinner |
| Error | — | — | — | — | 2 px `border/error` + helper text with an icon |
| Selected card | — | — | — | — | Route card: 2 px `border/strong` |
| Out of date | — | — | — | — | Route card at 56% opacity (v1 out-of-date state; v2 re-runs searches straight away, so this state is unused) |

A disabled control always shows its reason in text, for example "Arrive by isn't available with stopovers" or "Up to 3 stopovers".

### 3.10 Breakpoints and layout (`Layout` collection)

| Token | Value | Meaning |
|---|---|---|
| `breakpoint/min` | 360 | Smallest supported width |
| `breakpoint/desktop` | 900 | Side panel from here up; stacked layout below |
| `breakpoint/wide` | 1280 | Panel goes from 384 to 448 |
| `frame/mobile` · `frame/desktop` | 390 · 1440 | Design frames |
| `panel/width` · `panel/width-compact` | 448 · 384 | Desktop panel |
| `panel/label-column` | 80 | Form label column |
| `control/height-lg` · `-md` · `-sm` | 48 · 40 · 32 | Buttons, selects, icon buttons |
| `touch/min` | 44 | Fields and chips. Smaller controls get a 44 px hit area on touch |
| `icon/md` · `icon/sm` | 20 · 16 | Icon sizes |
| `map-height/plan-pct` · `routes-pct` · `details-pct` | 35 · 40 · 50 | Mobile map height by view in the v1 layout. v2 uses a bottom sheet over a full-screen map (user-flows section 1) |

### 3.11 Contrast checks (WCAG 2.1)

| Pair | Ratio | Requirement |
|---|---|---|
| `text/primary` on white | 16.7:1 | AA text |
| `text/secondary` on white / on canvas | 6.3 / 5.8:1 | AA text |
| `text/placeholder` on white | 5.2:1 | AA text |
| `text/warning` / `text/error` / `text/success` on white | 6.3 / 6.6 / 5.3:1 | AA text |
| Warning and error text on their banner backgrounds | 5.7 / 5.8:1 | AA text |
| White on every mode colour | 5.0–7.3:1 | AA text (badges, strip labels) |
| Walk / bike text on its tinted segment | 5.4 / 4.6:1 | AA text |
| `border/control` on white / on canvas | 3.6 / 3.3:1 | 3:1 non-text (1.4.11) |
| `map/route-preview` on land | 3.1:1 | 3:1 non-text |
| `map/label` on land · `map/water-label` on water | 5.1 · 5.3:1 | AA text |
| `text/disabled` | 2.2:1 | Exempt (disabled), so the reason is always given in text too |

---

## 4. Components

All components are on [02 · Components](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=50-5410). Every fill, stroke, padding, gap and radius is bound to a variable, and every text node uses a text style. Icons are swapped with `INSTANCE_SWAP` properties, never as variants. Each component has a usage note in its Figma description.

### 4.1 Icons

38 icons on a 24 px grid with a 1.75 px stroke, bound to `icon/primary` (override the stroke per use).
- **UI:** search, close, plus/minus, chevrons, arrows, swap, locate, map pin, clock, calendar, warning, error, info, check, refresh, layers, maximize, settings, help, user, edit, transfer, spinner.
- **Modes:** walk, bike, bus, light rail, streetcar, commuter rail, ferry, monorail.

### 4.2 Requested components

| Requested | Figma component | Variants and properties | Covers (v1 component list) |
|---|---|---|---|
| **Location search input** | [`Location Input`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5872) · [`Suggestion Item`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5936) · [`Suggestion List`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5938) | State = Empty, Focused, Filled, Error, Disabled, Locating. Label, Value, Placeholder, Show clear, Show accessory, Show helper, Helper. Exposed Marker and Accessory. Suggestions: Category = Place, Transit stop, Current location, Choose on map × Default/Active. The list has a Results slot | `PlaceInput`, `SuggestionList`, `SuggestionItem` |
| **Origin/destination selectors** | [`Origin & Destination`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=55-6047) | From, a **Stopovers slot** (0–3 rows), Add stopover, then To + Swap. The inline markers match the map | Form layout section 6.1, `SwapButton` |
| **Add/remove waypoint controls** | [`Stopover Row`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=55-6022) · [`Add Stopover`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=55-6045) | Row: Position = First, Middle, Last, Only (↑/↓ disabled at the ends) × State = Default, Error. Stay select, Move up, Move down, Remove. Add: State = Enabled, Limit reached, Unavailable (Arrive by) + Count | `StopoverRow`, `AddStopoverButton`, `StaySelect`, `ReorderButtons` |
| **Transportation-mode selector** | [`Mode Chip`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5669) · [`Mode Selector`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5671) | Chip: Mode = Transit, Walk, Bike × Selected = On/Off × State = Default/Hover/Focus. Show sublabel ("connections only"). Selected = ink fill **and** a check icon. Selector: "Modes" label + 3 chips + "Transit options" | `ModeChip`, `ModeChipGroup`, `TransitOptions` |
| (time) | [`Time Control`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=55-6198) · [`Segment`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5479) · [`Segmented Control`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5481) · [`Select`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=52-5461) | Option = Leave now, Depart at (reveals date and time). Arrive by is disabled with the reason. Seattle-time note | `TimeControl` |
| **Primary and secondary buttons** | [`Button`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5606) · [`Button Small`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5728) · [`Icon Button`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5778) · [`Link Button`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5796) | Variant = Primary, Secondary, Ghost × State = Default, Hover, Pressed, Focus, Disabled, Loading (48 px; Small is 32 px, with no Loading state). Label, leading and trailing icons (swap). Icon Button: Style = Outline/Ghost × Size = 40/32 × 4 states | `PrimaryButton` |
| **Route comparison card** | [`Route Card`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6495) · [`Route Card Skeleton`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6497) | State = Default, Hover (map preview), Selected, Focus, Out of date. Times, Transfers, Walk, Stopovers, Show tags, Show flag. **Mode Strip slot**. Exposed Duration, tags and flag | `RouteCard`, `RouteCardSkeleton`, `ModeStrip` |
| **Route duration and cost display** | [`Trip Duration`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6098) | Size = Card/Header × Cost = Hidden (MVP), Fare estimate ("about $3.00" + Estimate tag), Range estimate, No fare, Unavailable. It follows api-contract section 4.3.5: `PLACEHOLDER` is never displayed and `CONFIRMED` is reserved | RES-1, PD-1 |
| **Transfer indicators** | [`Map Marker`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5460) (Board, Change, Alight) · [`Timeline Transfer`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6520) · [`Inline Flag`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6048) · [`Label Tag`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6036) | Diamond: board = top half filled, alight = bottom half filled, change = centre dot (never numbered). Transfer row: Kind × Flag = None/Tight/Long wait. Tags: Fastest, Fewest transfers, Least walking | `TransferRow`, `InlineFlag`, `LabelTag`, XFER-1…4 |
| **Itinerary timeline** | [`Timeline Endpoint`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6269) · [`Timeline Leg`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6442) · [`Timeline Stopover`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6522) · [`Segment Header`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6532) · [`Intermediate Stop`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6536) · [`Mode Badge`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-5962) | Leg: Mode = all 8 modes. Rail: transit 6 px solid, walk dotted, bike dashed. Badge, title, meta, instruction, "N stops" toggle | `StepTimeline`, `LegRow`, `TransitBadge`, `StopoverVisitRow`, `SegmentHeader`, `IntermediateStopList` |
| **Map controls** | [`Map Button`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6393) · [`Map Controls`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6429) · [`Map Label`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6440) · [`Map Legend`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6491) · [`Map Marker`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=51-5460) · [`Basemap / Seattle`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=60-6441) | Controls: Layout = Desktop (zoom, my location) / Mobile (+ full-screen). Label: Place, Hint, Attribution. Legend: Expanded/Collapsed. Marker: 8 kinds × Map/Inline | `MapControls`, `MapLegend`, `Marker`, `MapHint`, `Attribution` |
| **Loading and error components** | [`Route Card Skeleton`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6497) · [`Loading Status`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6600) · [`Banner`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6551) · [`State Panel`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=58-6598) · error state of `Location Input` | Banner: Tone = Info (neutral), Warning, Error + action. State Panel: Kind = No route (one button per suggestion), Service error (retry), Empty | `WarningBanner`, `OutOfDateBanner`, `StatusBanner`, `NoRoutePanel`, `ErrorPanel`, `FieldError` |
| (shell) | [`App Header`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6552) · [`Trip Summary Bar`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6554) · [`Sort Control`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6572) · [`Data Notice`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=59-6582) · [`Strip Segment`](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=57-6020) | Header: Account = Signed out/Signed in. Strip Segment: 8 modes + Stopover + Wait | `AppHeader`, `TripSummaryBar`, `SortControl`, `DataNotice`, `ModeStrip` |

### 4.3 Mode strip rules

- Segment width is proportional to time, with a minimum of 28 px (walk or bike, icon only) and 52 px for transit (route name always shown). Segments are 2 px apart.
- Transit segments are solid mode colour with a white icon and the route short name ("45", "1 Line").
- Walk and bike segments are tinted, with the icon and minutes in the mode colour. Minutes are hidden below 40 px.
- A stopover is a neutral segment with the numbered disc and its stay in minutes. A wait is a dashed gap.
- The strip always has a text alternative: "Walk 5 minutes, then route 45 for 6 minutes, …" (user-flows section 9).

---

## 5. Hi-fi screens

The screens keep the approved low-fi structure: the same panel views, field order, content hierarchy and map layers. Only the visual design changed.

| Frame | What it shows | Changes from low-fi, and why |
|---|---|---|
| [Desktop 01 · Trip Planner](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=61-6442) | Header. "Plan a trip". From (Locate), Stopover 1 (Grocery on Broadway, 15 min), Stopover 2 (Pharmacy, 15th Ave E, 10 min), Add stopover 2 of 3, To + Swap. Modes (Transit and Walk on, Bike off, Transit options). When (Leave now; Arrive by disabled with the reason). Find routes. Attribution. Map: trip markers with names, the map-click hint, controls | Inline markers in the fields match the map. "Use my location" is shortened to "Locate" so the place name fits. Mode chips gained icons and checkmarks |
| [Desktop 02 · Route Results](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=61-6914) | Summary bar with Edit. "3 routes" · Seattle time. Sort. Route 1 in its hover state (grey preview on the map). Route 2 selected, drawn in mode colours with board, change and alight diamonds, plus the tight-connection flag. Route 3 (Least walking). Data notice. Legend expanded | The low-fi drew routes 1 and 3 as previews at the same time. Hi-fi shows only the hovered route, following v1 UX-5. Tags are sentence case |
| [Mobile 01 · Trip Planner](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=62-7247) | Map at 35% with controls including full-screen; the same form, stacked; fold at 844 | No Locate in the field. Map labels reduced to "From"/"To", as in low-fi |
| [Mobile 02 · Route Results](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=62-7725) | Map at 40% with the selected route and the legend collapsed; summary bar (2 lines); sort; 3 cards; data notice | The visible "Sort" label is dropped to fit 358 px. The control keeps an accessible name |

Content is the real trip from the wireframes and the Route Details timeline: Paul G. Allen Center, UW → Grocery on Broadway → Pharmacy, 15th Ave E → Cal Anderson Park, by route 45 and the 1 Line.

---

## 6. Accessibility

- **Contrast:** see section 3.11. All text meets AA, and control borders and map lines meet 3:1.
- **Not colour alone:** every mode has a colour, an icon, a text label and a line pattern. Markers are told apart by shape. Selected chips have a check icon, and the selected card has a heavier outline.
- **Focus:** one `Focus/Ring` effect is used everywhere. It is visible on white, on ink and over the map.
- **Targets:** fields and chips are 44 px. Buttons are 48 px. 32 px controls get a 44 px hit area on touch. Nothing requires dragging.
- **Text:** inputs are 16 px, which avoids iOS zoom on focus. Sentence case is used throughout. Times are tabular.
- **Motion:** not specified in Figma. Follow user-flows section 9: with reduced motion, skeletons don't shimmer and the map jumps instead of animating.

---

## 7. Handoff notes (no code written yet)

How today's `styles.css` variables map to the new tokens:

| Today | New token | Note |
|---|---|---|
| `--bg` `#f2efe6` | `--color-bg-surface` `#FFFFFF` / `--color-bg-canvas` `#F4F5F7` | Paper retired |
| `--fg` `#17171a` | `--color-text-primary` `#1B1E23` | |
| `--accent` `#bf3014` | — | Retired as the UI accent. Focus uses `--color-border-focus` + halo; errors use `--color-text-error` |
| `--muted` `#646361` | `--color-text-secondary` `#59606B` | |
| `--rule` `#bbb9b3` | `--color-border-default` / `--color-border-control` | Split: decorative rules vs control borders (≥ 3:1) |
| `--s1`…`--s12` | Same names | Adds `--s0-5`, `--s5`, `--s10`, `--s16` |
| `--t-*` sizes | Text styles section 3.5 | |
| `--label-col` 64 px | `--panel-label-column` 80 px | DS-6 |
| `--panel-w` 448 px | `--panel-width` 448 px | Adds `--panel-width-compact` 384 px |

Every variable has its web code syntax set in Figma. When implementation starts, the tokens can be exported from the Figma variables. Code Connect isn't set up yet.

---

## 8. Not covered yet

- Hi-fi for Route Details, the loading/no-route/invalid/unavailable state frames, the mobile search overlay, the map chooser popover and About & data. The components needed for them exist; the frames don't.
- The Dark mode values.
- The service-area outline. It is outside the frame at these zoom levels; the tokens `map/service-area` and `map/outside-area` exist.
- Hi-fi (colour) versions of the v2 screens. v2 exists in grayscale only (section 10).
- Code Connect mappings, and exporting the tokens to CSS.

---

## 9. Verification

Checked in Figma on 2026-11-13:

- Every component family and all four screens were screenshotted. Defects found and fixed:
  - sizing that didn't hug its content;
  - missing text bindings;
  - the focus ring not rendering (needed clip content on);
  - mobile map framing;
  - strip overflow on mobile.
- **Automated audit of the page:**
  - 0 image fills;
  - 0 unbound solid paints inside components;
  - 0 component text nodes without a text style;
  - fonts limited to Archivo (Regular, Medium, SemiBold) and IBM Plex Mono (Regular, Medium).
- **Inventory:** 5 variable collections (174 variables), 13 text styles, 4 effect styles, 38 icons, 29 component sets (200 variants), and 13 single components.
- The low-fi page **App Wireframes** was not modified. (It was renamed **Wireframes v1 (archive)** on 2026-11-16; its frames are unchanged.)

---

## 10. Wireframes v2 (grayscale, 2026-11-16)

The current UX. Flows, screens and rules are in [user-flows.md](user-flows.md); this section covers only what the design system needs to know.

| What | Link | Notes |
|---|---|---|
| Page **Main Wireframe Layout** (the v2 wireframes) | [85-5412](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5412) | First page in the file. Prototype flows: mobile/web × first launch/plan a trip |
| 00 · Start here | [85-5413](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5413) | Principles, changes from v1, scope flags, legend, flow map |
| 01 · Kit | [85-5414](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5414) | Grayscale `v2/…` components |
| 02 · Mobile app | [85-5415](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5415) | 38 frames, 390 × 844 (two longer frames show scrolled content). Accounts: B1–B3, C2, F1, F3–F4, F7–F9 |
| 03 · Web app | [85-5416](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5416) | 28 frames, 1440 × 900. Accounts: B1–B3, F1–F2, F4, F6–F8 |

**How the kit relates to this design system:**
- **Same tokens.** Every fill, stroke, spacing and radius is bound to the existing `Color`, `Spacing` and `Radius` variables. It uses only the neutral tokens; no mode colours. Moving to colour means swapping neutral tokens for `mode/*` ones on lines and pills, not redrawing.
- **Same text styles,** plus `Display/L` and `Display/M` (section 3.5).
- **Icons:** reuses the 38 icons in section 4.1, plus 20 new ones in the same style (24 px, 1.75 stroke):
  - Home, Work, Bookmark, Log Out, Mail, Lock, Eye;
  - Navigation, Turn Right, Turn Left, Grip;
  - Shield, Sliders, More, Bell, Ruler, Route, Star, Trash, Share.
- **Components:**
  - **App chrome:** `v2/Status Bar`, `v2/Home Indicator`, `v2/Tab Bar`, `v2/Web Top Bar`, `v2/Logo Mark`, `v2/Keyboard`, `v2/Sheet Handle`.
  - **Controls:** `v2/Button`, `v2/Icon Button`, `v2/Text Field`, `v2/Search Bar`, `v2/Segment`, `v2/Toggle`, `v2/Tag`, `v2/Page Dots`, `v2/Avatar`.
  - **Rows and trip parts:**
    - `v2/Place Row`, `v2/List Row`;
    - `v2/Mode Tab`, `v2/Leg Pill`, `v2/Route Card` (with a **Legs** slot);
    - `v2/Timeline Item`, `v2/Nav Banner`.
  - **Feedback:** `v2/Banner`, `v2/Skeleton Card`, `v2/Empty State`, `v2/Dialog`, `v2/Toast`.
  - **Accounts (added 2026-11-16):** `v2/Social Button` ("Continue with Google", placeholder mark), `v2/Checkbox`, `v2/Divider Label` ("or"), and `v2/Button` style **Danger** (Large, Medium) for Delete account.
  - **Map:** `v2/Map · Seattle (grayscale)`, `v2/Map Marker`, `v2/Route Label`.
- **Grayscale encoding** (it stays when colour is added):
  - transit = solid line and dark pill with the route name;
  - bike = dashed line and dashed pill;
  - walk = dotted line, icon and minutes;
  - markers differ by shape (ring, square, numbered disc, diamond, dot).

**Next design step (after the team signs off on v2):** rebuild the hi-fi screens in section 5 from the v2 frames, starting with Mobile D2 / Web D2 (Routes) and Mobile C1 (Home).

Checked in Figma on 2026-11-16:
- every frame was screenshotted;
- 0 image fills;
- 142 prototype links (177 after the accounts update, all pointing at existing frames);
- UI text uses text styles (the only exceptions are basemap labels inside scaled map instances, where scaling detaches the style).
