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
services/otp/      OpenTripPlanner 2 config (real street + transit routing)
cities/            Per-city prices: fuel, parking, taxi, rentals, transit fares
scripts/           Data download (OSM + GTFS)
```

## Quick start (Seattle, real routing)

Needs Python 3.12+, Node 20+, Java 21+ (no Docker required).

```bash
# Once: install deps, download Seattle data + OTP, build the routing graph
python3 -m venv services/planner/.venv && services/planner/.venv/bin/pip install -r services/planner/requirements.txt
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

## How ranking works

1. `templates.py` turns the selected modes into trip shapes
   (`TAXI`, `WALK+TRANSIT+WALK`, `CAR+TRANSIT+WALK` park & ride, …).
2. Each shape is routed in parallel (OTP, or `taxi_stitch.py` for taxi ↔ transit).
3. `cost_model.py` / `fares.py` price every leg.
4. `pareto.py` keeps options no other option beats on both time and cost, scores
   them as `cost + value_of_time × hours + transfer_penalty × transfers`, and labels
   **Fastest**, **Cheapest**, **Best balance**. The apps' cheap ↔ fast slider
   re-scores locally with the same formula.

## Tests

```bash
cd services/planner && .venv/bin/python -m pytest
npm run typecheck
```

## Known issues

- **Direct scooter trips across the Ship Canal fall back to walking** (e.g. downtown → UW/Fremont),
  though scooter → transit and rented e-bikes work. Likely OTP scooter permissions on the bridges; not yet diagnosed.
- **The Lime feed can time out on OTP startup** (2.9 MB, ~12.8k vehicles). OTP retries every minute, so
  rentals appear within a minute or two of starting.
- **Prices are placeholders**, so "Cheapest" / "Best balance" are only indicative until `cities/seattle.yaml` is filled in.
