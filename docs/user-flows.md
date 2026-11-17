# Multimodal Router: User Flows (UI v2)

| | |
|---|---|
| **Status** | UX proposal v2, pending team review. Replaces the v1 flows of 2026-11-13 |
| **Date** | 2026-11-16 |
| **Figma** | Page [Wireframes v2](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5412): [Start here](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5413) · [Kit](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5414) · [Mobile app](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5415) · [Web app](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router?node-id=85-5416). Press ▶ Present to click through the prototype. The v1 frames are kept on the page "Wireframes v1 (archive)" |
| **Inputs** | [product-requirements.md](product-requirements.md) · [api-contract.md](api-contract.md) · [design-system.md](design-system.md) |
| **Not covered** | Visual styling (colour, final type). The wireframes are grayscale on purpose; [design-system.md](design-system.md) owns the look |

Nothing here is built yet. The current web app (`apps/web`) still has the v1 layout.

---

## 0. Decisions

### 0.1 UX decisions (v2)

| ID | Decision | Why |
|---|---|---|
| **UX-1** | **Layout.** Mobile app: full-screen map, a bottom sheet over it, and a tab bar (Plan · Saved · Settings). Web app: full-screen map, a floating 420 px panel on the left, and a top bar. | The map is always visible. One structure on both platforms. |
| **UX-2** | **Four views:** Plan → Routes → Route details → Navigate. Back (button or browser) moves one step back. | Simple mental model; no page reloads. |
| **UX-3** | User waypoints are called **"stopovers"**, never "stops". | "Stop" already means a bus stop. Validate in the first usability test. |
| **UX-4** | **Picking a destination runs the search.** There is no form to fill first. Changes on the Routes screen (mode tab, time, sort) apply straight away. Only the full trip editor (C5) has a "Find routes" button, because several fields change at once. | One main action: "Where to?". Fewer steps (≤ 3 taps from Home to routes). Replaces v1's "Find routes" + "Update routes" banner. |
| **UX-5** | **Mode tabs on the results:** Best · Transit · Bike + Transit · Bike · Walk. Each tab shows its fastest time. One tap switches the list. Transit types live in "Sort & filter". | People compare modes at a glance instead of guessing which checkboxes to tick before searching. Replaces v1's mode chips. |
| **UX-6** | **No cost anywhere** (PRD PD-1). | Prices are placeholders. |
| **UX-7** | Times in **Seattle time**; distances in **mi / ft**. | PRD PD-8, PD-11. |
| **UX-8** | The trip *request* lives in the URL on web, so links can be shared and reloaded. No trip history is stored, for guests or accounts. | Sharing works without keeping location history. |
| **UX-9** | **Accounts are optional (guest first).** Guests can do everything except save places. Sign-up prompts appear only where saving matters (Home/Work shortcuts, Saved, Settings). | An account only adds saved places. |
| **UX-10** | **Step-by-step navigation** for a chosen route, using device location and *scheduled* times. Optional alert one stop before you get off. | The PRD's "where do I get off?" problem, solved while travelling. |
| **UX-11** | **First run:** Launch → 3-step tutorial → location permission → Get started (account optional). Shown once; the tutorial can be replayed from Settings. | Teaches the three ideas (modes, stopovers, transfers) in under 30 seconds. |

### 0.2 Scope changes that need team sign-off

These conflict with recorded decisions. The wireframes show them because the product owner asked for them; **they are not approved scope yet**.

| Change | Conflicts with | What has to happen first |
|---|---|---|
| Accounts (sign up, log in, reset password, saved places) | PRD PD-9 and PRIV-1; architecture AD-4 (no database) | Architecture review: auth provider, database, data retention. API endpoints for accounts and saved places |
| Mobile app (native, alongside web) | PRD PD-4 (`apps/mobile` parked) | Team decision on sequencing. Recommended: build after the web core loop works |
| Step-by-step navigation | PRD ITIN-6 ("Won't") and §12 | PRD update. Scheduled times only, with no real-time data (that stays out of scope) |
| Times on every mode tab | API returns one ranked list today | Either one plan request per tab, or an additive per-mode summary in the plan response (api-contract) |

---

## 1. App structure

```mermaid
flowchart LR
  first["First run: Launch, Tutorial, Location, Get started"] --> home["Home: map + Where to?"]
  home --> search["Search"]
  search --> routes["Routes: mode tabs + route cards"]
  routes --> details["Route details"]
  details --> nav["Navigate"]
  nav --> arrived["Arrived"]
  routes --> edit["Edit trip: stopovers, time"]
  edit --> routes
  home --> saved["Saved places"]
  home --> settings["Settings"]
  settings --> account["Sign up / Log in / Log out"]
```

| | Mobile app | Web app |
|---|---|---|
| Global navigation | Tab bar: **Plan · Saved · Settings**. Hidden during Search, Routes, details and Navigate so the map has room | Top bar: logo, Help, **Saved**, **Settings**, account menu (or **Log in** / **Sign up** for guests) |
| Trip views | Bottom sheet over the map. Three heights (peek / half / full) with Expand and Collapse buttons, so dragging is never required | Floating left panel; the map fills the rest |
| Back | Back arrow in the sheet or trip card; system back | Back link in the panel; browser Back |

---

## 2. Screens

Codes match the Figma frame names (`Mobile / D2 Routes`, `Web / D2 Routes`). Letters: **A** start, **B** account, **C** plan, **D** routes, **E** navigate, **F** saved and settings.

| Screen | Mobile | Web | Purpose |
|---|---|---|---|
| Launch / landing | A1 Launch | A1 Landing | Brand while loading (mobile); value + "Start planning" (web, first visit only) |
| Tutorial ×3 | A2–A4 | A2–A4 (modal) | Modes, stopovers, transfers. Skip any time |
| Location permission | A5 | (browser prompt on first "Use my location") | Explain before the system prompt. "Not now" keeps everything working |
| Get started | A6 | — | Create account / Log in / **Continue as guest** |
| Sign up · Log in · error · Reset · Check email | B1–B5 | B1–B5 | Short forms, one action each |
| Home | C1 guest · C2 signed in | C1 Planner | Map + "Where to?" + Home/Work shortcuts |
| Search | C3 | C2 | Suggestions (King County only). Picking one shows Routes |
| Choose on map | C4 | C4 Map click menu | Mobile: move the map under a fixed pin. Web: click → menu (set as destination / start / stopover) |
| Edit trip (stopovers) | C5 | C3 | From, up to 3 stopovers (each with a stay), To, reorder, when |
| When | C6 sheet | C3 popover | Leave now / Depart at / Arrive by |
| Finding routes | D1 | D1 | Skeletons; tab times fill in |
| Routes | D2 | D2 | Mode tabs + up to 5 route cards; selected route on the map |
| Sort & filter | D3 | (same content as a popover) | Sort; transit types |
| Route details | D4 | D3 | Timeline of every step; **Start** |
| No routes | D5 | D4 | Says why and offers the next step |
| Can't load routes | D6 | D5 | Service down or offline; trip kept; Try again |
| Outside service area | D7 | (same message in search) | Place shown but disabled, with the reason |
| Navigate | E1 walk · E2 on the bus · E3 transfer · E4 at a stopover | E1 Step-by-step | One big instruction, the next step, time left |
| Arrived | E5 | E2 | Summary; "Save this place" when signed in |
| Saved places | F1 signed in · F2 guest | F3 | Home, Work, favourites |
| Settings | F3 signed in · F6 guest | F2 | Preferences, privacy, help, log out |
| Account menu | — | F1 | Saved, Settings, Help, Log out |
| Log out → logged out | F4 → F5 | F4 → F5 | Confirm, then back to Home as a guest with a short toast |

---

## 3. Key flows

### 3.1 First run
1. **Launch** (≤ 1.5 s) → **Tutorial** (3 cards, Next / Skip) → **Location** (Allow / Not now) → **Get started** (Create account / Log in / Continue as guest) → **Home**.
2. Returning users go straight to Home. On web, first-time visitors see the Landing page, then the tutorial as a modal over the planner.

### 3.2 Plan a trip (the main action)
1. Home → tap **Where to?**
2. Type 2+ characters → pick a suggestion. Start defaults to **Your location** when location is allowed; otherwise the From field is focused first.
3. **Routes** appear immediately with the **Best** tab selected.

Target: ≤ 3 taps and one typed query from Home to results.

### 3.3 Compare and choose
- Mode tabs show the fastest time per mode. Tabs with no route show **None**.
- Each card shows: duration → label (Fastest / Least walking / Fewest transfers) → depart–arrive → legs → transfers, walking and departure.
- Selected card = solid line on the map; others = grey previews (web: hover or focus previews a card).
- Tap a card → **Route details** → **Start**.

### 3.4 Add a stopover
Routes → **Add stopover** chip → Search ("Add a stopover") → pick → **Edit trip** opens with the stopover in place → optional **Stay** (0–4 h) → **Find routes**. Up to 3 stopovers; drag ⋮⋮ or use the up and down buttons to reorder. **Arrive by** is disabled while a stopover is set (PRD PD-3).

### 3.5 Change the time
Routes → **Leave now** chip → When sheet or popover → Depart at / Arrive by + date and time → **Done** re-runs the search. All times are Seattle time.

### 3.6 Navigate
Route details → **Start** → one step at a time: walk ("350 ft · 2 min"), ride ("3 stops · get off at U District Station"), transfer ("Wait 3 min · change to the 1 Line"), arrive. At a stopover, navigation pauses with a stay timer ("Leave by 9:17") and **Continue trip**. **End** returns to Route details.

### 3.7 Account
- **Sign up:** name, email, password (≥ 8 characters) → back to where the user was, now signed in.
- **Log in:** email and password; "Forgot password?" → Reset (email) → Check your email.
- **Log out:** Settings or account menu → confirm dialog → Home as a guest, with the toast "You've logged out". Saved places stay in the account.

---

## 4. Modes

| Tab | Routes included | API (`modes` in the plan request) |
|---|---|---|
| **Best** (default) | The best mix across everything below | `WALK`, `TRANSIT`, `BIKE` |
| **Transit** | Transit with walking to and between stops | `WALK`, `TRANSIT` |
| **Bike + Transit** | Ride your own bike to or from transit | `BIKE`, `TRANSIT`, filtered to routes that use both |
| **Bike** | Bike the whole way | `BIKE` |
| **Walk** | Walk the whole way | `WALK` |

Rules:
1. **Walking is always allowed** as a connector to and between transit.
2. **Tab times** show the fastest route in each tab, or **None** with a reason when there isn't one. They need an API addition (§0.2).
3. **Default tab** is a setting (Settings → Default mode tab). Places are never remembered for guests.
4. **Transit types** (bus, light rail, streetcar, ferry and water taxi, commuter rail) are toggles in Sort & filter. At least one stays on.
5. **Hidden modes** (car, taxi, park & ride, bike and scooter share) don't appear at all (PRD PD-2).
6. Tabs are a `tablist` with the selected tab announced, e.g. "Transit, 24 minutes, selected".

---

## 5. Stopovers vs transfer points

| | **Stopover** (the user's) | **Transfer point** (the route's) |
|---|---|---|
| Created by | The user | The routing engine |
| Map marker | Numbered **disc** (1, 2, 3) | Small **diamond**, never numbered |
| Editable | Yes: add, reorder, set stay, remove | No |
| In the timeline | "Stopover 1 · Grocery on Broadway · Stay 15 min · leave 9:17" | "Change at U District Station · walk 250 ft · wait 3 min" |
| Counted as a transfer | No | Only transit-to-transit changes |

Other markers: start = ring, destination = square, your location = dot with a halo. Lines: walk = dotted, bike = dashed, transit = solid. Every marker and line also has a text label, so nothing relies on colour (the grayscale wireframes prove it).

API: request `waypoints[]` → response `segments[]`, `waypoint_visits[]`, `transfer_points[]` ([api-contract.md](api-contract.md)).

---

## 6. Content rules

**Route card:** duration (largest) · label tag · depart–arrive (mono) · leg pills (transit = dark pill with route name; bike = dashed pill; walk = icon + minutes) · "1 transfer · 0.3 mi walking · leaves in 3 min". No cost.

**Route details:** duration + label · times · one-line summary · **Start** · timeline (start, walk, ride with "Show N stops", transfer, stopover, arrive) · "Times are scheduled, not live" + data attributions.

**Navigation:** one instruction in large type · the next step under it · progress bar · arrival time and time left · Steps and End buttons. Times are scheduled; no live vehicle positions.

**Writing:** sentence case; plain words; say what happened and what to do next, one sentence each.

---

## 7. Loading, empty and error states

| State | Message (example) | Action | API |
|---|---|---|---|
| Finding routes | "Finding routes…" (skeletons; tab times show "…") | Back cancels | — |
| Slow (> 3 s) | "Still working…" | — | — |
| No route | "No transit at this time. Service starts again around 5:00 AM." | **Leave at 5:00 AM**, **Show bike routes** | `200` `outcome: NO_ROUTE` |
| Stopover segment fails | "We couldn't find a way from Stopover 1 to Cal Anderson Park." | Change time · Move or remove the stopover | `NO_ROUTE` (segment) |
| Outside service area | "We plan trips within King County for now." Place shown but disabled | Pick another place | `422 OUTSIDE_SERVICE_AREA` |
| Same start and end | "Start and destination are the same place." | — | `422 ORIGIN_EQUALS_DESTINATION` |
| Too many stopovers | "Up to 3 stopovers." | — | `422 TOO_MANY_WAYPOINTS` |
| Service down | "Can't load routes right now. Your trip is saved here — try again in a moment." + reference ID | **Try again** | `503 ROUTING_UNAVAILABLE` (never shown as "no routes") |
| Timeout | "That took too long. Please try again." | **Try again** | `504 ROUTING_TIMEOUT` |
| Search down | "Search isn't working right now. Choose on the map instead." | **Choose on map** | `503 GEOCODING_UNAVAILABLE` |
| Offline | "You're offline. Your trip is kept." | Retries when back online | network |
| Log-in failed | "That email and password don't match. Try again or reset your password." | Field error on Password | (account API, not designed yet) |
| Unknown | "Something went wrong on our side." + reference ID | **Try again** | `500` + `request_id` |

Response warnings (`PARTIAL_RESULTS`, `DATA_NEAR_EXPIRY`, …) show as an info banner above the cards using the API's `message`.

---

## 8. Accounts and privacy

- **Guests** can plan, compare and navigate. Their preferences are stored on the device only.
- **Accounts store only:** name, email, password (hashed, by the auth provider) and saved places. **No trip history and no location history**, for anyone.
- Location is used only after the user allows it, and only to set the start and to follow progress during navigation (PRIV-2).
- Reset password gives the same response whether or not the email exists, so it doesn't reveal accounts.
- Logging out never deletes saved places. Deleting an account is an open question (§10).

---

## 9. Accessibility (WCAG 2.1 AA, plus 2.2's 2.4.11, 2.5.7 and 2.5.8)

- **Targets ≥ 44 × 44 px**; inputs use 16 px text; focus is always visible.
- **Nothing by colour alone:** shapes, patterns and text carry meaning.
- **No drag required:** the bottom sheet has Expand and Collapse buttons, and stopovers have up and down buttons as well as drag handles.
- **Structure:**
  - the panel or sheet is `main`, with an `h1` per view;
  - mode tabs are a `tablist`;
  - route cards are an ordered list;
  - the map is a labelled region, and everything on it is also in the text.
- **Focus:**
  - picking a suggestion moves to Routes and announces "4 routes. Fastest: 24 minutes";
  - opening details moves focus to its heading, and Back returns it to the same card;
  - dialogs trap focus, start on Cancel and close with Esc.
- **Announcements:** loading, results and toasts are polite; errors are assertive. Navigation steps are announced as they change, and the "get off next" alert uses vibration and sound as well as text.
- **Zoom and motion:** works at 200 % text and 320 px width. With reduced motion requested, the map jumps instead of flying.

---

## 10. Open questions

| # | Question | Default until decided |
|---|---|---|
| Q-1 | Approve the scope changes in §0.2 (accounts, mobile app, navigation, tab times)? | Treat as proposals; build the web core loop first |
| Q-2 | Auth approach (email + password only, or add Apple/Google sign-in)? | Email + password |
| Q-3 | Account deletion and data export flow? | Must exist before accounts launch |
| Q-4 | Is "Stopover" understood? | Test in usability round 1 |
| Q-5 | Is the "Best" tab's mix understandable, or should the default tab be Transit? | Best, then test |
| Q-6 | Turn on the "alert before my stop" by default? | On |

**Acceptance checks for the designs:**
- every screen and state in §2 and §7 has a frame;
- Home → routes takes ≤ 3 taps;
- markers and lines can be told apart in grayscale;
- the core flow works by keyboard and screen reader;
- no cost appears anywhere;
- no interaction needs dragging.
