# Multimodal Router: Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.1, for team review |
| **Date** | 2026-11-13 |
| **Owners** | Product: *TBD* · Architecture: *TBD* (team to assign) |
| **Baseline code** | `seattle-first-draft` @ `016a2e9`. See [repository-analysis.md](repository-analysis.md) |
| **Decisions needed** | §0, eleven product decisions (PD-1 to PD-11) |

### Reading guide

**Priority:**
- **Must**: the MVP cannot ship without it.
- **Should**: in the MVP if capacity allows, and the first thing cut if not.
- **Could**: stretch.
- **Won't (MVP)**: explicitly deferred.

**Repository status** separates what is *confirmed in the repository* from what is *planned*:

| Status | Meaning |
|---|---|
| **Built** | Exists in the baseline and was verified by tests or by running it |
| **Built\*** | Code exists but has not been exercised end to end (e.g. needs the real routing server, or the UI was not run) |
| **Partial** | Exists, with a stated gap this PRD requires closing |
| **Hidden** | Exists in the baseline but is outside MVP scope. It should be hidden behind configuration, not deleted |
| **New** | Not in the repository. Planned only |

**Numbers:** every numeric target (latency, thresholds, limits) is an initial proposal, to be validated in milestone M0 (§5.4).

**References:** IDs such as D2, R1 and A5 point to findings in [repository-analysis.md](repository-analysis.md).

---

## 0. Product decisions for review

These decisions shape the rest of the document. Each one has a recommendation; the team should confirm or change it.

| ID | Decision | Recommendation | Why | Main alternative |
|---|---|---|---|---|
| **PD-1** | MVP ranking objective and cost display | **Rank on travel time, transfers and walking. Hide cost in the MVP UI.** Keep the existing cost and value-of-time code behind a flag and bring it back as a future feature once prices are sourced. | The concept lists time-vs-cost and fare estimation as *future*. The baseline's prices are placeholders ([seattle.yaml](../cities/seattle.yaml#L17)), so showing them would mislead users. | Keep cost visible with an "estimate" label, as the baseline does now |
| **PD-2** | MVP mode set | **Must:** Walk, Transit (all sub-modes), personal Bike. **Should:** bike-share / e-scooter (GBFS). **Future:** Drive → Park → Transit, drive-only, taxi. | Matches the concept's example journeys and avoids placeholder car and taxi pricing. It also cuts the trip shapes to route from 21 to 6 per request, with no taxi stitching. | Keep all six baseline modes |
| **PD-3** | Waypoint semantics | **Stop-and-visit**, in the **user's order**, with optional dwell time. **1 waypoint is Must, up to 3 is Should.** No order optimisation, and no waypoints combined with "arrive by", in the MVP. | This is the most feasible definition that still delivers the "must visit" promise. Each waypoint multiplies routing work, so the cap keeps latency bounded. | Pass-through "via" points; optimised order; no cap |
| **PD-4** | Platform | **Responsive web app only.** Park the Expo mobile app that is already in the repository. | Matches the plan (React + TypeScript). A second frontend doubles UI work, and the mobile app already lags (A4). | Maintain web and mobile |
| **PD-5** | Service area ("Greater Seattle") | **King County**, which includes Seattle, UW Seattle, the Eastside and SeaTac. Publish an explicit boundary. | It covers the primary users' trips. The current config covers roughly Seattle city limits only (R1). | Seattle only (current), or King + Snohomish + Pierce (needed for UW Tacoma) |
| **PD-6** | Routing engine and the C++ role | **OpenTripPlanner (OTP)** does street and transit pathfinding in the MVP. **C++20** owns multi-criteria ranking and waypoint journey composition. A custom transit router is a research track only. | It keeps a working product while giving C++ a real, scoped job. **Needs instructor confirmation** (Q1). | Build a custom C++ router (e.g. RAPTOR) in the MVP |
| **PD-7** | What counts as a "distinct alternative" | Itineraries are distinct if their **sequence of modes or transit routes** differs, so "Walk → Bus 44 → Walk" and "Walk → Link → Walk" are two alternatives. | The baseline keeps only one itinerary per mode shape. Verified: 3 different routes in, 1 result out. This undermines MVP item 5. | Distinct by mode shape only (current) |
| **PD-8** | Time options | Leave now, depart at, arrive by (arrive by only without waypoints). All times are in **Seattle local time**. | Covers commute planning. The baseline accepts input in Seattle time but displays results in the device's timezone. | Leave now only |
| **PD-9** | Privacy posture | **No accounts, no saved trips, no server-side retention of precise locations.** | Location history is sensitive, and no MVP feature needs storage. | Accounts with saved places |
| **PD-10** | AI in the MVP | **None.** Revisit after the MVP against explicit criteria (§6.2). | No MVP user problem needs it. Route correctness must come from schedule data, not generated text. | Natural-language trip entry |
| **PD-11** | Units | **US customary (mi / ft)** by default. | US audience. The baseline shows m / km. | Metric, or a toggle |

---

## Glossary

| Term | Definition |
|---|---|
| **Journey request** | What the user asks for: origin, destination, optional ordered waypoints, permitted modes, and time. |
| **Itinerary** | One complete candidate way to make the journey. Also called an alternative. |
| **Leg** | A continuous part of an itinerary using one mode or vehicle, e.g. "ride Bus 44 from NE 45th St to Ballard". |
| **Segment** | The part of a journey between two consecutive *user-specified* points: origin → waypoint 1 → … → destination. A journey with *N* waypoints has *N + 1* segments, and each segment contains one or more legs. |
| **Waypoint** *(user-requested)* | A place the **user** requires the journey to visit, in the user's order, optionally staying there for a dwell time. Only the user creates, moves or removes waypoints. |
| **Transfer point** *(system-generated)* | A place where the itinerary changes from one leg to the next. Examples: the stop where you get off one bus and the stop where you board the next, a bike-share dock, or (future) a park & ride lot. **The routing engine produces these automatically.** The user does not choose them in the MVP. |
| **Intermediate stop** | A stop the vehicle serves between boarding and alighting while the rider stays on board. It is neither a waypoint nor a transfer point. |
| **Mode / transit sub-mode** | **Mode:** walk, bike, transit (and in future drive, taxi, …). **Sub-mode:** bus, light rail, streetcar, commuter rail, ferry, water taxi. |
| **Permitted modes** | The modes the user allows. Walking is always allowed as a connector to and between transit. |
| **Transfer (count)** | Number of transit boardings minus one. Switching between bike or walk and transit is a *mode change*, not a transfer. |
| **Service area** | The published boundary inside which journeys are supported. |

### Waypoints vs. transfer points

| | **Waypoint** | **Transfer point** |
|---|---|---|
| Created by | The user | The routing engine |
| Purpose | Somewhere the user needs to *be* | Somewhere the user changes vehicle or mode to *get somewhere else* |
| User can add, move, remove | Yes | No (MVP) |
| Dwell time | Optional, user-set | No. Wait time is computed from the schedule |
| Affects feasibility | Yes. Every segment must be routable | No. It is a result, not a constraint |
| Map marker | Numbered pin (1, 2, 3) | Unnumbered transfer symbol |
| In step list | "Arrive at Stop 1 · Stay 20 min · Depart" | "Transfer: Bus 44 → 1 Line · walk 120 ft · wait 6 min" |
| Counted in "transfers" | No | Only transit-to-transit changes |

---

## 1. Product vision and problem statement

### 1.1 Vision

> Help people in Greater Seattle get from where they are to where they need to be, including the stops they need to make on the way, by combining walking, cycling and public transit into journeys they can understand and trust.

### 1.2 Problem statement

Many trips in Greater Seattle are made by combining modes: cycling to a light-rail station, taking a bus and then a train, or walking a little further to reach a faster line. Planning these trips means answering several questions at once:

- Which modes am I willing to use today?
- Where do I change, and how long will I wait?
- When do I get off?
- How do I fit a required stop, such as an errand or a pickup, into a transit trip?

These are **hypotheses to validate** in M0 user interviews. When a trip includes an intermediate stop, travellers may end up planning each part separately and working out the connections themselves. When several mode combinations are possible, it can be hard to see the trade-offs side by side.

### 1.3 Positioning and differentiation

Multimodal journey planning is **not new**:

- Widely used products such as Google Maps, Apple Maps and Transit, as well as agency trip planners, already provide transit directions that combine walking with buses and trains.
- Some also integrate cycling, bike-share, scooters or ride-hail.

We will not describe Multimodal Router as the only multimodal planner. Our *intended* differentiation:

1. **Permitted modes as a first-class input.** The user declares the set of modes they are willing to use. Every combination within that set is a candidate, and the results are compared side by side.
2. **Ordered must-visit waypoints in transit and bike journeys.** Support for intermediate stops varies across existing products and by mode. We will document competitor behaviour in a competitive review (M0) before claiming any gap.
3. **Transparent transfers.** Transfer points are explicit objects showing where, how far to walk and how long to wait. Labels explain why an option is "Fastest" or "Fewest transfers".
4. **Local focus and open data.** The product has Seattle and UW-oriented defaults and is built on open data (OpenStreetMap, GTFS, GBFS) with inspectable ranking logic.
5. **A learning-oriented engineering project.** Success includes the team's technical outcomes, not only usage (§11).

### 1.4 Product principles

- **Honest data.** Label scheduled times as scheduled. Never show invented prices or imply real-time accuracy.
- **Explain, don't hide.** Show transfers, waits, constraints and why a route is missing.
- **Useful with defaults.** A first-time user gets good results without opening any settings.
- **Accessible by default.** Keyboard and screen-reader support, and nothing conveyed by colour alone.
- **Privacy-respecting.** Collect nothing that is not needed to answer the current request.

### 1.5 MVP goals

1. A user can plan a walk / transit / bike journey anywhere in the service area and compare up to 5 genuinely different itineraries.
2. A user can tell exactly where to board, where to transfer and where to get off.
3. A user can add at least one must-visit waypoint and get a feasible journey, or a clear explanation of why there isn't one.
4. The product meets the quality, performance and accessibility targets in §8 and §11 on a hosted demo environment.

---

## 2. Target users and personas

| Segment | Priority | Typical trips | Key needs |
|---|---|---|---|
| University of Washington students | Primary | Home ↔ campus, campus ↔ work or social, evenings | Reliable times, few transfers, bike + transit, low cost |
| Seattle-area commuters | Primary | Suburb or neighbourhood ↔ downtown, SLU, the Eastside | Arrive-by planning, bike-to-station, consistency |
| Transit and multimodal travellers generally | Primary | Mixed | Clear directions, comparison of options |
| Budget-conscious travellers | Secondary | Any | Avoiding paid modes; cost visibility (future) |
| Visitors unfamiliar with Seattle | Secondary | Airport ↔ hotel ↔ venues | Plain-language instructions: which line, which direction, where to get off |

### Personas

These personas are fictional composites and hypotheses to validate in M0 interviews. Pronouns are deliberately neutral.

**P1: Jordan, UW undergraduate (primary)**
- **Context:** Lives on Capitol Hill, has classes at UW Seattle and a part-time job in South Lake Union. Has a U-PASS and no car. Sometimes rides a bike.
- **Goals:** The fastest dependable trip, fewer transfers when carrying a laptop and groceries, and confidence late in the evening.
- **Frustrations:** Not knowing whether a connection will work, or which stop to get off at.
- **Needs from the MVP:** Walk / transit / bike selection, transfer details with wait times, intermediate stops, depart-at for evening plans, and a grocery-store waypoint on the way home.

**P2: Sam, Eastside commuter (primary)**
- **Context:** Lives in Redmond and works near downtown Seattle. Owns a bike and a car.
- **Goals:** Arrive by 9:00, and compare "bike to the station" with "walk + bus".
- **Frustrations:** Has to try mode combinations one at a time.
- **Needs from the MVP:** Bike + transit combinations, arrive-by, and comparison by time and transfers.
- **Later:** Park & ride (future, PD-2).

**P3: Riley, budget-conscious traveller (secondary)**
- **Context:** Avoids paid options and will walk further to save money.
- **Goals:** The cheapest reasonable route.
- **MVP coverage is partial:** Riley can restrict modes to walk + transit and sort by least walking or fewest transfers, but **cost display is a future feature** (PD-1).

**P4: Alex, first-time visitor (secondary)**
- **Context:** Lands at Sea-Tac Airport, is staying downtown and is attending an event at UW.
- **Goals:** Unambiguous instructions: which line, which direction, how many stops, where to get off. Wants to drop luggage at the hotel on the way.
- **Needs from the MVP:** Headsign and direction, intermediate-stop count, a hotel waypoint with dwell time, and station names on the map.

| Persona | MVP serves | Gaps until future features |
|---|---|---|
| P1 Jordan | Fully | Real-time delays |
| P2 Sam | Mostly | Park & ride, real-time |
| P3 Riley | Partially | Fare and cost estimation, time-vs-cost |
| P4 Alex | Mostly | Multilingual UI, real-time |

---

## 3. User problems and proposed solutions

| # | User problem | Personas | Proposed solution | Phase |
|---|---|---|---|---|
| 1 | "I don't know which combination of modes works best for this trip." | P1, P2 | Generate combinations within the permitted modes and show up to 5 distinct alternatives side by side | MVP |
| 2 | "Today I can't or won't bike (rain, luggage, no bike)." | All | Mode selection. Walking is always available as a connector | MVP |
| 3 | "I need to stop somewhere on the way." | P1, P4 | Ordered waypoints with optional dwell time and per-segment feasibility | MVP (1 must, ≤3 should) |
| 4 | "I don't know where or how to transfer." | P1, P4 | Transfer points on the map and in the steps, with walking distance and wait time | MVP |
| 5 | "I don't know when to get off." | P4, P1 | Headsign, number of stops, and an expandable list of intermediate stops with times | MVP |
| 6 | "I can't tell which option is best for me." | All | Labels (Fastest, Fewest transfers, Least walking) and sorting | MVP |
| 7 | "I need to arrive by a certain time." | P2 | Arrive-by planning (without waypoints) | MVP |
| 8 | "I don't know the area or the street names." | P4 | Place search limited to the service area, map picking, current location | MVP |
| 9 | "Cost matters to me." | P3 | Time-vs-cost ranking and fare and gas estimation | Future (code Hidden) |
| 10 | "My bus is late. What now?" | All | Real-time updates and dynamic rerouting | Future |

---

## 4. Primary use cases

| ID | Use case | Persona | Trigger → main flow | Success outcome | MVP item |
|---|---|---|---|---|---|
| UC-1 | Plan an A → B trip | P1, P4 | Set origin and destination → keep the default modes → "Find routes" | At least one itinerary, or a clear reason why there is none | 1, 2, 4 |
| UC-2 | Restrict modes | P2 | Select Bike + Transit only → search | Every itinerary uses only bike, transit and connecting walks | 3 |
| UC-3 | Compare alternatives | All | Scan the list → sort or read the labels → select one | The user picks an option and can say why | 5 |
| UC-4 | Follow an itinerary | P4 | Open the selected itinerary → read the steps → expand the stops on a transit leg | The user knows the line, direction, stop count and where to get off | 6 |
| UC-5 | Understand transfers | P1 | Look at the transfer markers on the map and the transfer rows in the steps | The user knows where to change, the walking distance and the wait | 7 |
| UC-6 | Add a waypoint | P1, P4 | "Add stop" → choose a place → optional dwell → search | Every itinerary visits the stop in order, or the failing segment is named | 8 |
| UC-7 | Plan for later or arrive by | P2 | Choose "Depart at" or "Arrive by" and a time → search | Times match the request, in Seattle time | 4 |
| UC-8 | Recover from failure | All | Search returns no route, outside area, or service unavailable | A specific message and a suggested next action | all |

---

## 5. Prioritized MVP requirements

### 5.1 MVP statement

> A responsive web app where a user in the service area picks an origin, a destination and up to three ordered waypoints on a map or by search, chooses among walk, transit and bike, and gets up to five distinct itineraries ranked by time, transfers and walking. Each itinerary shows its legs, intermediate stops and transfer points on the map and in a step-by-step list.

### 5.2 MVP capabilities: priority and baseline status

| # | MVP capability (from concept) | Priority | MVP scope | Baseline status | Gap to close |
|---|---|---|---|---|---|
| 1 | Interactive map of Greater Seattle | Must | MapLibre web map, service-area boundary | **Built\*** | Boundary display; replace the hard-coded Seattle centre (A5) |
| 2 | Origin and destination selection | Must | Search, map click, current location, swap | **Partial** | Search not limited to the area; clicking can't re-pick the origin; reverse geocoding unused |
| 3 | Mode selection | Must | Walk, Transit, Bike (+ Should: bike-share and scooter) | **Partial** | Exposes 6 modes; no transit sub-modes |
| 4 | Multimodal route generation | Must | OTP-backed, depart at / arrive by | **Built\*** | Real routing path not verified; outages look like "no routes" (D2) |
| 5 | Multiple candidate routes | Must | Up to 5 distinct alternatives (PD-7) | **Partial** | Same-shape alternatives collapse to one (verified) |
| 6 | Detailed itinerary breakdown | Must | Legs, headsign, boarding and alighting stops, intermediate stops | **Partial** | OTP query lacks intermediate stops, headsign and agency |
| 7 | Transfer point visualisation | Must | Map markers and transfer rows with walk and wait | **New** | — |
| 8 | User-specified waypoints | Must (1) / Should (≤3) | Ordered, stop-and-visit, optional dwell | **New** | — |

**Ordering rationale:** items 1–6 form the core loop and largely exist. Item 7 depends on the richer leg data from item 6. Item 8 is the riskiest (routing fan-out, composition logic and new UI), so it comes last and has a reduced fallback scope (1 waypoint).

### 5.3 What the repository already provides, and what is out of MVP scope

**Confirmed and reusable** (per repository-analysis):
- FastAPI planning API
- Trip-shape generation
- OTP client
- Fake router for development
- Constraint filters
- Pareto ranking
- Shared TS client and types
- Web UI: accessible place search, mode picker, results list, leg list, MapLibre route drawing
- Data download scripts

**Built but outside MVP scope:**

| Item | Status | Plan |
|---|---|---|
| Cost model, fares, value-of-time slider | Hidden | Keep behind a flag (PD-1) |
| Car, taxi, park & ride modes | Hidden | Keep behind a flag (PD-2). Fix D3 and D4 before re-enabling |
| Bike-share and e-scooter via GBFS | Built\* | MVP "Should" (PD-2) |
| Expo mobile app | Partial | Parked (PD-4) |
| C++20 core (pricing, filters, Pareto, polylines) | Built | Role re-scoped per PD-6 |

### 5.4 Phasing (proposal)

Dates assume the UW quarter calendar and should be adjusted to the course schedule.

| Milestone | Window | Scope | Exit criteria |
|---|---|---|---|
| **M0: Baseline and discovery** | now → end of Autumn 2026 | <ul><li>Merge the baseline and add CI</li><li>Fix D1–D3</li><li>Confirm the PD decisions</li><li>Competitive review and 5+ user interviews</li><li>Choose the service-area boundary and data</li><li>Real OTP running on a shared machine</li><li>Benchmark origin–destination set (§11.2)</li></ul> | Decisions recorded; real routing demoed; benchmark set agreed |
| **M1: Core trip planning** | Winter 2027, weeks 1–6 | MVP items 1–6: service area, MVP modes, sub-modes, distinct alternatives, new ranking, full itinerary detail, error states | Must FRs for items 1–6 pass acceptance tests |
| **M2: Transfers and waypoints** | Winter 2027, weeks 7–10 | Item 7, then item 8 (1 waypoint first, then up to 3) | MVP release candidate meets the §5.5 definition of done |
| **M3: Validation and stretch** | Spring 2027 | Usability study, performance work, hosted deployment; stretch features from §6 (e.g. time-vs-cost with sourced prices) | §11 targets measured and reported |

### 5.5 MVP definition of done

- [ ] Every **Must** functional requirement (§7) is implemented with a passing acceptance test, automated or scripted.
- [ ] The benchmark origin–destination set meets the quality targets in §11.
- [ ] **Must** nonfunctional targets (§8) are met on the hosted environment.
- [ ] At least one usability round (≥ 5 participants) is complete, and every issue rated "blocks task" is fixed.
- [ ] Known limitations (scheduled times only, service area, waypoint cap) are stated in the app.

---

## 6. Future features

### 6.1 Roadmap candidates

| Feature | Description | Depends on | Baseline | Earliest |
|---|---|---|---|---|
| Time-vs-cost optimisation | "Value of my time" slider; Pareto front over time and cost | Sourced prices | **Hidden** (Pareto over time and cost, web slider) | M3 stretch |
| Fare and gas cost estimation | Agency and transit fares (incl. reduced fares), fuel and parking | Fare research or GTFS fare data | **Hidden** (placeholder prices) | M3 / year 2 |
| Drive → Park → Transit | Park & ride journeys | Lot data, D3 fix | **Hidden** (OTP `CAR_PARKING`) | M3 |
| Bike carried on board | Bike → bus or rail → bike (racks, rail) | OTP config, GTFS `bikes_allowed` data | New | M3 |
| Waypoint order optimisation | Visit unordered stops in the best order (a small time-dependent travelling-salesman problem) | Waypoint MVP | New. **Good C++ candidate** | M3 / year 2 |
| Real-time updates | Live predictions, delays, alerts | GTFS-Realtime feeds (availability to confirm) | New (no real-time updater; R4) | Year 2 |
| Dynamic rerouting | Re-plan while travelling | Real-time, trip tracking | New | Year 2 |
| Personalised recommendations | Learned preferences, saved places | Accounts, privacy design | New | Year 2 |
| Wheelchair-accessible routing | Step-free routes | OTP accessibility settings, GTFS wheelchair data quality | New | Year 2 |
| AI agent integration | Natural-language requests turned into structured journey requests | Reliable structured planner (§6.2) | New | Post-MVP |
| Expansion beyond Seattle | Additional regions | `cities/*.yaml` pattern | **Partial** | Year 2 |
| Native mobile app | iOS and Android | PD-4 | **Partial** (parked Expo app) | Post-MVP |
| Accounts and saved trips | Persistent history | Privacy and security design | New | Post-MVP |

### 6.2 Why AI is not in the MVP, and when to revisit

- **No MVP problem needs it.** MVP inputs are short and structured: map picks, checkboxes, a time. The core value is *correct* routes from schedule data, which deterministic algorithms provide.
- **It would add cost, latency, a privacy exposure and an evaluation burden.** Locations would be sent to a third-party model, and the team would need to prove it never invents a route.
- **Revisit when all three are true:**
  1. User research shows real input friction that natural language would solve.
  2. The structured planner meets the §11 quality targets.
  3. Any AI component can only *call* the planner and never generates routes, times or prices itself.

---

## 7. Functional requirements

### 7.1 Map (MAP)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| MAP-1 | Show an interactive, pannable, zoomable map, initially framed on the service area. | Must | Built\*. Framed on a hard-coded Seattle point (A5) |
| MAP-2 | Show the service-area boundary, or shade the area outside it. | Should | New |
| MAP-3 | Clicking the map sets a point. Once origin and destination are both set, a click offers **From / To / Add stop** instead of silently replacing the destination. Markers can be dragged. | Must (click), Should (drag) | Partial. The first click sets the origin; every later click replaces the destination |
| MAP-4 | Draw the selected itinerary's legs, distinguishing modes by line pattern and label, not colour alone. | Must | Built\* |
| MAP-5 | Use distinct markers for the **origin**, the **destination**, **waypoints** (numbered 1…n) and **transfer points** (unnumbered transfer symbol), with a legend. | Must | Partial. Origin and destination only |
| MAP-6 | Fit the map to the selected itinerary. | Should | Built\* |
| MAP-7 | Highlight an alternative on the map when it is hovered or focused in the list. | Could | New |
| MAP-8 | Show the required attributions (OpenStreetMap, tile provider). | Must | Built\* (MapLibre attribution control) |

### 7.2 Locations (LOC)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| LOC-1 | Address and place search with autocomplete, returning results **inside the service area** only. | Must | Partial. Photon, biased towards the centre but not restricted (E4) |
| LOC-2 | Use current location as origin, on explicit user action. | Should | Built\* |
| LOC-3 | Swap origin and destination. | Should | New |
| LOC-4 | Label map-picked points with a readable name (reverse geocoding). | Should | Partial. `/v1/reverse` exists; the UI shows "Dropped pin" |
| LOC-5 | Block routing for any point outside the service area, with an explanation. | Must | New. The bbox is informational only |
| LOC-6 | Search transit stations by name (e.g. "U District Station") using GTFS data. | Could | New |

### 7.3 Modes (MODE)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| MODE-1 | The user selects permitted modes from **Walk, Transit, Bike**. At least one is required. | Must | Partial. All 6 baseline modes are exposed |
| MODE-2 | Walking is always allowed as a connector. A walk-only itinerary appears only if Walk is selected. | Must | Built (tested) |
| MODE-3 | Label transit legs with their sub-mode (bus, light rail, streetcar, commuter rail, ferry, water taxi), using a documented mapping from GTFS data. | Must | Partial. OTP returns the leg mode, but the planner collapses it to `TRANSIT` |
| MODE-4 | Exclude chosen transit sub-modes (e.g. no ferries). | Should | New |
| MODE-5 | Personal bike: direct bike trips, and biking to a station and parking there. | Must | Built\* (`BICYCLE`, `BICYCLE_PARKING`) |
| MODE-6 | Shared bikes and e-scooters from GBFS feeds. | Should | Built\*. Known Ship Canal issue (R5) |
| MODE-7 | Car, park & ride and taxi are **not offered** in the MVP UI. Their code stays, behind configuration. | Must | Hidden |
| MODE-8 | Remember the last mode selection on the device. | Could | New |

### 7.4 Time (TIME)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| TIME-1 | Default to "Leave now". | Must | Built |
| TIME-2 | Depart at a chosen date and time. | Must | Built\* (web) |
| TIME-3 | Arrive by a chosen time, for journeys without waypoints. | Should | Built\* (web) |
| TIME-4 | Enter and display all times in Seattle local time (`America/Los_Angeles`), with a label when the device timezone differs. Show "+1" for times after midnight. | Must | Partial. Input is read as Seattle time, but display uses the device timezone ([format.ts:64](../packages/shared/src/format.ts#L64)) |
| TIME-5 | Warn when the chosen time is in the past or outside the loaded schedule window. | Should | New |

### 7.5 Route generation and ranking (ROUTE)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| ROUTE-1 | Generate itineraries using only permitted modes, including combinations: walk or bike to transit, transit to walk, direct walk, direct bike. | Must | Built\*. Verified with the fake router only |
| ROUTE-2 | Return **up to 5 distinct** itineraries, where distinct means a different sequence of modes **or transit routes** (PD-7). Show fewer rather than near-duplicates. | Must | Partial. One itinerary per mode shape ([pareto.py:28-34](../services/planner/planner/pareto.py#L28-L34)). Verified: 3 different routes in, 1 out |
| ROUTE-3 | Keep the Pareto-optimal set over **duration, transfers and walking distance**, ordered by duration. Label **Fastest**, **Fewest transfers** and **Least walking**. | Must | Partial. The existing Pareto set is over duration and cost |
| ROUTE-4 | Apply maximum-walking and maximum-transfer constraints with sensible defaults. A UI control is optional. | Should | Built (API); New (UI) |
| ROUTE-5 | When the only result is walking, or nothing is found, say so explicitly (§10). | Must | Partial |
| ROUTE-6 | If some candidate queries fail or time out, return what is available and mark the results as possibly incomplete. | Should | Partial. Failures are skipped silently |
| ROUTE-7 | The same request on the same data gives the same results, so tests are reproducible. | Should | Not verified |

### 7.6 Waypoints (WAY): user-requested

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| WAY-1 | Add a waypoint by search or map click. Support **1** waypoint (Must) and up to **3** (Should). | Must / Should | New |
| WAY-2 | Waypoints are visited **in the user's order**. The user can reorder (up/down or drag) and remove them. | Must | New |
| WAY-3 | Optional dwell time per waypoint: 0–240 min, default 0. | Should | New |
| WAY-4 | Every returned itinerary visits all waypoints in order. A partial journey is never presented as complete. | Must | New |
| WAY-5 | If any segment has no route, name it (e.g. "No route from Stop 1 to Destination using Walk + Transit at 23:40") and suggest actions. | Must | New |
| WAY-6 | Waypoints are created **only by the user**. The system never turns a transfer point into a waypoint or the reverse. If a waypoint coincides with a transfer location, it is shown as a waypoint. | Must | New |
| WAY-7 | Waypoints cannot be combined with "Arrive by" in the MVP, and the UI explains why. | Must | New |
| WAY-8 | Validate waypoints: each is inside the service area and not within 50 m of the origin, the destination or an adjacent waypoint. | Should | New |
| WAY-9 | Optimise waypoint order automatically. | Won't (MVP) | New |

### 7.7 Results and comparison (RES)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| RES-1 | Each result shows departure and arrival times, total duration, number of transfers, walking distance and a mode strip. | Must | Built\*. It also shows cost, which is hidden per PD-1 |
| RES-2 | Show labels per ROUTE-3. | Must | Partial |
| RES-3 | Sort by fastest, fewest transfers or least walking. | Should | New |
| RES-4 | Selecting a result shows it on the map and expands its steps. | Must | Built\* |
| RES-5 | The mode strip has an equivalent text description. | Must | Built\* |
| RES-6 | Show a notice that **times are scheduled, not real-time**, and the date of the schedule data. | Must | New |
| RES-7 | Hide cost and the value-of-time slider in the MVP. | Must | Hidden |
| RES-8 | Show distances in mi / ft by default (PD-11). | Should | Partial. m / km |
| RES-9 | A shareable URL that recreates the request. | Could | New |

### 7.8 Itinerary detail (ITIN)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| ITIN-1 | An ordered step list showing each leg's mode, start and end time, duration and distance. | Must | Built\* |
| ITIN-2 | Transit legs show sub-mode, route name, **headsign or direction**, agency, **boarding stop** and **alighting stop**. | Must | Partial. Route name and destination name only; the OTP query lacks these fields ([otp_client.py:17-22](../services/planner/planner/otp_client.py#L17-L22)) |
| ITIN-3 | **Intermediate stops** per transit leg: the stop count is always visible, with an expandable list of names and scheduled times where available. | Must | New |
| ITIN-4 | Segment headings and waypoint rows (arrive, stay, depart) for journeys with waypoints. | Must (with WAY-1) | New |
| ITIN-5 | Bike-share and scooter legs show pickup and drop-off locations. | Should (with MODE-6) | Partial |
| ITIN-6 | Turn-by-turn walking and cycling directions. | Won't (MVP) | — |

### 7.9 Transfer points (XFER): system-generated

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| XFER-1 | Derive transfer points from the itinerary: every change between consecutive legs, except at the origin, destination and waypoints. This includes alighting/boarding stop pairs, bike parking and rental docks, and (future) park & ride lots. | Must | New |
| XFER-2 | Show transfer points on the map with a transfer marker distinct from waypoint markers. The name appears on hover, focus or tap. | Must | New |
| XFER-3 | Each transfer row in the step list shows **from → to** (route or mode), the walking distance and time between stops, and the **wait** before the next departure. | Must | New (wait can be computed from leg times) |
| XFER-4 | Flag tight connections (wait < 3 min) and long waits (> 20 min). | Should | New |
| XFER-5 | Transfer count = transit boardings − 1, applied consistently in the API, labels and UI. | Must | Built (current definition) |

### 7.10 Errors and system states (ERR)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| ERR-1 | Show a loading state and announce results to screen readers. The user can edit and resubmit at any time. | Must | Built\* (loading text, `aria-live`) |
| ERR-2 | Give distinct, actionable messages for each case: invalid input, outside the service area, no route, routing unavailable, geocoder unavailable, offline. | Must | Partial. A routing outage appears as "no routes" (D2) |
| ERR-3 | If basemap tiles fail, routes and markers still render on a plain background, with a notice. | Should | New |
| ERR-4 | A newer search replaces a pending one, so results never arrive out of order. | Should | New |

### 7.11 Transit data processing (DATA): Python + pandas

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| DATA-1 | A repeatable pipeline downloads the OSM, GTFS and GBFS configuration for the service area. | Must | Built\* ([fetch_data.py](../scripts/fetch_data.py)) |
| DATA-2 | Produce a GTFS validation report covering: <ul><li>required files present</li><li>service calendar covers at least 4 weeks ahead</li><li>stops inside the service area</li><li>every route type mapped to a sub-mode (MODE-3)</li></ul> | Must | Partial. Only the required-file check exists |
| DATA-3 | Verify that the OSM extract covers the whole service area. | Must | New (R1) |
| DATA-4 | Build a stop and station reference table (IDs, names, sub-modes, coordinates, parent stations) for transfer labels, station search and analysis. | Should | New |
| DATA-5 | Record the data version (feed date, graph build date) and expose it through the API and UI. | Must | New |
| DATA-6 | A documented refresh procedure, run at least every 4 weeks or whenever the feed changes. | Should | Partial (README notes) |

### 7.12 Planning API (API)

| ID | Requirement | Priority | Repository status |
|---|---|---|---|
| API-1 | The plan request accepts: origin, destination, ordered waypoints with dwell, permitted modes, sub-mode exclusions, time with depart/arrive, and constraints. | Must | Partial. No waypoints or sub-modes |
| API-2 | The plan response includes: <ul><li>legs with sub-mode, route, headsign and agency</li><li>boarding, alighting and intermediate stops</li><li>transfer-point objects</li><li>segment and waypoint boundaries</li><li>the data version</li></ul> | Must | Partial |
| API-3 | A service-area endpoint (name, boundary, centre, enabled modes) that the UI uses instead of hard-coded values. | Should | Partial. `/v1/city` exists but is unused |
| API-4 | Machine-readable outcomes that distinguish: no route (with the failing segment), invalid input, routing unavailable, geocoder unavailable. | Must | Partial |
| API-5 | The OpenAPI schema is the contract, and frontend types are generated from it. | Should | Partial (A3) |
| API-6 | The health endpoint reports dependency status (routing engine reachable, data version). | Should | Partial |
| API-7 | Per-client rate limiting in deployed environments. | Should | New |
| API-8 | Configuration flags per environment for enabled modes and cost display. | Must | New |

---

## 8. Nonfunctional requirements

| ID | Category | Requirement (proposed target) | Priority | Verification |
|---|---|---|---|---|
| PERF-1 | Performance | Plan without waypoints: **p95 ≤ 5 s**, median ≤ 2.5 s | Must | Benchmark set against the hosted environment |
| PERF-2 | Performance | Plan with waypoints: p95 ≤ 10 s with 1, ≤ 20 s with 3, with visible progress | Must (1) / Should (3) | Benchmark set |
| PERF-3 | Performance | Map interactive ≤ 4 s on typical broadband; autocomplete ≤ 1 s p95 after typing pauses | Should | Lighthouse / manual timing |
| CAP-1 | Capacity | 20 concurrent plan requests without errors (demo and usability load) | Should | Load test |
| REL-1 | Reliability | Every upstream call has a timeout; no request takes longer than 30 s; failures produce the ERR-2 messages | Must | Fault-injection tests (routing engine stopped, geocoder blocked) |
| REL-2 | Reliability | Service available during scheduled demos and tests; a written restart runbook exists | Must | Runbook drill |
| ACC-1 | Accessibility | **WCAG 2.1 AA** for the core flows (UC-1 to UC-6); keyboard-only completion; screen-reader labels | Must | axe (zero serious or critical issues) + manual screen-reader test |
| ACC-2 | Accessibility | Nothing conveyed by colour alone (modes, markers, labels) | Must | Design review. The baseline already uses patterns and labels |
| RESP-1 | Responsiveness | Usable from 360 px width up to desktop; touch targets ≥ 44 × 44 px | Must | Device testing |
| COMP-1 | Compatibility | Latest two versions of Chrome, Edge, Firefox and Safari, plus iOS Safari and Android Chrome | Must | Manual matrix per release |
| PRIV-1 | Privacy | No accounts. No persistent server-side storage of journey requests. Logs omit coordinates or round them to about 100 m (3 decimals) | Must | Code review, log inspection |
| PRIV-2 | Privacy | Location access only on explicit user action. A denial is handled gracefully | Must | Test |
| PRIV-3 | Privacy | A privacy note lists the third parties that receive data (geocoder, tile server) | Must | Review |
| SEC-1 | Security | Input validation (coordinate ranges, ≤ 3 waypoints, string lengths); CORS limited to the app origin when deployed; no secrets in the repo; dependency scanning in CI | Must | CI + review |
| DQ-1 | Data quality | ≥ 95% of spot-checked transit legs match published schedules (route, stops, times) | Must | Manual spot check per milestone (§11) |
| DQ-2 | Data freshness | Schedule data ≤ 4 weeks old; the UI shows the data date | Must | Health check |
| MAINT-1 | Maintainability | CI runs all test suites, typecheck and lint on every PR. `main` is protected and needs at least 1 reviewer | Must | Repository settings |
| MAINT-2 | Maintainability | ≥ 80% line coverage of planner domain modules. Every Must requirement has an acceptance test | Must | Coverage report, traceability table |
| MAINT-3 | Maintainability | A new contributor can run the app with the fake router in ≤ 30 min from the README. Real-routing setup is documented | Should | Onboarding dry run |
| MAINT-4 | Maintainability | One source of truth for API types (generated). No new hand-written duplicate models | Should | Review |
| OBS-1 | Observability | Structured logs with a request ID and per-upstream latency; error rate visible | Should | Log review |
| COST-1 | Cost | Runs within free tiers or student credits. The routing server fits the available memory (target ≤ 8 GB) for the chosen service area | Must | Deployment review |
| LIC-1 | Licensing | Comply with data licences and attribution (OpenStreetMap ODbL, GTFS feed terms, tile provider). Choose a project licence | Must | Review |
| L10N-1 | Localisation | English UI; US date and time formats; US customary units by default | Must | Review |

---

## 9. User stories and acceptance criteria

Format: *As a … I want … so that …*, followed by acceptance criteria. Story IDs map to the functional requirements in §7.

### Epic A: Locations and map

**US-1: Search for a place** · Must · LOC-1, MAP-5
As a student, I want to type an address or place and pick from suggestions, so that I can set my start and end quickly.
- Given I type at least 3 characters in From or To, when I pause, then up to 5 suggestions **inside the service area** appear within 1 s (p95).
- Given I choose a suggestion, then an origin or destination marker appears there and the map shows it.
- Given I edit the text after choosing, then the point is cleared until I choose again.
- Given the geocoder is unavailable, then I see "Address search is unavailable. Click the map to set a point," and map picking still works.

**US-2: Pick and adjust points on the map** · Must · MAP-3
As a visitor, I want to click the map to set points, so that I can plan without knowing addresses.
- Given no origin, when I click the map, then the origin is set at that spot.
- Given origin and destination are both set, when I click the map, then I can choose **From**, **To** or **Add stop**. Nothing is replaced silently.
- *(Should)* Given a marker exists, when I drag it, then the point moves and the results are marked out of date.

**US-3: Start from my location** · Should · LOC-2, PRIV-2
As a commuter, I want to use my current location as the start, so that I don't have to type it.
- Given I press "Use location" and grant permission, then the origin is set to my position and labelled "Current location".
- Given I deny permission, then I see a message and the other input methods still work.

**US-4: Outside the service area** · Must · LOC-5, MAP-2
As any user, I want to know immediately when a place isn't supported, so that I don't wait for a search that can't succeed.
- Given I choose a point outside the service area, then I see "Outside the area we cover (King County)" and the search button is disabled until I fix it.
- *(Should)* The boundary is visible on the map.

### Epic B: Modes and time

**US-5: Choose permitted modes** · Must · MODE-1, MODE-2
As a commuter, I want to choose which modes I'm willing to use, so that suggestions fit my situation today.
- Given I select only Transit, then results contain transit legs and connecting walks, and no walk-only itinerary.
- Given I select Bike + Transit, then no itinerary contains a mode I did not select (walking connectors excepted).
- Given I deselect every mode, then search is disabled with "Choose at least one mode."

**US-6: Own bike vs. shared bike** · Should · MODE-5, MODE-6
As a cyclist, I want to say whether I'm bringing my own bike, so that I'm not routed to rentals I don't need.
- Given "I'm bringing my own bike" is checked, then bike legs are personal (no rental cost or pickup shown), and bike-then-transit trips park the bike at the station.
- Given it is unchecked and bike-share is enabled, then bike legs show pickup and drop-off locations.

**US-7: Depart at or arrive by** · Must (depart at) / Should (arrive by) · TIME-2 to TIME-4
As a commuter, I want to plan for a specific time, so that I can arrive by 9:00.
- Given "Arrive by 9:00", then every itinerary arrives at or before 9:00 Seattle time.
- Given my device is set to another timezone, then times are still shown in Seattle time, labelled as such.
- Given a waypoint exists, then "Arrive by" is unavailable, with an explanation.

### Epic C: Results

**US-8: See genuinely different options** · Must · ROUTE-2, RES-1
As a student, I want several meaningfully different options, so that I can choose between, say, a bus and light rail.
- Given two itineraries use different transit routes (e.g. Bus 44 vs. 1 Line), then both can appear even if their mode shape is the same.
- Up to 5 itineraries are shown, with no duplicates (same routes and same times).
- Each result shows depart and arrive times, duration, transfers, walking distance and a mode strip. **No cost is shown** (PD-1).

**US-9: Understand which is best** · Must (labels) / Should (sort) · ROUTE-3, RES-2, RES-3
As a user, I want options labelled and sortable, so that I can quickly find what matters to me.
- Exactly one result carries each label: **Fastest**, **Fewest transfers**, **Least walking**. One result can carry several.
- *(Should)* Changing the sort reorders the list without a new search.

**US-10: See an option on the map** · Must · RES-4, MAP-4, MAP-6
- Given I select a result, then its legs are drawn on the map (patterns and labels, not colour alone), the map fits the route, and its steps expand.

### Epic D: Itinerary detail and transfers

**US-11: Know exactly which vehicle to take** · Must · ITIN-1, ITIN-2, MODE-3
As a visitor, I want the line, direction and stops spelled out, so that I board the right vehicle.
- Each transit step shows sub-mode, route name, headsign or direction, agency, boarding stop with scheduled time, and alighting stop with scheduled time.
- Walking and biking steps show duration and distance in mi / ft.

**US-12: Know when to get off** · Must · ITIN-3
As a visitor, I want to see the stops along my ride, so that I know when to get off.
- Each transit step shows "*N* stops".
- Expanding the step lists intermediate stop names in order, with scheduled times where the data provides them.
- Intermediate stops are **not** shown as transfer points or waypoints.

**US-13: See where I transfer** · Must · XFER-1 to XFER-3, MAP-5
As a student, I want transfers highlighted, so that I know where and how to change.
- Every change between consecutive legs (other than at the origin, destination or waypoints) appears as a transfer marker on the map and as a transfer row in the steps.
- A transfer row shows "Bus 44 → 1 Line · walk 350 ft (2 min) · wait 6 min".
- Transfer markers look clearly different from numbered waypoint markers, and the legend explains both.

**US-14: Warn me about risky connections** · Should · XFER-4
- A wait under 3 minutes shows "Tight connection". A wait over 20 minutes shows "Long wait".

### Epic E: Waypoints

**US-15: Add a stop on the way** · Must · WAY-1, WAY-2, WAY-4, ITIN-4
As a student, I want to add a grocery store between campus and home, so that one plan covers the whole trip.
- Given I add a stop by search or by "Add stop" on the map, then it appears as waypoint **1** in the form and on the map.
- Every itinerary returned visits waypoint 1 between the origin and destination.
- The steps are grouped into segments: "Origin → Stop 1", then "Stop 1 → Destination".

**US-16: Several stops in my order** · Should · WAY-1, WAY-2
- I can add up to 3 stops. Adding a 4th is disabled, with "Up to 3 stops."
- Reordering or removing stops updates the numbering, and the results are marked out of date.
- Itineraries visit stops in exactly the listed order.

**US-17: Stay at a stop** · Should · WAY-3
- Given I set "Stay 30 min" at Stop 1, then the next segment departs no earlier than 30 minutes after arrival, and the steps show the stay.

**US-18: Tell me which part is impossible** · Must · WAY-5
- Given no permitted-mode route exists for one segment, then no itinerary is shown as complete, and the message names that segment and suggests what to change (modes, time, or the stop).

### Epic F: Errors and trust

**US-19: No route found** · Must · ROUTE-5, ERR-2
- Given no itinerary satisfies the request, then I see why (e.g. "No transit service at 2:30 AM with Walk + Transit") and suggestions. I never see a blank list.

**US-20: Service unavailable** · Must · ERR-2, API-4, REL-1
- Given the routing engine is unreachable, then I see "Route planning is temporarily unavailable. Please try again shortly." This must be distinguishable from "no route" (fixes D2).

**US-21: Know how fresh the data is** · Must · RES-6, DATA-5
- The results area shows "Scheduled times · data from <date>". No wording implies real-time accuracy.

### Epic G: Accessibility

**US-22: Plan a trip without a mouse or without sight** · Must · ACC-1, ACC-2
- Using only a keyboard, I can set points by search, choose modes, search, move through results and read every step.
- A screen reader announces the result count and each result's summary. Every map-only piece of information (transfers, waypoints) is also in the step list.

---

## 10. Edge cases and failure states

| Area | Case | Expected behaviour | Related |
|---|---|---|---|
| Input | Origin and destination are the same, or < 50 m apart | Block, with "Start and destination are the same place" | LOC-5 |
| Input | Point outside the service area | Block before routing; show the boundary | LOC-5, MAP-2 |
| Input | Point in water or off the network (lake, freeway) | Snap to the nearest walkable point. If the snap is > 500 m, warn and show the snapped location | ROUTE-1 |
| Input | Ambiguous or no geocode results | Show several suggestions with locality, or "No matches in King County · click the map"; never auto-pick | LOC-1 |
| Input | Location permission denied or inaccurate | Message; manual entry still works | LOC-2 |
| Modes | No mode selected | Search disabled, with a prompt | MODE-1 |
| Modes | Only Bike selected and no bikeable path exists | No-route message suggests adding Transit | ROUTE-5 |
| Modes | Bike egress requires a rental but bike-share is disabled | Don't return that shape (no false results) | MODE-5, MODE-6 |
| Modes | Rental vehicles unavailable or GBFS feed stale | Omit rental options and note "Bike-share availability unavailable" | MODE-6 |
| Modes | Scooter trip falls back to walking (known Ship Canal issue, R5) | Never label a walking fallback as a scooter trip | MODE-2 |
| Results | Only walking is feasible but Transit was selected | If Walk is permitted, show it labelled "Walking is your best option". Otherwise, show a no-route message with the reason | ROUTE-5 |
| Results | Every candidate exceeds the max walk or max transfers | Explain which constraint removed the results and offer to relax it | ROUTE-4 |
| Results | No service at this hour (late night) | "No transit service at this time." *(Could)* offer the first departure after service resumes | ROUTE-5 |
| Results | Fewer than 5 distinct options | Show what exists; don't pad with near-duplicates | ROUTE-2 |
| Results | Very long itinerary (> 3 h) | Show it with a "Long trip" note | RES-1 |
| Transfers | Tight (< 3 min) or long (> 20 min) wait | Flag it | XFER-4 |
| Transfers | Same-stop transfer (no walk leg) | Show the transfer with "same stop · wait N min" | XFER-3 |
| Waypoints | A segment is unreachable | No complete itinerary; name the segment | WAY-5 |
| Waypoints | Waypoint duplicates the origin, destination or neighbouring waypoint | Validation message | WAY-8 |
| Waypoints | More than 3 waypoints requested | Add disabled, with an explanation | WAY-1 |
| Waypoints | Dwell time pushes a later segment past the end of service | That segment fails with a time-specific message | WAY-5 |
| Waypoints | The user's order causes backtracking | Respect the user's order (optimisation is future) | WAY-2, WAY-9 |
| Waypoints | Arrive-by chosen with waypoints | Option disabled, with an explanation | WAY-7 |
| Waypoints | Waypoint is at a transit stop that is also a transfer location | Show it as a waypoint, not double-counted as a transfer | WAY-6 |
| Time | Departure time in the past | Warn and offer "Leave now" | TIME-5 |
| Time | Date beyond the schedule window | "Schedules are available until <date>" | TIME-5, DATA-2 |
| Time | Daylight-saving transition days; trips crossing midnight | Correct Seattle-local times; "+1" on next-day times | TIME-4 |
| Time | Device timezone differs from Seattle | Show Seattle time, labelled | TIME-4 |
| Services | Routing engine down | "Temporarily unavailable" message (not "no routes"); health check fails | ERR-2, API-4 |
| Services | Some candidate queries time out | Return partial results marked "may be incomplete", or time out cleanly by 30 s | ROUTE-6, REL-1 |
| Services | Geocoder down | Map picking still works; message shown | US-1 |
| Services | Basemap tiles fail | Plain background with routes and markers, plus a notice | ERR-3 |
| Services | Schedule data expired | Health check fails; banner; refresh runbook triggered | DQ-2 |
| Client | Offline, or the request fails mid-flight | Keep the inputs; "You're offline" or "retry" | ERR-2 |
| Client | Rapid repeated searches | The latest search wins; rate-limit message if exceeded | ERR-4, API-7 |
| Client | Small screen | The map and the panel can be toggled; no horizontal scroll | RESP-1 |

---

## 11. Success metrics

### 11.1 Metrics and targets

| Category | Metric | MVP target | How measured | When |
|---|---|---|---|---|
| Usability | Task success: plan a walk + transit trip and say where to transfer, unassisted | ≥ 80% of participants | Moderated test, ≥ 5 participants (M2), ≥ 8 (M3), mostly UW students | M2, M3 |
| Usability | Task success: add a waypoint and identify the segment through it | ≥ 70% | Same sessions | M2, M3 |
| Usability | Median time to first itinerary for a new user | ≤ 60 s | Session timing | M2, M3 |
| Usability | System Usability Scale (SUS) | ≥ 70 | Post-test questionnaire | M3 |
| Quality | Benchmark origin–destination pairs that return ≥ 1 valid itinerary during service hours | ≥ 95% | Automated run on the benchmark set (§11.2) | Each milestone |
| Quality | Spot-checked transit legs consistent with published schedules | ≥ 95% (DQ-1) | 20+ legs checked by hand per milestone | M1–M3 |
| Quality | Itineraries violating permitted modes, or skipping or misordering waypoints | 0 | Automated assertions on the benchmark set | Every CI run |
| Quality | Requests where the result count < 5 even though more distinct routes exist | Tracked; trend down | Benchmark comparison against raw routing output | M1–M3 |
| Performance | p95 plan latency (0 / 1 / 3 waypoints) | ≤ 5 / 10 / 20 s | Benchmark against the hosted environment | M1–M3 |
| Reliability | Plan requests ending in a server error (excluding legitimate "no route") | < 2% | Logs during test periods | M3 |
| Reliability | Demo failures | 0 | Demo log | Each demo |
| Accessibility | Serious or critical axe violations on core screens | 0 | Automated scan in CI | Every CI run |
| Engineering | Must requirements with a passing acceptance test | 100% at MVP | Traceability table | M2 |
| Engineering | CI green on `main` | ≥ 95% of days | CI history | Ongoing |
| Adoption *(optional)* | Distinct testers who complete a trip plan on the hosted app | ≥ 25 in Spring | Privacy-preserving counts only (no personal data, PRIV-1) | M3 |

**Guardrails:** don't optimise usage at the expense of privacy (PRIV-1), and don't show more results by padding with near-duplicates (ROUTE-2).

### 11.2 Benchmark origin–destination set (to be finalised in M0)

The set has 30–50 origin–destination pairs across personas, times of day and the service area, plus 10 waypoint journeys. Illustrative pairs:

| Pair | What it exercises |
|---|---|
| UW Seattle ↔ Capitol Hill | Core student trip |
| U District ↔ Sea-Tac Airport | Long rail trip, visitor |
| Ballard ↔ UW | Bus-only corridor, transfers |
| Redmond ↔ South Lake Union | Eastside, bike + transit |
| West Seattle ↔ Downtown | Water crossing, bus vs. water taxi |
| Fremont ↔ Capitol Hill | Ship Canal crossing (R5) |
| Northgate ↔ First Hill | Rail + walk or streetcar |
| Late-night and weekend variants | Service gaps |

---

## 12. Explicit out-of-scope features (MVP)

| Out of scope | Reason | Where it goes |
|---|---|---|
| User accounts, login, saved places or trips, history | Privacy and scope (PD-9) | Future |
| Cost display, fare and gas estimation, time-vs-cost slider | Concept defers it; prices unsourced (PD-1) | Future (code Hidden) |
| Driving, park & ride, taxi or rideshare legs | Concept lists them as future; unsourced pricing (PD-2) | Future (code Hidden) |
| Real-time arrivals, delays, alerts, dynamic rerouting | Requires real-time feeds and trip tracking | Future |
| Turn-by-turn navigation, live trip tracking | Different product surface | Not planned |
| Ticketing, payment, ORCA integration, booking rentals or rides | Partner integrations, payment compliance | Not planned |
| Waypoint order optimisation; > 3 waypoints; arrive-by with waypoints | Complexity and latency (PD-3) | Future |
| Pass-through "via" constraints (e.g. "go via station X") | Different semantics from stop-and-visit | Future (evaluate) |
| Native iOS and Android apps | Web-first (PD-4); Expo app parked | Post-MVP |
| Guaranteed wheelchair-accessible routing | Needs data validation; the product must not claim it | Future |
| Bike carried on board transit | Needs OTP configuration and data checks | Future (Could in M3) |
| Offline use | Requires on-device data | Not planned |
| Areas outside the service area; multiple cities | Data and validation scope | Year 2 |
| Any AI or LLM feature, chat interface | No justified MVP need (PD-10, §6.2) | Post-MVP, by criteria |
| Languages other than English | Capacity | Future |
| Group trips, multi-day trips, freight | Not target use cases | Not planned |
| Admin dashboards and analytics beyond PRIV-1-compliant counts | Not needed for MVP goals | Not planned |

---

## 13. Assumptions and technical dependencies

### 13.1 Assumptions

| ID | Assumption | If wrong | Validate by |
|---|---|---|---|
| AS-1 | Using OpenTripPlanner for pathfinding is acceptable to the course (PD-6) | A custom C++ router enters MVP scope; timeline at risk | Instructor answer (Q1), M0 |
| AS-2 | The Puget Sound consolidated GTFS feed stays available, and its terms allow use in a student project | Switch to per-agency feeds; licence review | Check feed terms, M0 |
| AS-3 | An OSM extract covering King County builds into an OTP graph within available memory (≤ 8 GB target) | Smaller area, more memory, or a hosted alternative | Trial build, M0 |
| AS-4 | OTP 2.10's API can provide the leg details the MVP needs: intermediate stops, headsign, agency, stop identifiers, transit sub-mode. The sub-mode is already returned; the other fields are *believed* available but unconfirmed | Derive them from GTFS via the pandas stop table, or upgrade OTP | Query spike, M0 |
| AS-5 | Waypoints can be built by chaining per-segment queries: each segment departs at the previous arrival plus dwell, keeping the best few partial journeys after each segment. OTP's own via-point support may simplify this, but its coverage of our cases is unverified | Higher latency; tighter waypoint cap | Prototype, early M2 |
| AS-6 | Public Photon geocoding and OpenFreeMap tiles are acceptable at demo and test volumes | Self-host or use a paid tier (COST-1) | Usage check, M1 |
| AS-7 | Scheduled (not real-time) data gives enough value for the MVP | Real-time moves earlier | User interviews, M0 |
| AS-8 | Team capacity is ~4–6 students for ~3 quarters. **Unconfirmed** | Re-scope: drop Should items first, then reduce waypoints to 1 | Team agreement, M0 |
| AS-9 | Usability testing with UW students is allowed under course policy | Use team or peer testing only | Ask course staff (Q3) |

### 13.2 Technical dependencies

| Dependency | Version / source | Used for | Status | Risk / fallback |
|---|---|---|---|---|
| React + TypeScript + Vite | React 19.1, Vite 7, TS ~5.8 | Web frontend | In repo | Low |
| MapLibre GL JS | 5.x (locked 5.24.0) | Map rendering | In repo | Low. Open source, no API key |
| OpenFreeMap | Public tile service | Basemap | In repo | Fair-use, no service guarantee → self-host or alternative provider |
| Photon | Public `photon.komoot.io` | Geocoding | In repo | Fair-use, no service guarantee; must be restricted to the area → self-host or alternative |
| Python + FastAPI | Python 3.12, FastAPI ≥ 0.115, Pydantic 2, httpx | Planning API | In repo | Pin versions; add a lockfile (E5) |
| OpenTripPlanner | 2.10.0, Java 21, ~8 GB heap | Street and transit pathfinding | In repo | Memory and hosting (E3); API field coverage (AS-4) |
| C++20 toolchain | CMake ≥ 3.20, nanobind ≥ 2.4, scikit-build-core, Catch2 3.8 | Ranking and composition engine (PD-6) | In repo (pricing and Pareto today) | Build complexity; keep a Python fallback until C++ owns unique logic |
| pandas | to be added | GTFS validation, stop table, coverage checks (DATA-2 to DATA-4) | **Planned** | Low |
| GTFS | Puget Sound consolidated feed | Transit schedules | In repo config | AS-2 |
| OpenStreetMap | BBBike "Seattle" extract (to be replaced for King County coverage) | Street network | In repo config | R1, AS-3 |
| GBFS | Lime Seattle feed | Bike-share and scooter (Should) | In repo config | Startup timeouts (R5) |
| GitHub | Repository, PRs, Actions | Collaboration, CI | Repo yes, CI no | Set up in M0 |
| Hosting | TBD | Demo environment | **Not decided** | Q4 |

### 13.3 Architecture implications for the baseline (proposal)

These are the changes needed in existing components to meet this PRD. They are listed for planning, not implemented here.

1. **OTP query and model.** Request headsign, agency, stop details and intermediate stops. Keep the transit sub-mode instead of collapsing it to `TRANSIT`.
2. **Ranking.** Change from (duration, cost) to (duration, transfers, walking), and make results distinct by route sequence (PD-7). Ranking already exists in Python and C++, so the PD-6 decision decides which copy evolves.
3. **Waypoint composition.** A new module that chains segments and keeps the best partial journeys after each one. This is the natural home for the C++ algorithm work (PD-6).
4. **Transfer-point derivation.** A pure function over legs, returned in the API.
5. **Configuration.** Feature flags to hide out-of-MVP modes and cost. A service-area polygon replaces the bbox.
6. **Data module.** A new Python + pandas package for validation, the stop table and coverage checks.
7. **API contract.** Generate TypeScript types from OpenAPI before the response shape grows (A3).
8. **Prerequisite fixes from the analysis.**
   - Must: D1 (Docker), D2 (outage vs. no route), CI.
   - When the related modes are re-enabled: D3 (park & ride drop) and D4 (arrive-by in taxi stitching).

### 13.4 Open questions

| # | Question | For | Blocks |
|---|---|---|---|
| Q1 | Must the team implement its own routing algorithm, or is building on OTP acceptable? | Course staff | PD-6, AS-1 |
| Q2 | Is the King County service area acceptable? Do UW Bothell and UW Tacoma need to be in scope? (Tacoma is in Pierce County.) | Team / course staff | PD-5 |
| Q3 | Are usability studies with UW students allowed, and is any approval needed? | Course staff | §11, AS-9 |
| Q4 | Where will the demo environment be hosted, and what is the budget for an ~8 GB routing server? | Team / course staff | COST-1 |
| Q5 | Team size, weekly capacity and component ownership? | Team | AS-8, phasing |
| Q6 | Is bike-share and scooter support worth MVP effort given the known OTP issues? | Team | MODE-6 |
| Q7 | Should cost come back in M3 if prices can be sourced in time? | Team | PD-1 |
| Q8 | Which competitors and behaviours go into the M0 competitive review (especially waypoints in transit mode)? | Team | §1.3 claims |
