# Repository Analysis: Multimodal Router

| | |
|---|---|
| **Snapshot** | commit `016a2e9`, checked out as local branch `Draft-Planning`. That branch is identical to `seattle-first-draft` / `origin/seattle-first-draft` (see §1.2) |
| **Analysed** | 2026-11-13 |
| **Scope** | Whole repository: structure, dependencies, entry points, tests, git history |
| **Not changed** | No application code was modified. Tests were run from an out-of-tree virtualenv and build directory (see [Appendix A](#appendix-a-how-this-analysis-was-done)) |

### How to read this document

- **Sections 1–7 report facts.** Each one is something found in the repository or seen when the code ran. The evidence tags are:
  - **[Ran]**: verified by running code or tests.
  - **[Code]**: read in the source but not run.
  - **[Unverified]**: an inference that still needs checking.
- **Sections 8–11 are proposals.** They contain recommendations, decisions to make, and open questions. They are labelled as such, and the team should weigh them, not treat them as findings.

---

## 0. Summary

1. **`main` is empty. All the work is on `seattle-first-draft`.** `main` holds one commit with a two-line README. The current branch adds 3 commits (Oct 28–29, 2026) containing a working end-to-end prototype of about 5,800 lines.
2. **The prototype largely matches the planned stack for the frontend and API.** The frontend is React + TypeScript and the API is Python + FastAPI. It also adds an **Expo (React Native) mobile app** that is not in the plan.
3. **The C++20 code is not a routing engine.** Routing (pathfinding over streets and transit) is delegated to **OpenTripPlanner 2.10 (Java 21)**. The C++ core re-implements the *post-routing* steps (pricing, filtering, Pareto ranking, polylines) that already exist in Python, and the two are kept bit-identical by parity tests.
4. **There is no pandas and no transit-data processing.** GTFS and OSM files are downloaded and handed straight to OTP.
5. **The mapping library is already chosen in practice.** The web app uses **MapLibre GL JS 5** with OpenFreeMap tiles. The mobile app uses **react-native-maps**.
6. **All test suites pass [Ran]:** pytest 33/33 with the C++ module (25 + 8 skipped without it), Catch2 21/21, TS score test 1/1. The real OTP routing path was **not** exercised. It needs large data downloads and an 8 GB graph build.
7. **Verified defects:**
   - The Docker image for the planner crashes on import.
   - Selecting *all* modes silently drops park & ride.
   - When OTP is down, the API returns "no routes" instead of an error.
   - "Arrive by" is ignored for taxi + transit trips.
8. **The biggest open decision** is whether OTP stays as the routing engine or the team builds its own in C++. Almost every other plan depends on it.

---

## 1. Branch and history

### 1.1 Commits

| Commit | Branch | Date | Author | Summary |
|---|---|---|---|---|
| `36a2c8c` | `main` | 2026-10-22 | Sophia Hsu | Initial commit: `README.md` containing `# Map` / `Husky Coding Project 2026` |
| `63fc721` | `seattle-first-draft` | 2026-10-28 | Robert Guo | Planner service, web app, mobile app, shared package, Seattle data setup |
| `b5b6599` | `seattle-first-draft` | 2026-10-29 | Robert Guo | UI redesign ("Swiss transit-signage" design system), accessibility work |
| `016a2e9` | `seattle-first-draft` | 2026-10-29 | Robert Guo | C++20 core (`mmr_core`) with nanobind bindings, Catch2 tests, parity tests |

### 1.2 How the branch relates to the project

- **[Ran] The current branch, `Draft-Planning`, has no commits of its own.**
  - It is a **local-only** branch with no upstream.
  - It was created on 2026-11-13 from `seattle-first-draft` and points at the same commit (`016a2e9`).
  - So everything below about `seattle-first-draft` applies to it unchanged.
  - Its only difference is this untracked `docs/` folder.
- **[Ran]** `main` is an ancestor of `seattle-first-draft`, so merging the branch would be a fast-forward. The diff is 101 files and +16,275 lines, most of it `package-lock.json`.
- **[Ran]** The branch has not been merged. Whether a PR exists or has been reviewed is unknown, because the GitHub CLI was not authenticated on this machine.
- **[Code]** In practice the branch *is* the project. The structure, README, scripts, and tests all live there.
- **[Ran]** All three branch commits carry a `Co-Authored-By: Claude Opus 5.5` trailer. Each one is a large single commit, between ~2k and ~10k lines.
  - Implication: the team should review it the way it would review any large external contribution before treating it as shared knowledge.
- **Naming is inconsistent [Code]:**

  | Where | Name used |
  |---|---|
  | Repository | `Multimodal-Map` |
  | `main` README | "Map" |
  | Branch README | "Multi-modal Router" |
  | npm root package | `multimodal-router` |
  | Web page title | "Multimodal — Seattle" |
  | Mobile app | "Multi-modal Router" |

---

## 2. Current repository structure

Line counts exclude `package-lock.json`.

```
Multimodal-Map/
├── README.md                    Setup, design system, ranking, C++ core, known issues (112 lines)
├── package.json                 npm workspaces (apps/*, packages/*) + task scripts
├── package-lock.json            ~800 npm packages locked
├── docker-compose.yml           OTP + planner containers (alternative to local scripts)
├── .gitignore                   node_modules, .venv, data/, *.pbf, graph.obj, *.jar, build/, *.so, .env*
│
├── apps/
│   ├── web/                     React 19 + Vite 7 + MapLibre GL 5 (entry: src/main.tsx → App.tsx)
│   │   └── src/components/      PlaceSearch, ModePicker, CostTimeSlider, RouteRow, TripStrip, LegList, MapView
│   └── mobile/                  Expo SDK 54 / React Native 0.81 / expo-router 6 (entry: expo-router/entry)
│       ├── app/                 _layout, index (search), results, trip/[id]
│       ├── components/          PlaceInput, ModeChips, Field, ItineraryRow, TripStrip, TripMap
│       └── lib/                 api, theme, trip-store (React context)
│
├── packages/
│   └── shared/                  @mmr/shared: API types, fetch client, rerank, polyline decode, formatting
│       └── test/                score parity test + score-cases.json (shared with Python/C++)
│
├── services/
│   ├── planner/                 Python 3.12 FastAPI service (entry: planner/main.py → `app`)
│   │   ├── planner/             main, planner (orchestration), templates, otp_client, fake_router,
│   │   │                        taxi_stitch, cost_model, fares, pareto, models, modes, config, _native
│   │   ├── core/                C++20 library `mmr` + Python module `mmr_core` (nanobind, scikit-build-core)
│   │   │   ├── include/mmr/     types, itinerary, fares, cost_model, filters, pareto, polyline
│   │   │   ├── src/             implementations + bindings.cpp
│   │   │   └── tests/           Catch2 tests (fetched from GitHub at configure time)
│   │   ├── tests/               pytest: API (fake router), cost model, pareto, templates, OTP modes, parity
│   │   └── Dockerfile
│   └── otp/                     OTP build-config.json / router-config.json templates
│
├── cities/
│   ├── seattle.yaml             bbox, data URLs (OSM, GTFS, GBFS), PLACEHOLDER prices
│   └── example.yaml             template for another city
│
└── scripts/
    ├── fetch_data.py            downloads OTP jar, OSM extract, GTFS; writes OTP config with GBFS updaters
    └── otp.sh                   runs OTP locally: `build` (graph) or `serve`
```

### 2.1 Entry points

| Component | Entry point | Start command (from README / package.json) |
|---|---|---|
| Planner API | [services/planner/planner/main.py](../services/planner/planner/main.py) (`app`) | `npm run planner` (uvicorn :8000) or `npm run planner:fake` |
| Web | [apps/web/src/main.tsx](../apps/web/src/main.tsx) | `npm run web` (Vite :5173) |
| Mobile | `expo-router/entry` → [apps/mobile/app/_layout.tsx](../apps/mobile/app/_layout.tsx) | `npm run mobile` |
| OTP | [scripts/otp.sh](../scripts/otp.sh) | `npm run otp` (:8080) |
| Data | [scripts/fetch_data.py](../scripts/fetch_data.py) | `python scripts/fetch_data.py cities/seattle.yaml` |
| C++ core | [services/planner/core/CMakeLists.txt](../services/planner/core/CMakeLists.txt) | `npm run core:build`, `npm run core:test` |

### 2.2 Dependencies (declared)

| Area | Dependencies |
|---|---|
| Python ([requirements.txt](../services/planner/requirements.txt)) | fastapi ≥0.115, uvicorn ≥0.32, httpx ≥0.28, pydantic ≥2.9, pyyaml ≥6.0, pytest ≥8.3 (lower bounds only, no lockfile) |
| C++ build | CMake ≥3.20, a C++20 compiler, scikit-build-core ≥0.10, nanobind ≥2.4; Catch2 v3.8.1 via `FetchContent` |
| Web | react 19.1, react-dom 19.1, maplibre-gl ^5.6 (locked 5.24.0), vite ^7 (locked 7.3.7), typescript ~5.8 |
| Mobile | expo ~54, react-native 0.81.5, expo-router ~6, react-native-maps 1.20.1, expo-location, expo-font, slider; typescript ~5.9 |
| Runtime services | OpenTripPlanner 2.10.0 (Java 21, `-Xmx8g` default), Photon geocoder (public `photon.komoot.io`), OpenFreeMap tiles (public) |
| Data sources | BBBike "Seattle" OSM extract, Puget Sound consolidated GTFS (`gtfs.sound.obaweb.org`), Lime GBFS |

---

## 3. Planned stack compared with what exists

| Layer | Team plan | What the repository contains | Match? |
|---|---|---|---|
| Frontend | React + TypeScript | React 19 + TypeScript + Vite web app. **Also** an Expo / React Native mobile app | ✅ web. ➕ mobile is extra scope |
| Backend API | Python + FastAPI | FastAPI service with 5 endpoints | ✅ |
| Routing / optimization engine | C++20 | **Routing = OpenTripPlanner 2.10 (Java)**. C++20 code covers pricing, filters, Pareto ranking and polylines only, and duplicates the Python versions | ⚠️ **Mismatch** |
| Transit data processing | Python, pandas | No pandas anywhere. GTFS is downloaded and checked for required file names, then OTP ingests it directly | ❌ Absent |
| Mapping library | To be decided | Web: **MapLibre GL JS 5** with OpenFreeMap vector tiles (positron/dark). Mobile: **react-native-maps** (Apple Maps on iOS, Google Maps on Android) | ✅ decided in practice |

---

## 4. Existing architecture

### 4.1 Components

```
┌──────────────┐   ┌───────────────┐
│ apps/web     │   │ apps/mobile   │     both import @mmr/shared
│ React+Vite   │   │ Expo / RN     │     (types, PlannerClient, rerank, polyline, format)
│ MapLibre     │   │ react-native- │
└──────┬───────┘   │ maps          │
       │ HTTP/JSON └──────┬────────┘
       └────────┬─────────┘
                ▼
┌─────────────────────────────────────────────┐        ┌─────────────────────────┐
│ services/planner  (FastAPI, Python 3.12)    │──GET──▶│ Photon (public geocoder) │
│                                             │        └─────────────────────────┘
│ templates → route (parallel) → price →      │
│ filter → rank                               │ GraphQL ┌─────────────────────────┐
│                                             │────────▶│ OpenTripPlanner 2.10    │
│ _native.py ──▶ mmr_core (C++20, nanobind)   │  POST   │ (Java 21, graph.obj)    │
│   fallback: pure-Python implementations     │         │ OSM + GTFS + GBFS       │
│ FakeRouter (PLANNER_FAKE_ROUTER=1)          │         └───────────▲─────────────┘
└─────────────────────────────────────────────┘                     │ built from
                                                         data/seattle/ ◀── scripts/fetch_data.py
                                                         cities/seattle.yaml (data URLs, prices)
```

### 4.2 API ([main.py](../services/planner/planner/main.py)) [Code, partly Ran]

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ok, fake_router, native}` |
| GET | `/v1/city` | name, currency, bbox, centre, modes. **Neither app calls it.** |
| POST | `/v1/plan` | origin, destination, `when`, `arrive_by`, `modes[]`, `prefs` → up to 5 itineraries |
| GET | `/v1/geocode?q=` | proxy to Photon, biased towards the city centre |
| GET | `/v1/reverse?lat&lon` | proxy to Photon reverse geocoding. **Neither app calls it.** |

The API is versioned under `/v1`, with no auth, `CORS allow_origins=["*"]`, and no persistence. The service is stateless.

### 4.3 What happens on `POST /v1/plan` [Code]

1. **Templates.** [templates.py](../services/planner/planner/templates.py) turns the selected modes into trip shapes such as `WALK`, `CAR`, `WALK+TRANSIT+WALK`, `BIKE+TRANSIT+SCOOTER`, or `CAR+TRANSIT+WALK` (park & ride). Shapes are sorted by complexity and capped at 12.
2. **Routing.** [planner.py](../services/planner/planner/planner.py) routes every template in parallel (`asyncio.gather`):
   - **Normal shapes** go out as one OTP `planConnection` GraphQL query each, with `first=3` ([otp_client.py](../services/planner/planner/otp_client.py)).
   - **Taxi ↔ transit shapes** can't be planned by OTP in one query. [taxi_stitch.py](../services/planner/planner/taxi_stitch.py) handles them: it finds the 3 nearest rail/tram/ferry stops within 8 km, then makes 2 OTP calls per stop.
   - **Taxi** is routed as `CAR` and relabelled afterwards.
3. **Pricing.** [cost_model.py](../services/planner/planner/cost_model.py) and [fares.py](../services/planner/planner/fares.py) price each leg:
   - car fuel, plus destination parking or a flat park & ride fee;
   - taxi base + per-km + per-minute, with a minimum fare;
   - rental unlock + per-minute;
   - transit: a flat fare per journey, with free transfers inside a 120-minute window.
4. **Filtering.** Itineraries over the maximum walk distance or maximum transfers are dropped, and so are those using modes the user did not select.
5. **Ranking.** [pareto.py](../services/planner/planner/pareto.py) does four things:
   - keeps the best itinerary per mode sequence;
   - takes the Pareto front on (duration, cost);
   - tops the list up to 3 results and caps it at 5;
   - labels results **Fastest**, **Cheapest** and **Best balance**, where score = `cost + value_of_time × hours + transfer_penalty × transfers`.
6. **Client-side re-ranking.** The apps re-score locally with the same formula when the user moves the cost/time slider ([rank.ts](../packages/shared/src/rank.ts)).

### 4.4 The C++ core and the Python bridge [Code + Ran]

- [_native.py](../services/planner/planner/_native.py) is the only module that imports `mmr_core`. Every Python function checks `_native.NATIVE` and calls C++ if the module is built. Otherwise it falls back to Python. `PLANNER_PURE_PYTHON=1` forces the fallback.
- C++ covers: `fares`, `cost_model`, `filters`, `pareto` (an O(n log n) sweep), `itinerary` (derived values) and `polyline` (encode/decode).
- C++ does **not** cover templates, OTP calls, taxi stitching, or any graph search.
- C++ is built with `-ffp-contract=off` and Python-style rounding, so prices match Python bit for bit. [test_native_parity.py](../services/planner/tests/test_native_parity.py) runs randomised comparisons, and [score-cases.json](../packages/shared/test/score-cases.json) is checked by Python, C++ and TypeScript.

### 4.5 Data pipeline [Code]

- `cities/seattle.yaml` → `fetch_data.py` downloads the OTP jar, the OSM `.pbf` and the GTFS zip. It checks that the GTFS zip contains the required `.txt` files and writes OTP's `router-config.json` with a GBFS `vehicle-rental` updater.
- `otp.sh seattle build` then builds `data/seattle/graph.obj`. The README estimates ~5–10 minutes with an 8 GB heap.
- **No real-time transit (GTFS-RT) updater is configured.** Itineraries use scheduled times only. Live bike and scooter availability comes from the Lime GBFS feed.

---

## 5. Implemented functionality: status

**Legend:**

- **Functional:** works end to end.
- **Mock:** a stand-in for a real dependency.
- **Partial:** implemented with known gaps.
- **Absent:** not in the repository.

| Area | Feature | Status | Evidence |
|---|---|---|---|
| API | `/health`, `/v1/city`, `/v1/plan` | Functional | [Ran] with the fake router, Python and C++ paths |
| API | `/v1/geocode`, `/v1/reverse` (Photon proxy) | Implemented, not exercised | [Code] |
| Routing | Real street + transit routing through OTP 2.10 | Implemented, **not verified here** | [Code]. The README's "Known issues" suggest the author ran it |
| Routing | `FakeRouter`: straight lines × 1.3 detour at fixed speeds | **Mock**, functional | [Ran]. Used by `npm run planner:fake` and `test_api.py` |
| Routing | Taxi ↔ transit stitching | Partial | [Ran] with the fake router only. Ignores `arrive_by` (§6.1) |
| Routing | Park & ride (`CAR_PARKING`) | Partial | [Ran]. Dropped when all 6 modes are selected (§6.1) |
| Routing | Own bike vs rental, scooter rental (GBFS) | Implemented | [Code]. README notes scooters fall back to walking across the Ship Canal |
| Pricing | Car, taxi, rentals, flat transit fare + transfer window | Functional, **placeholder prices** | [Ran]. [seattle.yaml](../cities/seattle.yaml#L17) says "PLACEHOLDER PRICES" |
| Pricing | Zone, distance or agency-specific fares, reduced fares, GTFS-Fares | Absent | TODO in [fares.py](../services/planner/planner/fares.py#L3) |
| Ranking | Pareto front, labels, generalised-cost score | Functional | [Ran] |
| Ranking | CO₂ estimate per itinerary | Implemented (rough constants) | [Code] [modes.py](../services/planner/planner/modes.py#L15) |
| C++ core | Library, Python module and tests | Functional | [Ran] on macOS / Apple clang 21. Not tried on Linux or Windows |
| Data | Download OSM, GTFS, OTP jar; write OTP config | Implemented, not run | [Code] |
| Data | GTFS processing / analysis with pandas | **Absent** (planned only) | No pandas dependency or code |
| Web | Place search (ARIA combobox), "use location", map-click pins, mode picker, depart/arrive + date-time, results with labels, cost/time slider, leg list, route polylines, light/dark | Implemented, not run here | [Code]. `npm install` was not run |
| Mobile | Search → results → trip screens, location, slider, native map | Partial | [Code]. **No time picker** ("Leaving now"), and `arriveBy` state is unused ([index.tsx](../apps/mobile/app/index.tsx#L100), [trip-store.tsx](../apps/mobile/lib/trip-store.tsx#L29)) |
| Shared TS | Types, client, rerank, polyline decode, formatting | Functional | [Ran] the score parity test |
| Infra | Local scripts (`otp.sh`, npm scripts) | Implemented | [Code] |
| Infra | Docker Compose | **Broken** (planner crashes on import) | [Ran] path check (§6.1) |
| Infra | CI, linting, deployment, monitoring | Absent | No `.github/`, no ESLint/Prettier, no deploy config |
| Product | Accounts, saved trips, history, real-time delays, alerts, accessibility routing (wheelchair) | Absent | — |

### 5.1 Test results [Ran]

| Suite | Command (out-of-tree) | Result |
|---|---|---|
| pytest, pure Python | `PLANNER_PURE_PYTHON=1 pytest` | 25 passed, 8 skipped (parity tests need `mmr_core`) |
| pytest, with C++ module | `pytest` | **33 passed** |
| Catch2 (C++) | `cmake` + `ctest` | **21/21 passed** |
| Shared TS score parity | `node --test 'test/*.test.ts'` (Node 26) | **1/1 passed** |
| Web / mobile typecheck | `npm run typecheck` | **Not run** (needs `npm install` of ~800 packages) |
| Real OTP integration | — | **Not run**, and no automated test exists |

There are **no tests for the UI components or for the real OTP client against a live server.** `test_api.py` covers the fake router only.

---

## 6. Technical debt, inconsistencies and integration risks

Severity: **H** blocks a common path or misleads users · **M** wrong in some cases or slows the team · **L** cosmetic or hygiene.

### 6.1 Verified defects

| # | Sev | Issue | Evidence |
|---|---|---|---|
| D1 | H | **The Docker planner crashes at startup.** `REPO_ROOT = Path(__file__).resolve().parents[3]` raises `IndexError` when the file lives at `/app/planner/main.py`, because only 3 parents exist. Setting `CITY_CONFIG` does not help, because the default value is evaluated eagerly. | [main.py:22-23](../services/planner/planner/main.py#L22-L23), [Dockerfile](../services/planner/Dockerfile). [Ran] the path evaluation, not a Docker build |
| D2 | H | **When OTP is down, users see "no routes" instead of an error.** Per-template exceptions are logged and swallowed. If every template fails, `/v1/plan` returns `200 {"itineraries": []}` and the UI shows "No routes with these modes. Try allowing more." | [planner.py:47-54](../services/planner/planner/planner.py#L47-L54), [App.tsx:50](../apps/web/src/App.tsx#L50) [Code] |
| D3 | M | **Selecting more modes removes park & ride.** With all 6 modes there are 21 trip shapes. The 12-shape cap drops `CAR+TRANSIT+WALK` and every two-sided combination such as `BIKE+TRANSIT+SCOOTER`. | [templates.py:56-57](../services/planner/planner/templates.py#L56-L57) [Ran] |
| D4 | M | **"Arrive by" is ignored for taxi + transit.** Every `router.plan` call in `taxi_stitch` passes `arrive_by=False`. | [taxi_stitch.py:20-35](../services/planner/planner/taxi_stitch.py#L20-L35) [Code] |
| D5 | L | **`cities/example.yaml` doesn't work with `fetch_data.py`.** It has no `data:` block and puts `gbfs` at the top level, but `fetch_data.py` reads `city["data"]`. | [example.yaml:35](../cities/example.yaml#L35), [fetch_data.py:66](../scripts/fetch_data.py#L66) [Code] |
| D6 | L | **Docker Compose OTP rebuilds the graph on every start** (`--build --save --serve`). The comment says to switch it by hand. Its heap is 4 GB, while `otp.sh` defaults to 8 GB. | [docker-compose.yml:8-11](../docker-compose.yml#L8-L11), [otp.sh:11](../scripts/otp.sh#L11) [Code] |

### 6.2 Architectural inconsistencies

| # | Sev | Issue |
|---|---|---|
| A1 | H | **The planned "C++ routing engine" does not exist.** Routing is OpenTripPlanner (Java). The C++ code is a second copy of the pricing and ranking logic. The team needs to decide C++'s real role (Decision 1). |
| A2 | M | **Pricing and ranking are implemented twice.** Every change to them must be made in Python *and* C++ and kept bit-identical, enforced by parity tests. Each request ranks only a few dozen candidates, so latency is almost certainly dominated by OTP HTTP calls, not this computation **[Unverified, no profiling done]**. Today the C++ core adds build complexity (compiler, CMake, nanobind) without a measured benefit. |
| A3 | M | **Data models are written out four times by hand:** Python dataclasses ([models.py](../services/planner/planner/models.py)), Pydantic API models ([main.py](../services/planner/planner/main.py#L42-L106)), C++ structs ([types.hpp](../services/planner/core/include/mmr/types.hpp)) and TS interfaces ([types.ts](../packages/shared/src/types.ts), which has its own TODO to generate from OpenAPI). Default prices and the CO₂ table are also duplicated between Python and C++. |
| A4 | M | **Scope drift: the brief says "web application", but the repo also maintains a full mobile app.** Every UI feature has to be built twice. The mobile app already lags the web app (no time picker, no arrive-by). |
| A5 | M | **The city is hard-coded in the frontends.** The map centre constant, page title and "Seattle" heading are fixed in code, and `/v1/city` exists but is unused ([MapView.tsx:8](../apps/web/src/components/MapView.tsx#L8), [App.tsx:68](../apps/web/src/App.tsx#L68), [index.html:10](../apps/web/index.html#L10)). |
| A6 | L | **Server and client ranking disagree slightly.** Which ≤5 itineraries are returned depends on the value of time at request time, but the slider only re-labels "Best balance" among the results already returned. It can never bring back an option the server dropped. |

### 6.3 Missing dependencies and environment risks

| # | Sev | Issue |
|---|---|---|
| E1 | M | **The README quick start can pick the wrong Python.** It runs `python3 -m venv`, and on this machine `python3` is the macOS system Python 3.9.6. The code needs ≥3.11 for `StrEnum`, and `pyproject.toml` requires 3.12. Nothing pins the version (no `.python-version`). |
| E2 | M | **The shared TS test may fail on Node 20.** It runs `.ts` files directly with `node --test`. That needs a Node version with built-in TypeScript type stripping (22.18+ / 23.6+ per Node's release notes), but the README says "Node 20+". There is no `engines` field or `.nvmrc`. It passes on Node 26 [Ran]. Node 20 was not tested. |
| E3 | M | **Heavy local requirements for the real routing path:** Java 21, an 8 GB heap, multi-hundred-MB downloads, and a 5–10 minute graph build. Not every team laptop may manage it. Without them, developers only see the fake router. |
| E4 | M | **Free public services are used with no fallback.** Photon (`photon.komoot.io`) handles geocoding and OpenFreeMap provides the basemap tiles. Both are public, fair-use services with no SLA. |
| E5 | L | **Python dependencies have lower bounds only and no lockfile.** `pytest` is a runtime dependency and ships in the Docker image. `ruff` is configured but not installed. There is no linter or formatter for TypeScript. |
| E6 | L | **Building the C++ tests needs network access**, because Catch2 is fetched from GitHub. `cmake` is not installed on this machine. It came from pip in the scratch venv. |
| E7 | L | **Mobile release builds will need extra configuration [Unverified, from library docs]:** react-native-maps on Android needs a Google Maps API key outside Expo Go, and none is configured. The bundle identifiers are placeholders (`com.example.mmr`). |

### 6.4 Integration and data risks

| # | Sev | Issue |
|---|---|---|
| R1 | H | **"Greater Seattle" vs. the data actually loaded.** The configured bbox `[-122.46, 47.48, -122.22, 47.74]` covers roughly the City of Seattle and excludes Bellevue, Redmond, Everett and Tacoma. The GTFS feed covers the whole Puget Sound region, and the OSM extract is BBBike's "Seattle" area. **[Unverified]** whether that extract covers the Eastside or the north and south suburbs. If it doesn't, OTP can't reach transit stops outside it. `test_api.py` plans a trip to Redmond, which only works because it uses the fake router. |
| R2 | M | **Each request fans out to many OTP calls.** One `/v1/plan` can make up to ~24 OTP GraphQL calls (12 templates, two of them taxi-stitched at 7 calls each). Each call has a 10 s timeout, and there is no caching or rate limiting. Latency and OTP load under concurrent users have not been measured. |
| R3 | M | **Prices are placeholders,** so the "Cheapest" and "Best balance" labels are only indicative. The fare model is one flat fare with a transfer window. Distance-based or agency-specific fares (e.g. Sounder, ferries) and reduced fares are not modelled. |
| R4 | M | **No real-time transit data.** There is no GTFS-RT updater, so times are scheduled times only. |
| R5 | L | **Known OTP behaviour issues are documented in the README:** scooters fall back to walking across the Ship Canal, and the Lime feed times out on startup. |
| R6 | L | **The mobile trip detail screen depends on in-memory state**, so `/trip/[id]` shows "Trip not found" after a reload or deep link. Itinerary IDs (`{index}-{template}`) change between requests. |

---

## 7. Missing components

These are absent from the repository. Whether each one is *needed* is a team decision (§9).

- **Transit data processing layer** (planned: Python + pandas). This would cover GTFS filtering, validation, stop and hub tables, fare tables, and data-quality reports.
- **Own routing algorithm** (planned: C++20), if the course or team expects one rather than OTP.
- **CI pipeline** to run the existing pytest, ctest, Node tests and typecheck on PRs.
- **Linting and formatting** for TS (ESLint/Prettier) and Python (ruff is configured but not installed).
- **Toolchain pinning:** `.python-version`, `.nvmrc` or `engines`, and a Python lockfile.
- **OTP integration test** against a small fixture graph, plus UI component or end-to-end tests.
- **API contract tooling** to generate TS types from FastAPI's `/openapi.json`.
- **Real price data** with documented sources (ORCA/transit fares, Lime pricing, taxi or rideshare rates, parking).
- **Error handling and observability:** a distinct "routing unavailable" response, structured logging, request timing.
- **Deployment target and configuration** (hosting for an 8 GB OTP instance, environment-specific CORS, secrets).
- **Contributor docs:** architecture overview, CONTRIBUTING / branching rules, ownership. There is also no `LICENSE`.

---

## 8. What to preserve (recommendation)

> *Proposal.* Based on what passed tests and fits the planned stack.

**Keep as the baseline:**

| Component | Why |
|---|---|
| Overall monorepo layout (`apps/`, `packages/shared`, `services/planner`, `cities/`, `scripts/`) | Clear separation that already matches the planned stack |
| FastAPI service structure: [main.py](../services/planner/planner/main.py), [planner.py](../services/planner/planner/planner.py), [models.py](../services/planner/planner/models.py), [config.py](../services/planner/planner/config.py) | Small, readable, tested, and has `/v1` versioning |
| `Router` protocol + [fake_router.py](../services/planner/planner/fake_router.py) | Lets UI and ranking work go ahead without OTP. It is also the seam where any custom C++ router would plug in |
| [templates.py](../services/planner/planner/templates.py), [pareto.py](../services/planner/planner/pareto.py), [cost_model.py](../services/planner/planner/cost_model.py), [fares.py](../services/planner/planner/fares.py) | The core product logic (multimodal combination + time/cost trade-off), with good unit tests |
| [otp_client.py](../services/planner/planner/otp_client.py), [fetch_data.py](../scripts/fetch_data.py), [otp.sh](../scripts/otp.sh), [services/otp/](../services/otp/) | A working path to real routing, if OTP is kept |
| `cities/*.yaml` config pattern | Keeps prices and data sources out of code |
| `@mmr/shared` package | One source of client types and logic for any frontend |
| Web app ([apps/web/](../apps/web/)) including MapLibre `MapView` and the accessible `PlaceSearch` combobox | Matches the plan (React + TS) and settles the mapping-library choice |
| Shared [score-cases.json](../packages/shared/test/score-cases.json) cross-language fixture | A cheap guard against drift between server and client scoring |

**Keep, but decide its role before investing further:**

- **C++ core ([services/planner/core/](../services/planner/core/)).** It is well-built and tested, but it duplicates Python. Depending on Decision 1 it either becomes the home of a real routing or optimization algorithm, or is frozen.
- **Mobile app ([apps/mobile/](../apps/mobile/)).** It works partially. Keep it in the repo but out of MVP scope unless the team commits to two frontends.
- **The "Swiss" design system** ([styles.css](../apps/web/src/styles.css), [theme.ts](../apps/mobile/lib/theme.ts)). It is coherent and accessible. It is a product decision whether the team adopts it.

**Fix before relying on (see §6.1):** `Dockerfile` / `main.py` path handling, `docker-compose.yml` OTP command, template cap, OTP-down handling.

---

## 9. Technical decisions needed before implementation (recommendation)

> *Proposal.* Ordered by how much other work depends on each one.

### Decision 1: Routing engine. OTP or a custom C++ engine?
- **Options:**
  - **(a) Keep OTP** for pathfinding. C++ handles the multimodal optimization layer, which could be grown into something substantive: Pareto label-setting across legs, multi-criteria search over stitched combinations, or a parking and rental choice model.
  - **(b) Build a custom C++ router** (e.g. RAPTOR or CSA over GTFS plus a street graph from OSM). This is months of work for one region.
  - **(c) Hybrid:** OTP for streets and access/egress, custom C++ for the transit core.
- **Depends on:** course requirements (Open question Q1), team C++ capacity, timeline.
- **Recommendation:** (a) for the first milestone, because it keeps a working product. Revisit (c) only if an original algorithm is required, and benchmark it against OTP.

### Decision 2: What happens to the Python/C++ duplication?
- **Options:**
  - Keep both, with parity tests, as now.
  - Make C++ the only implementation (Python just binds to it).
  - Freeze C++ and treat Python as the source of truth until C++ has work only it can do.
- **Recommendation:** don't grow two copies. Pick one source of truth for each function.

### Decision 3: Product scope. Web only, or web + mobile?
- **Recommendation:** web only for the MVP, matching the brief. Park the mobile app.

### Decision 4: What "Greater Seattle" means, and which data covers it
- Define the service area: King County only, or King + Snohomish + Pierce?
- Then choose the OSM extract and bbox to match, and decide whether to clip GTFS to the area. Verify R1 first.

### Decision 5: Transit data pipeline and pandas
- Where pandas adds value depends on Decision 1. Candidates:
  - GTFS validation and service-calendar checks;
  - clipping the feed to the service area;
  - pre-computing hub and stop tables (today OTP's `nearest` query does this live);
  - extracting fare tables;
  - preparing input for a custom router.
- Also decide the refresh cadence and whether GTFS-RT is in scope.

### Decision 6: API contract ownership
- Recommendation: treat FastAPI's OpenAPI schema as the source of truth and generate `@mmr/shared` types from it. Agree how breaking changes are versioned (`/v1` already exists).

### Decision 7: Pricing and fare model
- Which costs matter: transit (ORCA rules, reduced fares), rideshare vs. taxi, parking, rentals.
- Where the numbers come from: static research or APIs.
- How "estimated" costs are shown to users.

### Decision 8: Hosting and external services
- Where OTP (8 GB heap) and the API will run, and on what budget.
- Whether to keep the public Photon and OpenFreeMap services or self-host or pay for them.

### Decision 9: Toolchain and workflow
- Pin Python 3.12 and a Node version.
- Choose CI (GitHub Actions is the natural fit).
- Set branch protection and a PR review policy.
- Decide whether `seattle-first-draft` is merged into `main` as the baseline.

### Decision 10: Mapping library (confirm)
- Recommendation: keep **MapLibre GL JS**. It is open source, needs no API key, and is already integrated. Decide on a tile provider for production (Decision 8).

---

## 10. Recommended next steps (proposal)

**Week 1: get to a shared baseline**
1. Team walkthrough of `seattle-first-draft`. The branch author can explain the request flow (§4.3) and the C++ bridge (§4.4).
2. Settle Decisions 1, 3 and 4. Confirm course requirements first (Q1).
3. Open a PR from `seattle-first-draft` to `main`, review it as a team, and merge it as the baseline. Enable branch protection on `main`.

**Weeks 1–2: make the baseline dependable**

4. Pin toolchains (`.python-version`, `engines` / `.nvmrc`) and fix the README quick start to use `python3.12` (E1, E2).
5. Add CI that runs the commands that already exist: pytest (pure Python and with the C++ module), `ctest`, `node --test`, and typecheck.
6. Fix the verified defects:
   - D1, Docker path;
   - D2, return 502/503 when routing is unavailable;
   - D3, make the template cap keep park & ride (or raise it);
   - D4, arrive-by for taxi stitching;
   - D5, example config;
   - D6, Compose OTP command.
7. Have at least one team member run the **real OTP path** end to end. Record setup time, graph build time, memory use and `/v1/plan` latency to settle R2 and E3.

**Weeks 2–4: start the planned work on solid ground**

8. Verify the OSM extract against the agreed service area, and switch extracts if needed (R1).
9. Stand up the data-processing module (Python + pandas) for whatever Decision 5 assigns it, starting with GTFS validation and clipping.
10. Generate TS types from OpenAPI and remove the hand-written copy (A3).
11. Replace placeholder prices with sourced values and record the sources next to the YAML (R3).
12. Use `/v1/city` in the web app instead of hard-coded Seattle values (A5).

---

## 11. Open questions

**For the instructor or course staff**
- **Q1.** Does the project have to implement its own routing algorithm (e.g. in C++), or is integrating OpenTripPlanner acceptable as long as the team builds the multimodal optimization on top of it?
- **Q2.** Is a mobile app expected, allowed, or out of scope?
- **Q3.** Are there deployment or demo requirements (hosted URL, hardware limits) that affect running an 8 GB OTP instance?

**For the team**
- **Q4.** What exactly is "Greater Seattle" for this project (which counties and cities)?
- **Q5.** Which modes are required for the MVP? Does "taxi" mean rideshare (Uber/Lyft) with live price estimates, or a static estimate?
- **Q6.** Is real-time data (GTFS-RT delays, service alerts) in scope?
- **Q7.** What should "optimization" mean to users: time vs. cost only (as now), or also CO₂, comfort, walking, accessibility?
- **Q8.** Do we adopt the existing design system and UI, or redesign?
- **Q9.** Who owns which component (frontend, API, routing/C++, data pipeline)?

**For the branch author**
- **Q10.** Was the real OTP routing path tested end to end, on which machine, and with what timings?
- **Q11.** Is there an open PR or review for `seattle-first-draft`? (This could not be checked: `gh` was not authenticated.)
- **Q12.** What drove the C++ core: a requirement, a performance measurement, or groundwork for future routing?
- **Q13.** Does the BBBike "Seattle" extract cover the Eastside and the suburbs reached by the GTFS feed?

---

## Appendix A: How this analysis was done

- Read every tracked source, config and test file, plus `git log --all` and `git diff main...HEAD`.
- **Tests were run without touching the repository:**
  - a virtualenv in a temporary scratch directory (Python 3.12 from Homebrew), with `pip install -r services/planner/requirements.txt`;
  - pytest with `PYTHONDONTWRITEBYTECODE=1 -p no:cacheprovider`;
  - the C++ core configured and built with CMake/Ninja into a scratch build directory, and installed into the scratch venv with `pip install -C build-dir=<scratch> ./services/planner/core`;
  - `node --test` for `packages/shared`, which needs no `npm install`.
- `git status` was clean before and after, apart from this new file. No branches were created or switched by the analysis.
- **Not done:**
  - `npm install` or typechecking;
  - running the web or mobile apps;
  - downloading OSM/GTFS data or building an OTP graph;
  - building the Docker images;
  - calling Photon.
- Local tool versions seen: Node 26.13, Python 3.12 (Homebrew; the system `python3` is 3.9.6), OpenJDK 21.0.13, Apple clang 21. `cmake` is not installed system-wide.
