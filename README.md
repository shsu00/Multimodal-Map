# Multi-modal Router

Husky Coding Project 2026

Pick where you're going, how you're willing to travel (walk, transit, bike,
scooter, car, taxi), and get the combinations — e.g. *car → train → walk* —
that best trade off **time** and **money**.

```
apps/web/          React + Vite + MapLibre web interface
apps/mobile/       Expo (React Native) iOS/Android app
packages/shared/   API types, client, re-ranking, polyline + formatting (used by both apps)
services/planner/  Python FastAPI: mode combos → routing → pricing → Pareto ranking
  core/            C++20 core (fares, pricing, filters, Pareto ranking, polylines), called from Python
services/otp/      OpenTripPlanner 2 config (real street + transit routing)
cities/            Per-city prices: fuel, parking, taxi, rentals, transit fares
scripts/           Data download (OSM + GTFS)
```

## Quick start (Seattle, real routing)

Needs Python 3.12+, Node 20+, Java 21+ (no Docker required).

```bash
# Once: install deps, download Seattle data + OTP, build the routing graph
python3 -m venv services/planner/.venv && services/planner/.venv/bin/pip install -r services/planner/requirements.txt
services/planner/.venv/bin/pip install scikit-build-core nanobind cmake ninja && npm run core:build   # C++ core (needs Xcode CLT / g++)
npm install
services/planner/.venv/bin/python scripts/fetch_data.py cities/seattle.yaml
scripts/otp.sh seattle build          # ~5-10 min, writes data/seattle/graph.obj

# Every time, in separate terminals
npm run otp        # OpenTripPlanner on :8080 (takes ~1 min to load)
npm run planner    # planner API on :8000
npm run web        # web app on :5173
npm run mobile     # Expo; open in Expo Go or a simulator
```

Seattle data: BBBike OSM extract, the Puget Sound consolidated GTFS feed
(King County Metro, Sound Transit, Community Transit, ferries, …) and Lime's
GBFS feed for scooters/bikes. Prices in `cities/seattle.yaml` are placeholders.

No OTP yet? `npm run planner:fake` uses a straight-line fake router so the apps
still work. On a physical phone set `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8000`
in `apps/mobile/.env`.

Rebuild the graph when the GTFS feed updates: re-run `fetch_data.py --force` then `otp.sh seattle build`.

## Design system

Swiss / transit-signage direction, shared by both apps (`apps/web/src/styles.css`, `apps/mobile/lib/theme.ts`):

- **3 colours:** paper `#F2EFE6`, ink `#17171A`, signal red `#BF3014` (`#FF6B4A` in dark mode). Muted text and rules are ink tints. All text meets WCAG AA (ink/paper 15.6:1, accent 5.0:1, muted 5.2:1).
- **Modes are told apart by pattern and label, not colour:** transit = solid bar, car = hatched/outlined, taxi = striped/dashed, bike & scooter = dotted, walk = thin dotted line.
- **Type:** Archivo (text), Archivo Narrow (titles), IBM Plex Mono (times, durations, prices). Scale 11 / 14 / 16 / 28 / 44.
- **Spacing:** 4px grid; forms sit on a 64px label column; whitespace separates rows instead of cards.
- Every control has hover, keyboard focus, pressed and disabled states; place search is an ARIA combobox.

## How ranking works

1. `templates.py` turns the selected modes into trip shapes
   (`TAXI`, `WALK+TRANSIT+WALK`, `CAR+TRANSIT+WALK` park & ride, …).
2. Each shape is routed in parallel (OTP, or `taxi_stitch.py` for taxi ↔ transit).
3. `cost_model.py` / `fares.py` price every leg.
4. `pareto.py` keeps options no other option beats on both time and cost, scores
   them as `cost + value_of_time × hours + transfer_penalty × transfers`, and labels
   **Fastest**, **Cheapest**, **Best balance**. The apps' cheap ↔ fast slider
   re-scores locally with the same formula.

## C++ core

`services/planner/core/` is a C++20 library (`mmr`) and a Python module (`mmr_core`, built with
[nanobind](https://github.com/wjakob/nanobind) and scikit-build-core). It holds the pure computation:

| C++ (`core/src/`) | Replaces Python in `planner/` |
|---|---|
| `fares.cpp` | `fares.transit_fares` |
| `cost_model.cpp` | `cost_model.price_itinerary` |
| `filters.cpp` | `planner.satisfies`, `planner.uses_allowed_modes` |
| `pareto.cpp` | `pareto.rank` (O(n log n) sweep for the Pareto front) |
| `itinerary.cpp` | derived properties (duration, transfers, walk, CO₂, mode sequence) |
| `polyline.cpp` | `fake_router.encode_polyline`, plus a decoder |

Python keeps the API, OTP calls and orchestration. `planner/_native.py` is the only bridge: each module
calls C++ when `mmr_core` is installed and falls back to its Python version otherwise.
`PLANNER_PURE_PYTHON=1` forces the fallback, and `GET /health` reports `"native": true|false`.

The two implementations must give identical results, down to the last bit of each price. They are
compiled with `-ffp-contract=off` (no fused multiply-add), and totals are rounded like Python's `round(x, 2)`.

```bash
npm run core:build   # rebuild the module after editing C++ (then restart the planner)
npm run core:test    # Catch2 unit tests via CMake/ctest
```

## Tests

```bash
npm test             # C++ unit tests + pytest (incl. C++ ↔ Python parity) + TS score parity
npm run typecheck
```

`tests/test_native_parity.py` puts randomised itineraries through both implementations. The score
cases in `packages/shared/test/score-cases.json` are checked by Python, C++ and the web/mobile slider code.

## Known issues

- **Direct scooter trips across the Ship Canal fall back to walking** (e.g. downtown → UW/Fremont),
  though scooter → transit and rented e-bikes work. Likely OTP scooter permissions on the bridges; not yet diagnosed.
- **The Lime feed can time out on OTP startup** (2.9 MB, ~12.8k vehicles). OTP retries every minute, so
  rentals appear within a minute or two of starting.
- **Prices are placeholders**, so "Cheapest" / "Best balance" are only indicative until `cities/seattle.yaml` is filled in.
