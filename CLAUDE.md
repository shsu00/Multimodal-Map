# CLAUDE.md: Multimodal Router

A Greater Seattle multimodal journey planner (Husky Coding Project 2026, UW team). Users pick an origin, a destination and up to 3 ordered stopovers, choose walk, transit or bike, and compare up to 5 distinct itineraries. Each itinerary shows its legs, intermediate stops and transfer points.

**Current state:**
- The repository is a **working prototype plus planning docs**.
- Most of the planned architecture is **not implemented yet**.
- The plan is **decided** (2026-11-17). Docs label every item as Built, Partial or Planned. **Never describe planned functionality as implemented.**
- `main` holds only the initial commit. The prototype code is on `seattle-first-draft`. **`Draft-Planning` (this branch) holds the planning docs only:** `docs/`, `contracts/openapi.yaml`, `README.md` and this file. Code paths mentioned below refer to `seattle-first-draft`.
- **Getting docs into `main` (roadmap issue FND-01): copy the docs over; don't merge `Draft-Planning` as-is**, because that would delete the code.

## Rules (always)

- **Read the relevant doc before changing a subsystem** (see the doc map below). Follow the existing architecture and conventions.
- **Never invent implemented functionality.** Check the code or the doc's status column. If unsure, say so.
- **Keep TypeScript and FastAPI contracts consistent.** Change both sides in the same change (see API contract below).
- **Keep C++ routing logic out of the frontend.** The browser talks only to FastAPI.
- **No new dependencies without a stated justification.** Prefer what is already in the repo. Roadmap RM-6 lists the chosen tools.
- **Touch only files the task needs.** Never modify unrelated files, and never revert or overwrite changes you didn't make (check `git status` first; uncommitted or untracked work may be a teammate's).
- **Ask for review before major architectural changes:**
  - new services, processes or databases;
  - changing the API shape or the C++ binding contract;
  - replacing OTP;
  - reorganising directories.
- **Update the Markdown docs when an interface or the architecture changes** (`docs/*.md`, `contracts/openapi.yaml`, README).
- **Run the relevant checks before saying a task is done.** Report the commands and results. If something couldn't be run, say so.
- **State your assumptions, unconfirmed decisions you relied on, and anything left incomplete.**
- **Never commit, push or open a PR unless asked.** Never force-push or rewrite another developer's branch.

## Doc map: where to look

All docs are **decided** (decision tables PD-, AD-, API-, UX-, DS-, RM-). Changing a decision needs the team's agreement and an update to the doc that records it. Name the decision you followed.

| Need | Read |
|---|---|
| What exists in code, verified defects (D1–D6), risks | [docs/repository-analysis.md](docs/repository-analysis.md) |
| Scope, priorities (Must/Should), requirement IDs (MAP-, LOC-, WAY-, …), out of scope | [docs/product-requirements.md](docs/product-requirements.md) sections 0, 5, 7, 12 |
| System design, boundaries, data ownership, deployment | [docs/architecture.md](docs/architecture.md) sections 0, 3, 10, 15 |
| HTTP API: endpoints, schemas, errors, units, money rules | [docs/api-contract.md](docs/api-contract.md) + [contracts/openapi.yaml](contracts/openapi.yaml) |
| C++ engine design, algorithms, Python↔C++ contract, tests, benchmarks | [docs/routing-engine.md](docs/routing-engine.md) sections 0, 8–12 |
| Feeds, licences, attribution, pipeline stages, freshness | [docs/data-sources.md](docs/data-sources.md) sections 0, 6, 11, 12 |
| Screens (mobile + web), flows, mode tabs, states and error messages, accessibility, scope changes from UI v2 | [docs/user-flows.md](docs/user-flows.md) sections 0, 2–9 |
| Tokens, components, Figma links, CSS mapping | [docs/design-system.md](docs/design-system.md) |
| Phases, issue IDs (FND-, SKL-, BETA-, …), branching, PRs, CI, testing, DoD | [docs/roadmap.md](docs/roadmap.md) |
| Setup commands, how ranking and the C++ core work today, known issues | `README.md` on the `seattle-first-draft` branch |

## Project scope (MVP)

- **MVP:** responsive **web** app; walk, transit (with sub-modes) and own bike; search and map picks; up to 5 distinct itineraries ranked by time, transfers and walking; full leg detail; transfer points; **1 stopover in v1.0, up to 3 in v1.1**.
- **Not in the MVP:**
  - cost display (PD-1, keep `cost: null`);
  - car, taxi and park & ride (hidden, not deleted);
  - shared bikes and scooters;
  - real-time data;
  - AI.
- **Decided after the MVP (2026-11-16): optional accounts** (PD-9, requirements ACCT-1 to ACCT-11):
  - guest by default;
  - sign-up adds synced preferences, saved places and trip history;
  - design in [docs/architecture.md](docs/architecture.md) section 16 (Supabase for sign-in and the account database) and [docs/api-contract.md](docs/api-contract.md) section 17 (`/api/v1/me`);
  - work is roadmap ACC-01 to ACC-10, in v1.1 and v1.2. Don't start it before v1.0.
- **Also decided, after the MVP** (2026-11-17), see [docs/user-flows.md](docs/user-flows.md) section 0.2:
  - step-by-step navigation on scheduled times: web in v1.1;
  - the Expo mobile app on the same API: v1.2–v2.0. `apps/mobile` stays parked until MOB-01.
- **Terminology:** user waypoints are **"stopovers"** in the UI, never "stops". **Transfer points** are system-generated and are never numbered or editable.
- **Times and units:** times in **Seattle time** (`America/Los_Angeles`); distances in **mi/ft** in the UI (metres on the wire).

## Stack and repository

**Confirmed stack:**
- React 19 + TypeScript ~5.8 + Vite 7 + MapLibre GL 5 (OpenFreeMap tiles).
- Python 3.12 + FastAPI + Pydantic 2 + httpx.
- C++20 (CMake ≥ 3.20, nanobind, scikit-build-core, Catch2).
- OpenTripPlanner 2.10 (Java 21) for street and transit pathfinding.
- Photon geocoder.
- Data: GTFS, OSM, GBFS (GBFS is deferred).
- **Not in the repo yet:** pandas pipeline, CI, TS linting, database.
  - Routing has no database by design.
  - **Planned for accounts only:** Supabase: PostgreSQL for account data and Supabase Auth for sign-in.

```
apps/web/               React + MapLibre web app                       [implemented]
apps/mobile/            Expo app                     [parked until MOB-01 (v1.2); don't extend before then]
packages/shared/        TS client, hand-written API types, rank/format/polyline helpers
services/planner/       FastAPI planner (Python 3.12, venv in .venv/)
  planner/main.py       HTTP endpoints + Pydantic models (current /v1/* API)
  planner/planner.py    orchestration: trip shapes → router calls → price → filter → rank
  planner/_native.py    the ONLY bridge to C++ (falls back to Python if mmr_core is missing)
  planner/otp_client.py, fake_router.py, templates.py, pareto.py, cost_model.py, fares.py
  core/                 C++20 lib `mmr` + nanobind module `mmr_core` (pricing, filters, Pareto, polylines)
  tests/                pytest, incl. C++ ↔ Python parity
services/otp/           OTP 2.10 config
cities/                 per-city YAML (prices are placeholders)
contracts/openapi.yaml  decided API v1 (/api/v1/...): not implemented yet
scripts/                fetch_data.py (downloads OSM/GTFS), otp.sh (build/serve graph)
docker-compose.yml      currently broken (D1 import crash, D6 rebuilds graph): don't rely on it
```

**Planned locations (create only when the task calls for it):**
- `services/pipeline/` (Python + pandas data pipeline);
- `cities/seattle.geojson` (service area);
- generated TS types in `packages/shared/`;
- `.github/workflows/`.

## Responsibilities and boundaries

| Layer | Owns | Must not |
|---|---|---|
| **Frontend** (`apps/web`, `packages/shared`) | UI, map rendering, form state, formatting, accessibility | Compute routes, call OTP or the geocoder directly, embed C++ logic |
| **FastAPI** (`services/planner/planner`) | Validation, orchestration, the OTP client, segmenting stopovers, transfer points, error codes, caching, logging; the accounts module (`/api/v1/me`, token verification, PostgreSQL) | Download feeds during a request; let C++ details leak into the HTTP API |
| **C++** (`services/planner/core`) | Pure algorithms: ranking (Pareto, distinctness, labels), stopover composition, constraint checks; later RAPTOR | Do I/O, hold global mutable state, know about HTTP, names or display geometry |
| **OTP** | Street and transit pathfinding | Be reachable from the browser |
| **Data pipeline** (planned) | Fetch, validate, normalise and version feeds; build the OTP graph; write the manifest | Be called from request handling |

Boundary rules (architecture section 3.1):
- The browser → FastAPI only. The exceptions are map tiles and Supabase sign-in; the browser never touches the database.
- Routing and accounts don't mix: `/routes/plan` never reads the user's token; only the accounts module touches PostgreSQL.
- Only `_native.py` imports `mmr_core`.
- Only the pipeline downloads data.
- Contract changes need both sides to review.

## Architecture principles

- **Modular monolith:** one FastAPI process with C++ in-process, plus OTP. No new services, queues or databases without review (architecture section 13).
- **`Router` port:** OTP, FakeRouter and any future C++ router are interchangeable behind it.
- **C++ is pure and deterministic.** New C++ code uses integers (seconds, metres) and lives in new modules (routing-engine section 8.1). Leave existing headers unchanged unless the task says otherwise.
- **Current C++/Python parity rule (code-branch README):**
  - existing Python twins (pricing, filters, Pareto, polylines) must stay **bit-identical** to C++;
  - compile with `-ffp-contract=off` and round like Python's `round(x, 2)`;
  - parity is checked in `services/planner/tests/test_native_parity.py`;
  - score cases in `packages/shared/test/score-cases.json` are checked by Python, C++ and TS.

  AD-8 (decided) makes C++ the single implementation for *new* algorithms, with Python copies frozen as test oracles.
- **Privacy:**
  - plan requests are never stored or linked to an account, and there are no GPS traces;
  - accounts hold only the display name, preferences, saved places and trip history (chosen trips; pausable; 90-day retention). Supabase Auth holds the email and password;
  - never log tokens or account data;
  - round coordinates to about 100 m in logs;
  - use location only on explicit user action.
- **Honest data:** label scheduled times as scheduled. Never show `PLACEHOLDER` prices. Show the required attributions (data-sources section 12).
- **Licences:** never commit raw or derived GTFS or OSM files (`data/` is git-ignored; data-sources D2).

## API contract conventions

- **Current code** serves `GET /health`, `GET /v1/city`, `POST /v1/plan`, `GET /v1/geocode` and `GET /v1/reverse` (`planner/main.py`).
- **Account endpoints** (`/api/v1/me*`, contract draft.2) need `Authorization: Bearer <Supabase sign-in token>`. Every other endpoint is public and ignores the header.
- **Decided v1** (`contracts/openapi.yaml`, api-contract.md) moves to `/api/v1/routes/plan`, `/transport/modes`, `/places/search`, `/places/reverse`, `/service-info` and `/health`. The migration is roadmap SKL-01. Don't mix the two shapes in one endpoint.
- **When changing an endpoint, update in the same change:**
  1. Pydantic models and handler (`planner/main.py`);
  2. `packages/shared/src/types.ts` and `client.ts` (hand-written today; generated from OpenAPI later, FND-18);
  3. the consumers in `apps/web`;
  4. `contracts/openapi.yaml` and api-contract.md if the v1 contract is affected.
- **Wire conventions** (api-contract section 2):
  - JSON `snake_case`;
  - units `_meters`, `_seconds`, money in integer `_minor` units + `currency`;
  - request times must include a UTC offset;
  - responses always include every field (`null` = not applicable; lists are never `null`);
  - `UPPER_SNAKE_CASE` enums, and clients must tolerate unknown values.
- **Errors:** RFC 9457 Problem Details with `code`, `request_id` and `retryable`.
  - "No route" is `200` with `outcome: "NO_ROUTE"`.
  - A routing outage is `503 ROUTING_UNAVAILABLE`, never an empty list (defect D2 today).
- **Waypoints vs transfer points:** request `waypoints[]` → response `segments[]` + `waypoint_visits[]`. `transfer_points[]` are system-generated.
- **Changes within v1 are additive only.** A breaking change needs `/api/v2` and review.

## Development workflow and testing

Setup (code-branch README "Quick start", on `seattle-first-draft`):
- Use **`python3.12`** for the venv; the system `python3` may be 3.9.
- The shared TS tests need Node ≥ 22.18 for type stripping.
- Install the C++ build tools (`scikit-build-core nanobind cmake ninja`) into the venv before `npm run core:build`.

```bash
npm run planner:fake   # API on :8000 with the straight-line fake router (no Java/OTP needed)
npm run web            # web app on :5173
npm run planner        # API against real OTP on :8080 (needs `npm run otp` + built graph)
npm run core:build     # rebuild mmr_core after editing C++, then restart the planner
```

Real routing needs Java 21, an ~8 GB heap, data downloads (`scripts/fetch_data.py cities/seattle.yaml`) and `scripts/otp.sh seattle build`. Use the fake router unless the task needs OTP.

**Checks: run what covers your change** (there is no CI yet):

| Changed | Run |
|---|---|
| C++ (`core/`) | `npm run core:test`, then `npm run core:build` and the pytest parity tests |
| Python (`planner/`) | `cd services/planner && .venv/bin/python -m pytest -q` (add `PLANNER_PURE_PYTHON=1` to test the fallback) |
| TS shared / web | `npm test -w packages/shared` · `npm run typecheck` · `npm run build -w apps/web` |
| Anything cross-cutting | `npm test` (C++ + pytest + TS) and `npm run typecheck` |

- **Ruff** is configured (line length 110) but not installed. Run it only if available, and say whether you did.
- **New behaviour gets tests** at the lowest layer that covers it (roadmap section 8): C++ with Catch2 and oracle tests; Python with pytest and FakeRouter or recorded OTP responses; UI with component tests.
- **Every bug fix gets a regression test.** Use synthetic fixtures; never commit real feeds.
- **Known issues** (code-branch README): the scooter Ship Canal fallback, the Lime startup timeout, placeholder prices.

## Figma design and implementation conventions

**File:** [HCP-Multimodal-Router](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router)
- **Main Wireframe Layout** page (`node-id=85-5412`; the v2 wireframes), the decided UX:
  - grayscale wireframes for the mobile app (38 frames) and the web app (28 frames), including optional accounts;
  - a clickable prototype;
  - a grayscale kit of `v2/…` components bound to the design-system tokens.

  Frame codes (A–F) match [docs/user-flows.md](docs/user-flows.md) section 2. **Don't modify** unless asked.
- **Wireframes v1 (archive)** page: the previous low-fi set. Reference only.
- **Hi-Fi · Design System** page (`node-id=49-5410`):
  - variables: `Primitives`, `Color`, `Spacing`, `Radius`, `Layout`;
  - 15 text styles (incl. `Display/L` and `Display/M`, added for v2) and 4 effect styles;
  - components in section `02 · Components`;
  - hi-fi Trip Planner and Route Results for desktop and mobile. These still follow the **v1** structure; refreshing them to v2 is pending.

**Implementing a design:**
- Read design-system.md first. Pull the exact frame with the Figma tools when available (the `figma-design-to-code` skill before `get_design_context`). Reuse existing components.
- **Use semantic tokens, never raw hex:**
  - map Figma variables to CSS variables following design-system section 7 (`var(--color-text-primary)`, spacing `--s1…--s16`);
  - the current `styles.css` (paper/ink/signal red) is being replaced by DS-2 (decided).
- **Colour = mode of travel only.** Every mode also gets an icon, a label and a line pattern: walk dotted, bike dashed, transit solid. Markers differ by shape: origin ring, destination square, numbered stopover disc, transfer diamond. Info is neutral.
- **Typography:** Archivo for UI; IBM Plex Mono only for clock times. Sentence case.
- **Accessibility:**
  - 44 px touch targets;
  - 16 px inputs;
  - visible focus;
  - nothing conveyed by colour alone;
  - keyboard and screen-reader behaviour per user-flows section 9.
- **No cost in MVP screens** (`Trip Duration` with `Cost=Hidden`).

**Editing Figma:**
- Load the `figma-use` skill before `use_figma`.
- Add new frames or sections; never overwrite existing frames.
- Bind fills, spacing and radius to variables; apply text styles.
- Nodes using `Focus/Ring` need clip content on.
- After a change, take a screenshot to verify and update design-system.md.

## Team collaboration

- **Workflow** (roadmap sections 5–9):
  - trunk-based, with short-lived branches `<type>/<issue#>-<slug>` (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `data`, `ci`, `spike`);
  - Conventional Commits with scopes `web`, `shared`, `api`, `core`, `pipeline`, `infra`, `ci`, `docs`, `contract`;
  - squash merge.
- **Reviews:** 1 code-owner approval. Contract files (`contracts/openapi.yaml`, `types.hpp`, `_native.py`) need **both** sides to approve. PRs should be < 400 changed lines, with test evidence and screenshots for UI at 1440 and 390 px.
- **Ownership:** frontend, API, C++, data and platform/QA workstreams (roadmap section 3). Stay inside the workstream the task belongs to. Flag cross-workstream impact instead of silently editing another area.
- **Issue IDs:** reference issues and requirement IDs (e.g. `SKL-06`, `WAY-7`, `D2`) in commits and summaries so work traces back to the plan.
- **Out-of-scope requests:** if a task conflicts with a recorded decision (e.g. adding cost, new modes or real-time data), point out the conflict and ask before proceeding.
