# Multimodal Router: API Contract v1

| | |
|---|---|
| **Status** | **Decided** by the team (2026-11-17). This is the API we are building. **Not implemented yet**: today's code serves the older `/v1/*` paths (section 1.3) |
| **API version** | `1.0.0-draft.2` · base path `/api/v1`. **draft.2 (2026-11-16)** adds optional accounts: `/api/v1/me*` (section 17), API-13 and API-14, five error codes and `features.accounts` |
| **Machine-readable spec** | [contracts/openapi.yaml](../contracts/openapi.yaml) (OpenAPI 3.1). Its examples are identical to the ones here |
| **Inputs** | [product-requirements.md](product-requirements.md) · [architecture.md](architecture.md) · [repository-analysis.md](repository-analysis.md) · code at `016a2e9` |
| **Date** | 2026-11-13 |

### Reading guide

- **MUST / SHOULD / MAY** are used as in RFC 2119.
- **"Today"** describes what the repository implements now. Everything else is decided but not built yet.
- **Example values are illustrative.** Stops, times and routes are plausible but not taken from the live feed. Geometries are real encoded polylines for the coordinates shown.
- **Requirement IDs** such as FR-WAY-1 and PD-3 refer to the PRD. D2 and A3 refer to the repository analysis.

---

## 0. Decisions

| ID | Area | Decision | Why | Changes from today |
|---|---|---|---|---|
| API-1 | Base path | FastAPI serves everything under **`/api/v1`**. The proxy forwards `/api` without rewriting it | The same paths work in development (Vite proxy) and in deployment | Today: `/v1/*` and `/health` |
| API-2 | Endpoint naming | Resource-style paths: `/routes/plan`, `/transport/modes`, `/places/search`, `/places/reverse`, `/service-info`, `/health` | Matches the brief; groups related endpoints | Renames all current paths (section 1.3) |
| API-3 | "No route" | **`200` with `outcome: "NO_ROUTE"`**, an empty `itineraries` list and a `no_route` explanation | A valid request that has no answer is not a client or server error (architecture section 4.2) | Today: `200` with an empty list and no reason |
| API-4 | Errors | **RFC 9457 Problem Details** (`application/problem+json`) plus a stable `code`, `request_id`, `retryable` and field-level `errors[]` | A standard shape that the frontend handles in one place | Today: FastAPI's default `{"detail": …}` |
| API-5 | Time | Request times **must include a UTC offset** (naive times are rejected). Responses use the service timezone, with the offset and a `timezone` field | Fixes the ambiguity behind PRD TIME-4 | Today: the web app sends naive local times |
| API-6 | Units | Metres, seconds, and money as **integer minor units** (cents) + ISO 4217 currency. Conversion to mi/ft happens in the frontend | No floating-point money; one unit system on the wire | Today: floats in dollars, `km`/`m` rounding in the UI |
| API-7 | Modes | One `Mode` enum covers requests and legs: `WALK, TRANSIT, BIKE, BIKE_SHARE, SCOOTER_SHARE, CAR, TAXI`. Transit legs add a `TransitSubmode` | "Own bike" vs "shared bike" becomes explicit, replacing the `has_bike` flag | Today: `BIKE` + `has_bike`; `SCOOTER` always means a rental |
| API-8 | Geometry | Each leg carries an **encoded polyline (precision 5)** in a typed wrapper; each itinerary carries a GeoJSON-order `bbox` | Compact; OTP's native format; the decoder already exists in `packages/shared` | Today: a bare polyline string |
| API-9 | Cost | `cost` is **nullable** and carries a `basis` (`PUBLISHED_FARE`, `ESTIMATED`, `PLACEHOLDER`, `NO_CHARGE`, plus `CONFIRMED`, reserved and never produced in the MVP) and an explicit `is_estimate` | Makes estimates impossible to mistake for confirmed prices. Cost is `null` while it is hidden | Today: a bare `total_cost` float and `estimated_cost` bool |
| API-10 | Waypoints vs transfer points | Separate structures: request `waypoints[]` → response `segments[]` + `waypoint_visits[]`; system-generated `transfer_points[]` | PRD glossary: user-requested vs system-generated | New |
| API-11 | Strictness | Requests reject unknown fields (`422`). Clients ignore unknown response fields and unknown values in response enums | Catches client typos; allows the server to grow without breaking clients | Today: unknown fields are ignored |
| API-12 | Source of truth | The approved YAML is the design reference. After implementation, the Pydantic models generate `/openapi.json`, CI checks it against `contracts/openapi.yaml`, and TypeScript types are generated from the YAML | One contract, checked automatically | Today: hand-copied TS types |
| API-13 | Authentication (accounts only) | `/api/v1/me*` requires `Authorization: Bearer <Supabase sign-in token>`. Every other endpoint is public and **ignores** the header. Sign-up and log-in happen in Supabase Auth, not in our API | No passwords in our API or database; one standard header | New |
| API-14 | Planning stays anonymous | `/routes/plan` never reads the account. Trip history is saved by a separate `POST /me/history` call that the client makes when the user picks a route | Routing stays stateless and cacheable; history is explicit and easy to pause | New |

---

## 1. Endpoints

### 1.1 MVP endpoints

| Method | Path | Purpose | Priority | PRD |
|---|---|---|---|---|
| `POST` | `/api/v1/routes/plan` | Generate and return candidate itineraries | **Must** | FR-ROUTE, FR-WAY, FR-RES, FR-ITIN, FR-XFER |
| `GET` | `/api/v1/transport/modes` | Supported modes and transit submodes, and which are enabled | **Must** | FR-MODE-1, -3, -7 |
| `GET` | `/api/v1/health` | Basic service health | **Must** | API-6, REL-2 |
| `GET` | `/api/v1/places/search` | Address and place search inside the service area | **Must** | FR-LOC-1 |
| `GET` | `/api/v1/places/reverse` | Name a map-picked point | Should | FR-LOC-4 |
| `GET` | `/api/v1/service-info` | Service area, timezone, limits, enabled features, data freshness | Should | FR-LOC-5, MAP-2, TIME-4, RES-6, API-3 |

**Account endpoints** (optional sign-in; after v1.0; details in section 17). All need a bearer token.

| Method | Path | Purpose | PRD |
|---|---|---|---|
| `GET` · `POST` · `PATCH` · `DELETE` | `/api/v1/me` | Read, create (finish sign-up), rename, delete the account | ACCT-2, ACCT-9 |
| `GET` | `/api/v1/me/export` | Download everything we store about the user | ACCT-8 |
| `PUT` | `/api/v1/me/preferences` | Replace preferences (default mode tab, transit types, units, stop alert, history on/off) | ACCT-4, ACCT-7 |
| `GET` · `POST` | `/api/v1/me/places` | List or add saved places | ACCT-5 |
| `PATCH` · `DELETE` | `/api/v1/me/places/{place_id}` | Edit or remove a saved place | ACCT-5 |
| `GET` · `POST` · `DELETE` | `/api/v1/me/history` | List, add or clear trip history | ACCT-6 |
| `DELETE` | `/api/v1/me/history/{entry_id}` | Remove one history entry | ACCT-6 |

### 1.2 Optional endpoints evaluated

| Candidate | Decision | Reason |
|---|---|---|
| Location search (`/places/search`, `/places/reverse`) | **Include** (above) | The browser must not call the geocoder directly. The API filters results to the service area, caches them and shields the public geocoder (architecture section 10.1) |
| Service metadata (`/service-info`) | **Include** (Should) | The UI otherwise hard-codes Seattle and can't check the area, limits or data freshness before planning |
| `GET /routes/{id}` (fetch an itinerary later) | **Exclude** | Planning is stateless and stores no itineraries. Sharing works by putting the *request* in the URL. Account history stores a *summary* and replans on demand (section 17) |
| Transit information (`/transit/stops`, `/transit/routes`, `/transit/stops/{id}/departures`) | **Defer** | Itineraries already include stop and route details. Departure boards need real-time data (future). Station search (FR-LOC-6, Could) can be added to `/places/search` as `category: TRANSIT_STOP` |
| Service alerts | **Defer** | Requires GTFS-Realtime (optional, future) |
| Map tiles or styles proxy | **Exclude for MVP** | MapLibre loads tiles directly from the tile provider. A caching proxy can be added later without changing this contract |
| Bike-share station status | **Defer** | Only useful once BIKE_SHARE is enabled. OTP owns GBFS state (architecture section 3.2) |

### 1.3 Migration from today's endpoints

| Today | New | Notes |
|---|---|---|
| `POST /v1/plan` | `POST /api/v1/routes/plan` | New request and response shapes (section 4) |
| `GET /v1/geocode?q=&limit=` | `GET /api/v1/places/search?q=&limit=` | Filtered to the service area; `category`; `attribution` |
| `GET /v1/reverse?lat=&lon=` | `GET /api/v1/places/reverse?lat=&lon=` | Single `result` + `in_service_area` |
| `GET /v1/city` | `GET /api/v1/service-info` | Polygon boundary, limits, features, data provenance |
| `GET /health` | `GET /api/v1/health` | Component statuses |
| — | `GET /api/v1/transport/modes` | New |

Our own web app is the only client. The switch can happen in one PR that changes the server and `packages/shared` together. The old paths don't need a deprecation period.

---

## 2. Conventions

### 2.1 Transport and headers

| Item | Rule |
|---|---|
| Protocol | HTTPS in deployment, same origin as the web app. CORS is not needed in production; in development, the Vite dev-server proxy forwards `/api` to `localhost:8000` |
| Request body | `Content-Type: application/json`, UTF-8, at most **16 KiB** (`413` otherwise) |
| Success body | `application/json` |
| Error body | `application/problem+json` (section 10) |
| `X-Request-ID` | Optional on requests (≤ 64 characters, `[A-Za-z0-9-]`). **Always** present on responses: the client's value if it is valid, otherwise a server-generated UUID. It equals `request_id` in bodies that have one |
| `Authorization` | `Bearer <Supabase sign-in token>` on `/api/v1/me*` only. Ignored everywhere else, and never logged |
| `WWW-Authenticate` | `Bearer` on every `401` |
| `Retry-After` | On `429` and `503`, in seconds |
| `Cache-Control` | `/transport/modes` and `/service-info`: `public, max-age=3600`. All other endpoints: `no-store` |
| Compression | gzip at the proxy for responses over 1 KiB |

### 2.2 Coordinates

- **Datum:** WGS 84 (EPSG:4326), decimal degrees.
- **Points are named objects** `{"lat": 47.61702, "lon": -122.3195}`, never bare arrays. That rules out mixing up the order.
- **Ranges:** `lat` ∈ [−90, 90] and `lon` ∈ [−180, 180]. Values must be finite (NaN and ±Infinity are rejected).
- **Precision:** clients SHOULD send at most 6 decimal places (~0.1 m). The server returns at most 6.
- **GeoJSON exception:** `bbox` and `boundary` use **[lon, lat]** order, as RFC 7946 requires. They are the only arrays of coordinates in the contract.

### 2.3 Geometry

| Field | Format | Notes |
|---|---|---|
| `leg.geometry` | `{"format": "ENCODED_POLYLINE", "precision": 5, "value": "…"}` | Google encoded polyline algorithm. **Decodes to (lat, lon) pairs** at 1e-5 degrees. OTP produces this format today, and polyline.ts already decodes it, returning `[lon, lat]` for MapLibre |
| `itinerary.bbox` | `[min_lon, min_lat, max_lon, max_lat]` | Ready for `map.fitBounds` |
| `service_area.boundary` | GeoJSON `Polygon` or `MultiPolygon` | For the area outline and client-side checks |

- A leg's geometry starts at `leg.from` and ends at `leg.to`, within polyline precision.
- If the routing engine provides no geometry, the server falls back to a straight line and adds the `GEOMETRY_APPROXIMATE` warning.
- `format` and `precision` are explicit, so a GeoJSON option can be added in v1 without breaking clients (section 12).

### 2.4 Time and timezone

- **Request:** `time.datetime` MUST be RFC 3339 **with an offset**, for example `2026-11-20T08:30:00-08:00` or `…Z`. Naive values are rejected with `INVALID_TIME`. Omit `time` to depart now.
- **Response:** every timestamp is RFC 3339 in the **service timezone**, with its offset (e.g. `-08:00` in winter, `-07:00` in summer). `PlanResponse.timezone` (e.g. `America/Los_Angeles`) is the IANA zone the client must use for display.
- **Durations:** integer seconds (`*_seconds`). The single exception is the user-facing inputs `dwell_minutes` and `max_walk_duration_minutes`.
- **Dates without times** (`valid_from`, `valid_until`): `YYYY-MM-DD`, in the service timezone.

### 2.5 Units, numbers, money

| Quantity | Wire format | Field-name suffix |
|---|---|---|
| Distance | Metres (number; the server rounds to whole metres) | `_meters` |
| Duration | Integer seconds | `_seconds` |
| Money | **Integer minor units** + `currency` (ISO 4217) | `_minor` |
| Counts | Integer | — |

Display units (mi / ft, 12-hour clock) are the frontend's job.

### 2.6 Identifiers

| ID | Format | Scope |
|---|---|---|
| `request_id` | UUID | One request. Show it in error UI ("Reference: …") |
| `itinerary.id` | Opaque, `^[A-Za-z0-9_-]{1,64}$` | **Unique within one response only.** Not stable across requests, and can't be fetched later |
| `stop.id`, `route_id` | Opaque strings from the feed | Stable for one `data_version` |
| `leg.index`, `transfer_point.index`, `segment.index` | 0-based positions | Within one itinerary |
| `account.id`, `saved_place.id`, `history_entry.id` | UUID | Stable for the life of the account. `account.id` is the user's Supabase Auth ID |

### 2.7 Presence and null

- **Responses:** every field defined in the schema is **always present**. `null` means "not applicable" or "unknown". Lists are empty (`[]`), never `null`.
- **Requests:** optional fields may be left out. Sending `null` means the same as leaving the field out.

### 2.8 Enums and forward compatibility

- Enum values are `UPPER_SNAKE_CASE` strings.
- **Request enums** (`modes`, `optimize`, …): the server rejects unknown values with a specific error code (section 9).
- **Response enums** (`labels`, `warnings[].code`, `kind`, `basis`, `submode`, `category`, `status`, error `code`): new values may be added in v1. Clients **MUST** handle unknown values gracefully: show `message`, a generic label, or fall back to the HTTP status.

### 2.9 Field naming

JSON uses `snake_case`, as the current API, Pydantic and OTP-derived code already do. TypeScript interfaces use the same names, so no mapping layer is needed. Where a JSON name is a Python keyword (`from`), the Pydantic model uses an alias (section 11.1).

---

## 3. Enumerations

| Enum | Values (MVP) | Used in | Notes |
|---|---|---|---|
| `Mode` | `WALK`, `TRANSIT`, `BIKE`, `BIKE_SHARE`, `SCOOTER_SHARE`, `CAR`, `TAXI` | `request.modes`, `leg.mode`, `mode_sequence` | **Enabled in the MVP:** WALK, TRANSIT, BIKE. The others exist in the enum but are rejected until enabled (`/transport/modes`). `BIKE` = own bike; `*_SHARE` = GBFS vehicles; `CAR` + `TRANSIT` produces park & ride |
| `TransitSubmode` | `BUS`, `LIGHT_RAIL`, `STREETCAR`, `COMMUTER_RAIL`, `FERRY`, `MONORAIL`, `OTHER` | `transit.submode`, `transit_submodes_excluded` | Mapped from GTFS route data by a documented table. GTFS uses the same route type for ferries and water taxis, so water taxis appear as `FERRY` with their route name. Revisit if the data allows (PRD MODE-3 lists water taxi separately) |
| `TimeType` | `DEPART_AT`, `ARRIVE_BY` | `request.time.type` | `ARRIVE_BY` cannot be combined with waypoints |
| `OptimizePreference` | `FASTEST` (default), `FEWEST_TRANSFERS`, `LEAST_WALKING` | `request.optimize` | `CHEAPEST` and `BALANCED` are reserved until cost estimates are enabled |
| `ItineraryLabel` | `FASTEST`, `FEWEST_TRANSFERS`, `LEAST_WALKING` | `itinerary.labels` | Response enum; `CHEAPEST` may be added later |
| `TransferKind` | `BOARD`, `ALIGHT`, `TRANSIT_TRANSFER`, `BIKE_PARK`, `VEHICLE_PICKUP`, `VEHICLE_DROPOFF`, `PARK_AND_RIDE` | `transfer_points[].kind` | section 4.3.3 |
| `EndpointKind` | `ORIGIN`, `WAYPOINT`, `DESTINATION` | `segments[].from/to.kind` | |
| `TimeBasis` | `SCHEDULED`, `ESTIMATED`, `REALTIME` | `leg.time_basis` | `REALTIME` is never produced in the MVP |
| `PriceBasis` | `CONFIRMED`, `NO_CHARGE`, `PUBLISHED_FARE`, `ESTIMATED`, `PLACEHOLDER` | `cost.basis` | section 4.3.5 |
| `Outcome` | `OK`, `NO_ROUTE` | `PlanResponse.outcome` | |
| `NoRouteReason` | `NO_PATH_FOUND`, `ALL_EXCLUDED_BY_CONSTRAINTS`, `OUTSIDE_SERVICE_HOURS` | `no_route.reason` | `OUTSIDE_SERVICE_HOURS` only if the routing engine gives enough information (to be verified in the M0 spike) |
| `Suggestion` | `CHANGE_TIME`, `ALLOW_MORE_MODES`, `RELAX_CONSTRAINTS`, `MOVE_OR_REMOVE_WAYPOINT` | `no_route.suggestions` | |
| `WarningCode` | section 4.3.6 | `warnings[].code` | Response enum |
| `DataSourceType` / `SourceStatus` | `GTFS`, `OSM`, `GBFS`, `GTFS_RT` / `OK`, `STALE`, `UNAVAILABLE` | `data.sources[]` | |
| `HealthStatus` | `OK`, `DEGRADED`, `DOWN`, `UNKNOWN` | `/health` | |
| `PlaceCategory` | `ADDRESS`, `POI`, `TRANSIT_STOP`, `OTHER` | `/places/*` | Best-effort mapping from the geocoder |
| `ErrorCode` | section 10.2 | Problem `code`, `errors[].code` | Response enum |

---

## 4. `POST /api/v1/routes/plan`

### 4.1 Request

| Field | Type | Required | Default | Rules |
|---|---|---|---|---|
| `origin` | `LocationInput` `{lat, lon, name?}` | yes | — | Inside the service area. `name` ≤ 200 characters is echoed back on the matching place |
| `destination` | `LocationInput` | yes | — | Inside the area; ≥ 50 m from the origin |
| `waypoints` | `WaypointInput[]` `{lat, lon, name?, dwell_minutes?}` | no | `[]` | ≤ `limits.max_waypoints` (3). Visited **in list order**. `dwell_minutes` 0–240 (default 0). Each waypoint ≥ 50 m from its neighbours. **User-requested only** |
| `modes` | `Mode[]` | yes | — | ≥ 1, unique, each enabled. WALK is always allowed as a connector; listing it also allows walk-only itineraries |
| `transit_submodes_excluded` | `TransitSubmode[]` | no | `[]` | Only when `modes` contains TRANSIT; must not exclude every submode |
| `time` | `{type, datetime}` | no | depart now | `datetime` has an offset and falls within `limits.departure_window`; `ARRIVE_BY` not allowed with waypoints |
| `optimize` | `OptimizePreference` | no | `FASTEST` | Must be listed in `features.optimize_options` |
| `constraints.max_walk_distance_meters` | integer | no | 2000 | 100–10000. Total walking per itinerary |
| `constraints.max_walk_duration_minutes` | integer | no | none | 1–120. Total walking time per itinerary |
| `constraints.max_transfers` | integer | no | 3 | 0–5 |
| `max_itineraries` | integer | no | 5 | 1–5 |

#### Example: basic request

```json
{
  "origin": {"lat": 47.65332, "lon": -122.30584, "name": "Paul G. Allen Center, UW"},
  "destination": {"lat": 47.61702, "lon": -122.3195, "name": "Cal Anderson Park"},
  "modes": ["WALK", "TRANSIT"],
  "time": {"type": "DEPART_AT", "datetime": "2026-11-20T08:30:00-08:00"},
  "optimize": "FASTEST",
  "constraints": {"max_walk_distance_meters": 1600},
  "max_itineraries": 3
}
```

#### Example: one waypoint with a 15-minute stay

```json
{
  "origin": {"lat": 47.65332, "lon": -122.30584, "name": "Paul G. Allen Center, UW"},
  "destination": {"lat": 47.61702, "lon": -122.3195, "name": "Cal Anderson Park"},
  "waypoints": [{"lat": 47.6223, "lon": -122.3209, "name": "Grocery on Broadway", "dwell_minutes": 15}],
  "modes": ["WALK", "TRANSIT"],
  "time": {"type": "DEPART_AT", "datetime": "2026-11-20T08:30:00-08:00"}
}
```

### 4.2 Response structure

```
PlanResponse
├─ request_id, generated_at, outcome (OK | NO_ROUTE), timezone
├─ query            ResolvedQuery: the request as interpreted (defaults applied, "now" resolved)
├─ itineraries[]    0–5, ordered by query.optimize
│   ├─ id, labels[], departure_time, arrival_time
│   ├─ duration_seconds, walking_seconds, waiting_seconds, dwell_seconds
│   ├─ distance_meters, walking_distance_meters, transfers, mode_sequence[]
│   ├─ cost         CostEstimate | null
│   ├─ bbox         [min_lon, min_lat, max_lon, max_lat]
│   ├─ legs[]       ordered; index, mode, from, to, times, distance, geometry, time_basis,
│   │               transit {submode, route, agency, headsign, intermediate_stops[]} | null,
│   │               rental | null, cost | null
│   ├─ segments[]   one per (origin|waypoint) → (waypoint|destination); leg_start..leg_end
│   ├─ transfer_points[]  system-generated change points
│   ├─ waypoint_visits[]  user-requested stops: arrival, departure, dwell
│   └─ warnings[]
├─ no_route         NoRoute | null (present exactly when outcome = NO_ROUTE)
├─ warnings[]       response-level
└─ data             DataProvenance: data_version, routing_engine, realtime, sources[]
```

### 4.3 Semantics

#### 4.3.1 Selection and ordering

1. **Candidates.** The server generates candidates using only the permitted modes, with walking allowed as a connector.
2. **Filtering.** Candidates that break `constraints` are removed. If that removes everything, the result is `NO_ROUTE` with reason `ALL_EXCLUDED_BY_CONSTRAINTS`. If it removes only some, the response carries the `RESULTS_LIMITED_BY_CONSTRAINTS` warning.
3. **Distinctness.** Two itineraries are distinct if their sequence of modes **or** their sequence of transit routes differs. For each distinct pattern, only the best one by `optimize` is kept.
4. **Pareto set.** The server keeps itineraries that are not beaten on all three of (duration, transfers, walking distance). If more than `max_itineraries` remain, it keeps the best by the `optimize` key, breaking ties with the other two keys in this order: duration, transfers, walking.
5. **Ordering.** The list is sorted by the `optimize` key.
6. **Labels.** Labels are assigned independently of `optimize`: exactly one itinerary in the response gets each of `FASTEST`, `FEWEST_TRANSFERS` and `LEAST_WALKING`. One itinerary may hold several labels. Ties go to the earlier itinerary in the list.

#### 4.3.2 Segments and waypoints (user-requested)

- `segments.length == waypoints.length + 1`. Segment *k* runs from the origin (*k* = 0) or waypoint *k*−1 to waypoint *k* or the destination.
- Segments cover the legs exactly: `leg_start..leg_end`, contiguous and non-overlapping.
- `waypoint_visits[k]` records the arrival at waypoint *k*, `dwell_seconds = dwell_minutes × 60`, and the departure.
- **No transfer point is ever created at a waypoint, the origin or the destination**, even if a waypoint coincides with a stop.

#### 4.3.3 Transfer points (system-generated)

The server derives transfer points from consecutive legs. One transfer point is created for each place where the rider changes vehicle or mode, other than at the origin, destination or waypoints.

| `kind` | Created when | `place` (marker) | `counts_as_transfer` |
|---|---|---|---|
| `BOARD` | A non-transit leg is followed by a transit leg | Boarding stop | false |
| `ALIGHT` | A transit leg is followed by a non-transit leg | Alighting stop | false |
| `TRANSIT_TRANSFER` | A transit leg is followed by another transit leg, directly or through one walking leg. The walk is folded in (`walk_*`), and `from_place` is the alighting stop if it differs | Boarding stop of the next vehicle | **true** |
| `BIKE_PARK` | An own-bike leg ends at a station before transit | Parking location | false |
| `VEHICLE_PICKUP` / `VEHICLE_DROPOFF` | A shared-vehicle leg starts or ends | Dock or vehicle location | false |
| `PARK_AND_RIDE` | (future) A car leg ends at a lot before transit | Lot | false |

- `wait_duration_seconds` is the time between arriving at the boarding place and the next departure. It is `null` where nothing departs (`ALIGHT`, `VEHICLE_DROPOFF`).
- `itinerary.transfers` = the number of `TRANSIT_TRANSFER` points = transit boardings − 1 within each segment, summed.
- The PRD's "tight connection" and "long wait" thresholds (< 3 min, > 20 min) appear as `TIGHT_TRANSFER` / `LONG_WAIT` warnings with `transfer_index`.

#### 4.3.4 Totals

| Field | Definition |
|---|---|
| `duration_seconds` | `arrival_time − departure_time` = Σ leg durations + `waiting_seconds` + `dwell_seconds` |
| `waiting_seconds` | Σ gaps between consecutive legs, excluding waypoint dwell |
| `walking_seconds` / `walking_distance_meters` | Σ over legs with `mode == WALK` |
| `distance_meters` | Σ leg distances |
| `mode_sequence` | Leg modes with consecutive repeats collapsed |

#### 4.3.5 Money: estimates vs. confirmed prices

The rule: **no amount in this API is a confirmed price in the MVP.** We don't sell tickets or receive provider quotes. Every amount says how it was obtained:

| `basis` | Meaning | `is_estimate` | May the UI show it? |
|---|---|---|---|
| `CONFIRMED` | Quoted by a provider for this exact trip. **Reserved, never produced in the MVP** | false | Yes, as the price |
| `NO_CHARGE` | No fare applies (walking, own bike) | false | Yes ("free") |
| `PUBLISHED_FARE` | From an agency's published fare rules for a standard adult fare. What the rider pays may differ (passes such as U-PASS, transfers, reduced fares) | **true** | Yes, labelled as an estimate ("about $3.00") |
| `ESTIMATED` | Modelled: fuel, parking, taxi meter, rental per minute. May include `low_minor` / `high_minor` | **true** | Yes, labelled as an estimate, preferably as a range |
| `PLACEHOLDER` | Unresearched configuration value (today's `cities/seattle.yaml`) | **true** | **No.** Clients MUST NOT display it as a price |

**Further rules:**
- **Hidden cost.** While `service-info.features.cost_estimates` is `false`, every `cost` field is `null`. That is the MVP setting.
- **Itinerary total.** The total is the sum of the legs' amounts. Its `basis` is the weakest among the legs (CONFIRMED / NO_CHARGE > PUBLISHED_FARE > ESTIMATED > PLACEHOLDER). If any leg's cost is unknown, the itinerary `cost` is `null` and the `COST_INCOMPLETE` warning is added.
- **Ranges.** `low_minor ≤ amount_minor ≤ high_minor` whenever a range is given.

```json
{
  "published_fare": {
    "amount_minor": 300,
    "currency": "USD",
    "basis": "PUBLISHED_FARE",
    "is_estimate": true,
    "low_minor": null,
    "high_minor": null,
    "note": "Standard adult fare. Passes, transfers and reduced fares may change what you pay."
  },
  "estimated": {
    "amount_minor": 1850,
    "currency": "USD",
    "basis": "ESTIMATED",
    "is_estimate": true,
    "low_minor": 1500,
    "high_minor": 2300,
    "note": "Modelled from distance and time."
  },
  "placeholder": {
    "amount_minor": 125,
    "currency": "USD",
    "basis": "PLACEHOLDER",
    "is_estimate": true,
    "low_minor": null,
    "high_minor": null,
    "note": "Unresearched configuration value. Do not display."
  },
  "no_charge": {
    "amount_minor": 0,
    "currency": "USD",
    "basis": "NO_CHARGE",
    "is_estimate": false,
    "low_minor": null,
    "high_minor": null,
    "note": null
  }
}
```

#### 4.3.6 Warnings

`warnings[]` appears at the response level (about the whole result) and at the itinerary level (about one option). Each warning is `{code, severity, message, leg_index, transfer_index, details}`. `message` is default English text the UI may use as is.

| Code | Level | Severity | When |
|---|---|---|---|
| `PARTIAL_RESULTS` | response | WARNING | Some candidate queries failed or timed out; more options may exist |
| `DEPARTURE_IN_PAST` | response | INFO | `time.datetime` is in the past (still within the schedule window) |
| `ONLY_WALKING_AVAILABLE` | response | INFO | The only feasible itinerary is walking |
| `RESULTS_LIMITED_BY_CONSTRAINTS` | response | INFO | Some candidates were removed by `constraints` |
| `SHARED_MOBILITY_UNAVAILABLE` | response | WARNING | Shared modes were requested but GBFS data is stale or unavailable |
| `DATA_NEAR_EXPIRY` | response | INFO | The schedule data ends within 7 days |
| `DEVELOPMENT_ROUTER` | response | WARNING | The fake router produced the result. Never in deployment |
| `LOCATION_SNAPPED` | itinerary | INFO | The route starts or ends > 500 m from the requested point (`details.distance_meters`) |
| `TIGHT_TRANSFER` / `LONG_WAIT` | itinerary | WARNING / INFO | Wait < 3 min / > 20 min (`transfer_index`) |
| `LONG_TRIP` | itinerary | INFO | Duration > 3 h |
| `GEOMETRY_APPROXIMATE` | itinerary | INFO | A leg's line is straight because no geometry was available (`leg_index`) |
| `COST_INCOMPLETE` | itinerary | INFO | Cost estimates are enabled but some leg cost is unknown |

#### 4.3.7 Data provenance and freshness

`data` is included in every plan response:

| Field | Meaning |
|---|---|
| `data_version` | The published pipeline version (architecture section 8) |
| `routing_engine` | `{name, version}`. `name: "fake"` marks development results |
| `realtime` | `false` in the MVP. All transit times are scheduled |
| `sources[]` | One entry per source that contributed, each with `retrieved_at`, `valid_from` / `valid_until` (schedules), `last_updated` (live feeds, if known), `status` and `attribution` |

- GTFS and OSM are always listed. GBFS is listed only when shared modes were requested.
- The UI MUST show every non-null `attribution`. Each leg's `time_basis` says whether its times are scheduled or estimated.

### 4.4 Examples

#### Basic response

`200`: two distinct options (light rail vs. bus), labels, and transfer points.

```json
{
  "request_id": "3f6c1e9a-7b2d-4c8e-9a51-2d0f6b7c4e10",
  "generated_at": "2026-11-20T08:29:58-08:00",
  "outcome": "OK",
  "timezone": "America/Los_Angeles",
  "query": {
    "time": {"type": "DEPART_AT", "datetime": "2026-11-20T08:30:00-08:00"},
    "modes": ["WALK", "TRANSIT"],
    "transit_submodes_excluded": [],
    "optimize": "FASTEST",
    "constraints": {"max_walk_distance_meters": 1600, "max_walk_duration_minutes": null, "max_transfers": 3},
    "max_itineraries": 3,
    "waypoint_count": 0
  },
  "itineraries": [
    {
      "id": "itn_7f3a9c2e",
      "labels": ["FASTEST", "FEWEST_TRANSFERS"],
      "departure_time": "2026-11-20T08:30:00-08:00",
      "arrival_time": "2026-11-20T08:51:00-08:00",
      "duration_seconds": 1260,
      "walking_seconds": 900,
      "waiting_seconds": 180,
      "dwell_seconds": 0,
      "distance_meters": 4995,
      "walking_distance_meters": 1215,
      "transfers": 0,
      "mode_sequence": ["WALK", "TRANSIT", "WALK"],
      "cost": null,
      "bbox": [-122.32025, 47.61702, -122.30381, 47.65332],
      "legs": [
        {
          "index": 0,
          "mode": "WALK",
          "from": {"name": "Paul G. Allen Center, UW", "location": {"lat": 47.65332, "lon": -122.30584}, "stop": null},
          "to": {
            "name": "University of Washington Station",
            "location": {"lat": 47.64981, "lon": -122.30381},
            "stop": {"id": "stop:uw-station", "code": null, "name": "University of Washington Station"}
          },
          "departure_time": "2026-11-20T08:30:00-08:00",
          "arrival_time": "2026-11-20T08:42:00-08:00",
          "duration_seconds": 720,
          "distance_meters": 972,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "ghzaHnzniVjJ{DpIyE"},
          "time_basis": "ESTIMATED",
          "transit": null,
          "rental": null,
          "cost": null
        },
        {
          "index": 1,
          "mode": "TRANSIT",
          "from": {
            "name": "University of Washington Station",
            "location": {"lat": 47.64981, "lon": -122.30381},
            "stop": {"id": "stop:uw-station", "code": null, "name": "University of Washington Station"}
          },
          "to": {
            "name": "Capitol Hill Station",
            "location": {"lat": 47.61915, "lon": -122.32025},
            "stop": {"id": "stop:capitol-hill-station", "code": null, "name": "Capitol Hill Station"}
          },
          "departure_time": "2026-11-20T08:45:00-08:00",
          "arrival_time": "2026-11-20T08:48:00-08:00",
          "duration_seconds": 180,
          "distance_meters": 3780,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "iryaHxmniVxaBhu@x{Alo@"},
          "time_basis": "SCHEDULED",
          "transit": {
            "submode": "LIGHT_RAIL",
            "route_id": "route:1-line",
            "route_short_name": "1 Line",
            "route_long_name": null,
            "agency_name": "Sound Transit",
            "headsign": "Southbound",
            "intermediate_stops": []
          },
          "rental": null,
          "cost": null
        },
        {
          "index": 2,
          "mode": "WALK",
          "from": {
            "name": "Capitol Hill Station",
            "location": {"lat": 47.61915, "lon": -122.32025},
            "stop": {"id": "stop:capitol-hill-station", "code": null, "name": "Capitol Hill Station"}
          },
          "to": {"name": "Cal Anderson Park", "location": {"lat": 47.61702, "lon": -122.3195}, "stop": null},
          "departure_time": "2026-11-20T08:48:00-08:00",
          "arrival_time": "2026-11-20T08:51:00-08:00",
          "duration_seconds": 180,
          "distance_meters": 243,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "ursaHptqiVhLuC"},
          "time_basis": "ESTIMATED",
          "transit": null,
          "rental": null,
          "cost": null
        }
      ],
      "segments": [
        {
          "index": 0,
          "from": {"kind": "ORIGIN", "waypoint_index": null},
          "to": {"kind": "DESTINATION", "waypoint_index": null},
          "leg_start": 0,
          "leg_end": 2
        }
      ],
      "transfer_points": [
        {
          "index": 0,
          "kind": "BOARD",
          "place": {
            "name": "University of Washington Station",
            "location": {"lat": 47.64981, "lon": -122.30381},
            "stop": {"id": "stop:uw-station", "code": null, "name": "University of Washington Station"}
          },
          "from_place": null,
          "incoming_leg_index": 0,
          "outgoing_leg_index": 1,
          "walk_distance_meters": 0,
          "walk_duration_seconds": 0,
          "wait_duration_seconds": 180,
          "counts_as_transfer": false
        },
        {
          "index": 1,
          "kind": "ALIGHT",
          "place": {
            "name": "Capitol Hill Station",
            "location": {"lat": 47.61915, "lon": -122.32025},
            "stop": {"id": "stop:capitol-hill-station", "code": null, "name": "Capitol Hill Station"}
          },
          "from_place": null,
          "incoming_leg_index": 1,
          "outgoing_leg_index": 2,
          "walk_distance_meters": 0,
          "walk_duration_seconds": 0,
          "wait_duration_seconds": null,
          "counts_as_transfer": false
        }
      ],
      "waypoint_visits": [],
      "warnings": []
    },
    {
      "id": "itn_b41d06e8",
      "labels": ["LEAST_WALKING"],
      "departure_time": "2026-11-20T08:30:00-08:00",
      "arrival_time": "2026-11-20T09:03:00-08:00",
      "duration_seconds": 1980,
      "walking_seconds": 600,
      "waiting_seconds": 240,
      "dwell_seconds": 0,
      "distance_meters": 6010,
      "walking_distance_meters": 810,
      "transfers": 0,
      "mode_sequence": ["WALK", "TRANSIT", "WALK"],
      "cost": null,
      "bbox": [-122.321, 47.6153, -122.30584, 47.6579],
      "legs": [
        {
          "index": 0,
          "mode": "WALK",
          "from": {"name": "Paul G. Allen Center, UW", "location": {"lat": 47.65332, "lon": -122.30584}, "stop": null},
          "to": {
            "name": "University Way NE & NE 42nd St",
            "location": {"lat": 47.6579, "lon": -122.3133},
            "stop": {"id": "stop:ave-42nd", "code": "29270", "name": "University Way NE & NE 42nd St"}
          },
          "departure_time": "2026-11-20T08:30:00-08:00",
          "arrival_time": "2026-11-20T08:38:00-08:00",
          "duration_seconds": 480,
          "distance_meters": 648,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "ghzaHnzniVwOvR{JzY"},
          "time_basis": "ESTIMATED",
          "transit": null,
          "rental": null,
          "cost": null
        },
        {
          "index": 1,
          "mode": "TRANSIT",
          "from": {
            "name": "University Way NE & NE 42nd St",
            "location": {"lat": 47.6579, "lon": -122.3133},
            "stop": {"id": "stop:ave-42nd", "code": "29270", "name": "University Way NE & NE 42nd St"}
          },
          "to": {
            "name": "Broadway & E Pine St",
            "location": {"lat": 47.6153, "lon": -122.3208},
            "stop": {"id": "stop:broadway-pine", "code": "29440", "name": "Broadway & E Pine St"}
          },
          "departure_time": "2026-11-20T08:42:00-08:00",
          "arrival_time": "2026-11-20T09:01:00-08:00",
          "duration_seconds": 1140,
          "distance_meters": 5200,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "{d{aHbipiVrv@zh@nd@cBrmBjHn}@g@"},
          "time_basis": "SCHEDULED",
          "transit": {
            "submode": "BUS",
            "route_id": "route:49",
            "route_short_name": "49",
            "route_long_name": "U District - Capitol Hill - Downtown",
            "agency_name": "King County Metro",
            "headsign": "Downtown Seattle",
            "intermediate_stops": [
              {
                "stop": {"id": "stop:eastlake-fuhrman", "code": "29310", "name": "Eastlake Ave E & Fuhrman Ave E"},
                "location": {"lat": 47.649, "lon": -122.32},
                "arrival_time": "2026-11-20T08:47:00-08:00",
                "departure_time": "2026-11-20T08:47:00-08:00"
              },
              {
                "stop": {"id": "stop:10th-roanoke", "code": "29350", "name": "10th Ave E & E Roanoke St"},
                "location": {"lat": 47.643, "lon": -122.3195},
                "arrival_time": "2026-11-20T08:50:00-08:00",
                "departure_time": "2026-11-20T08:50:00-08:00"
              },
              {
                "stop": {"id": "stop:broadway-roy", "code": "29400", "name": "Broadway E & E Roy St"},
                "location": {"lat": 47.6253, "lon": -122.321},
                "arrival_time": "2026-11-20T08:56:00-08:00",
                "departure_time": "2026-11-20T08:56:00-08:00"
              }
            ]
          },
          "rental": null,
          "cost": null
        },
        {
          "index": 2,
          "mode": "WALK",
          "from": {
            "name": "Broadway & E Pine St",
            "location": {"lat": 47.6153, "lon": -122.3208},
            "stop": {"id": "stop:broadway-pine", "code": "29440", "name": "Broadway & E Pine St"}
          },
          "to": {"name": "Cal Anderson Park", "location": {"lat": 47.61702, "lon": -122.3195}, "stop": null},
          "departure_time": "2026-11-20T09:01:00-08:00",
          "arrival_time": "2026-11-20T09:03:00-08:00",
          "duration_seconds": 120,
          "distance_meters": 162,
          "geometry": {"format": "ENCODED_POLYLINE", "precision": 5, "value": "szraH~wqiVwIcG"},
          "time_basis": "ESTIMATED",
          "transit": null,
          "rental": null,
          "cost": null
        }
      ],
      "segments": [
        {
          "index": 0,
          "from": {"kind": "ORIGIN", "waypoint_index": null},
          "to": {"kind": "DESTINATION", "waypoint_index": null},
          "leg_start": 0,
          "leg_end": 2
        }
      ],
      "transfer_points": [
        {
          "index": 0,
          "kind": "BOARD",
          "place": {
            "name": "University Way NE & NE 42nd St",
            "location": {"lat": 47.6579, "lon": -122.3133},
            "stop": {"id": "stop:ave-42nd", "code": "29270", "name": "University Way NE & NE 42nd St"}
          },
          "from_place": null,
          "incoming_leg_index": 0,
          "outgoing_leg_index": 1,
          "walk_distance_meters": 0,
          "walk_duration_seconds": 0,
          "wait_duration_seconds": 240,
          "counts_as_transfer": false
        },
        {
          "index": 1,
          "kind": "ALIGHT",
          "place": {
            "name": "Broadway & E Pine St",
            "location": {"lat": 47.6153, "lon": -122.3208},
            "stop": {"id": "stop:broadway-pine", "code": "29440", "name": "Broadway & E Pine St"}
          },
          "from_place": null,
          "incoming_leg_index": 1,
          "outgoing_leg_index": 2,
          "walk_distance_meters": 0,
          "walk_duration_seconds": 0,
          "wait_duration_seconds": null,
          "counts_as_transfer": false
        }
      ],
      "waypoint_visits": [],
      "warnings": []
    }
  ],
  "no_route": null,
  "warnings": [],
  "data": {
    "data_version": "seattle-2026-11-16-a1b2c3d4",
    "routing_engine": {"name": "OpenTripPlanner", "version": "2.10.0"},
    "realtime": false,
    "sources": [
      {
        "type": "GTFS",
        "name": "Puget Sound consolidated GTFS",
        "retrieved_at": "2026-11-16T03:10:00-08:00",
        "valid_from": "2026-11-09",
        "valid_until": "2027-02-14",
        "last_updated": null,
        "status": "OK",
        "attribution": null
      },
      {
        "type": "OSM",
        "name": "OpenStreetMap extract",
        "retrieved_at": "2026-11-16T03:00:00-08:00",
        "valid_from": null,
        "valid_until": null,
        "last_updated": null,
        "status": "OK",
        "attribution": "© OpenStreetMap contributors"
      }
    ]
  }
}
```

#### Waypoint response (excerpt)

The full payload is the `PlanResponseWaypoint` example in [openapi.yaml](../contracts/openapi.yaml).

```jsonc
{
  "outcome": "OK",
  "itineraries": [{
    "id": "itn_5c08e1d7",
    "labels": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"],
    "departure_time": "2026-11-20T08:30:00-08:00", "arrival_time": "2026-11-20T09:15:00-08:00",
    "duration_seconds": 2700, "waiting_seconds": 180, "dwell_seconds": 900,
    "legs": [ /* 0 WALK → UW Station, 1 TRANSIT 1 Line → Capitol Hill Station, 2 WALK → Grocery, 3 WALK → Cal Anderson Park */ ],
    "segments": [
      {"index": 0, "from": {"kind": "ORIGIN", "waypoint_index": null}, "to": {"kind": "WAYPOINT", "waypoint_index": 0}, "leg_start": 0, "leg_end": 2},
      {"index": 1, "from": {"kind": "WAYPOINT", "waypoint_index": 0}, "to": {"kind": "DESTINATION", "waypoint_index": null}, "leg_start": 3, "leg_end": 3}
    ],
    "transfer_points": [ /* BOARD at UW Station (wait 180 s), ALIGHT at Capitol Hill Station. None at the waypoint */ ],
    "waypoint_visits": [
      {"waypoint_index": 0, "place": {"name": "Grocery on Broadway", "location": {"lat": 47.6223, "lon": -122.3209}, "stop": null},
       "arrival_time": "2026-11-20T08:52:00-08:00", "departure_time": "2026-11-20T09:07:00-08:00", "dwell_seconds": 900}
    ]
  }]
}
```

#### No route

Request:

```json
{
  "origin": {"lat": 47.65332, "lon": -122.30584, "name": "Paul G. Allen Center, UW"},
  "destination": {"lat": 47.61702, "lon": -122.3195, "name": "Cal Anderson Park"},
  "modes": ["TRANSIT"],
  "time": {"type": "DEPART_AT", "datetime": "2026-11-20T02:40:00-08:00"}
}
```

Response, `200`:

```json
{
  "request_id": "c7e1a2d9-5f4b-4e3a-8c6d-1b9f0a7e3d52",
  "generated_at": "2026-11-20T02:39:57-08:00",
  "outcome": "NO_ROUTE",
  "timezone": "America/Los_Angeles",
  "query": {
    "time": {"type": "DEPART_AT", "datetime": "2026-11-20T02:40:00-08:00"},
    "modes": ["TRANSIT"],
    "transit_submodes_excluded": [],
    "optimize": "FASTEST",
    "constraints": {"max_walk_distance_meters": 2000, "max_walk_duration_minutes": null, "max_transfers": 3},
    "max_itineraries": 5,
    "waypoint_count": 0
  },
  "itineraries": [],
  "no_route": {
    "reason": "NO_PATH_FOUND",
    "failed_segment_index": 0,
    "message": "No route from Paul G. Allen Center, UW to Cal Anderson Park using Transit at 2:40 AM.",
    "suggestions": ["CHANGE_TIME", "ALLOW_MORE_MODES"]
  },
  "warnings": [],
  "data": {
    "data_version": "seattle-2026-11-16-a1b2c3d4",
    "routing_engine": {"name": "OpenTripPlanner", "version": "2.10.0"},
    "realtime": false,
    "sources": [
      {
        "type": "GTFS",
        "name": "Puget Sound consolidated GTFS",
        "retrieved_at": "2026-11-16T03:10:00-08:00",
        "valid_from": "2026-11-09",
        "valid_until": "2027-02-14",
        "last_updated": null,
        "status": "OK",
        "attribution": null
      },
      {
        "type": "OSM",
        "name": "OpenStreetMap extract",
        "retrieved_at": "2026-11-16T03:00:00-08:00",
        "valid_from": null,
        "valid_until": null,
        "last_updated": null,
        "status": "OK",
        "attribution": "© OpenStreetMap contributors"
      }
    ]
  }
}
```

---

## 5. `GET /api/v1/transport/modes`

This endpoint returns every value of `Mode` and whether this deployment accepts it. The UI builds the mode picker from it and must not offer modes with `enabled: false`. Example for the MVP configuration:

```json
{
  "modes": [
    {
      "id": "WALK",
      "label": "Walk",
      "description": "Walking. Always allowed as a connection to and between transit.",
      "enabled": true,
      "default_selected": true,
      "connector_only_when_unselected": true,
      "disabled_reason": null,
      "submodes": []
    },
    {
      "id": "TRANSIT",
      "label": "Transit",
      "description": "Buses, light rail, streetcar, commuter rail and ferries.",
      "enabled": true,
      "default_selected": true,
      "connector_only_when_unselected": false,
      "disabled_reason": null,
      "submodes": [
        {"id": "BUS", "label": "Bus", "enabled": true},
        {"id": "LIGHT_RAIL", "label": "Light rail", "enabled": true},
        {"id": "STREETCAR", "label": "Streetcar", "enabled": true},
        {"id": "COMMUTER_RAIL", "label": "Commuter rail", "enabled": true},
        {"id": "FERRY", "label": "Ferry", "enabled": true},
        {"id": "MONORAIL", "label": "Monorail", "enabled": false},
        {"id": "OTHER", "label": "Other transit", "enabled": true}
      ]
    },
    {
      "id": "BIKE",
      "label": "Bike (own)",
      "description": "Your own bike: ride directly, or ride to a station and park.",
      "enabled": true,
      "default_selected": false,
      "connector_only_when_unselected": false,
      "disabled_reason": null,
      "submodes": []
    },
    {
      "id": "BIKE_SHARE",
      "label": "Bike share",
      "description": "Shared bikes from GBFS feeds.",
      "enabled": false,
      "default_selected": false,
      "connector_only_when_unselected": false,
      "disabled_reason": "Not available yet.",
      "submodes": []
    },
    {
      "id": "SCOOTER_SHARE",
      "label": "Scooter share",
      "description": "Shared e-scooters from GBFS feeds.",
      "enabled": false,
      "default_selected": false,
      "connector_only_when_unselected": false,
      "disabled_reason": "Not available yet.",
      "submodes": []
    },
    {
      "id": "CAR",
      "label": "Car",
      "description": "Driving, including park & ride.",
      "enabled": false,
      "default_selected": false,
      "connector_only_when_unselected": false,
      "disabled_reason": "Planned for a future release.",
      "submodes": []
    },
    {
      "id": "TAXI",
      "label": "Taxi",
      "description": "Taxi or ride-hail, alone or with transit.",
      "enabled": false,
      "default_selected": false,
      "connector_only_when_unselected": false,
      "disabled_reason": "Planned for a future release.",
      "submodes": []
    }
  ],
  "defaults": ["WALK", "TRANSIT"]
}
```

## 6. `GET /api/v1/health`

- **Liveness:** it returns `200` whenever the API process can respond. `status` summarises the dependencies:
  - `OK`: everything is healthy.
  - `DEGRADED`: planning works with reduced capability, e.g. the geocoder is down.
  - `DOWN`: planning is impossible, e.g. the routing engine is unreachable or the schedule data has expired.
- **Probes:** dependency probes are cheap and cached for up to 10 s. The geocoder is not actively probed, to respect the public service's fair use.
- **Security:** the body contains no secrets and no internal hostnames.

```json
{
  "status": "OK",
  "api_version": "1.0.0",
  "time": "2026-11-20T08:29:50-08:00",
  "components": {
    "routing_engine": {"status": "OK", "detail": "OpenTripPlanner 2.10.0 reachable", "checked_at": "2026-11-20T08:29:45-08:00"},
    "native_engine": {"status": "OK", "detail": "mmr_core contract 2", "checked_at": "2026-11-20T08:00:02-08:00"},
    "geocoder": {"status": "UNKNOWN", "detail": "Not actively probed", "checked_at": null},
    "transit_data": {
      "status": "OK",
      "detail": "seattle-2026-11-16-a1b2c3d4, valid until 2027-02-14",
      "checked_at": "2026-11-20T08:00:02-08:00"
    }
  }
}
```

## 7. Places: `GET /api/v1/places/search` and `GET /api/v1/places/reverse`

### `/places/search`

| Parameter | Rule |
|---|---|
| `q` | 3–200 characters, required |
| `limit` | 1–10 (default 5) |
| `lat`, `lon` | Optional bias (e.g. the map centre). Both or neither |

Results outside the service area are removed server-side. The UI must display `attribution`.

```json
{
  "request_id": "5a9e3c71-2b8f-4d06-a1e4-7c3b9f0d2e68",
  "results": [
    {
      "name": "Cal Anderson Park",
      "label": "Cal Anderson Park, 1635 11th Ave, Seattle",
      "location": {"lat": 47.61702, "lon": -122.3195},
      "category": "POI"
    },
    {
      "name": "Cal Anderson Park Shelter House",
      "label": "Cal Anderson Park Shelter House, Seattle",
      "location": {"lat": 47.61745, "lon": -122.31906},
      "category": "POI"
    }
  ],
  "attribution": "Search data © OpenStreetMap contributors"
}
```

### `/places/reverse`

Parameters `lat` and `lon` are required. `result` is `null` if nothing suitable is found. `in_service_area` lets the UI warn before planning.

```json
{
  "request_id": "5a9e3c71-2b8f-4d06-a1e4-7c3b9f0d2e68",
  "result": {
    "name": "Capitol Hill Station",
    "label": "Capitol Hill Station, Broadway E, Seattle",
    "location": {"lat": 47.61915, "lon": -122.32025},
    "category": "TRANSIT_STOP"
  },
  "in_service_area": true,
  "attribution": "Search data © OpenStreetMap contributors"
}
```

## 8. `GET /api/v1/service-info`

Everything the client needs to configure itself: the boundary (for the outline and pre-checks), the timezone (for display), limits (input bounds), features (what to show) and data freshness. The example assumes PD-5 (King County) with a simplified rectangular boundary. Today's config covers Seattle only.

```json
{
  "api_version": "1.0.0",
  "service_area": {
    "name": "King County, WA",
    "timezone": "America/Los_Angeles",
    "center": {"lat": 47.6062, "lon": -122.3321},
    "bbox": [-122.54, 47.08, -121.06, 47.78],
    "boundary": {
      "type": "Polygon",
      "coordinates": [[[-122.54, 47.08], [-121.06, 47.08], [-121.06, 47.78], [-122.54, 47.78], [-122.54, 47.08]]]
    }
  },
  "limits": {
    "max_waypoints": 3,
    "max_dwell_minutes": 240,
    "max_itineraries": 5,
    "max_walk_distance_meters": {"min": 100, "max": 10000, "default": 2000},
    "max_walk_duration_minutes": {"min": 1, "max": 120, "default": null},
    "max_transfers": {"min": 0, "max": 5, "default": 3},
    "departure_window": {"earliest": "2026-11-09T00:00:00-08:00", "latest": "2027-02-14T23:59:59-08:00"}
  },
  "features": {
    "cost_estimates": false,
    "arrive_by": true,
    "arrive_by_with_waypoints": false,
    "transit_submode_filter": true,
    "optimize_options": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"]
  },
  "data": {
    "data_version": "seattle-2026-11-16-a1b2c3d4",
    "routing_engine": {"name": "OpenTripPlanner", "version": "2.10.0"},
    "realtime": false,
    "sources": [
      {
        "type": "GTFS",
        "name": "Puget Sound consolidated GTFS",
        "retrieved_at": "2026-11-16T03:10:00-08:00",
        "valid_from": "2026-11-09",
        "valid_until": "2027-02-14",
        "last_updated": null,
        "status": "OK",
        "attribution": null
      },
      {
        "type": "OSM",
        "name": "OpenStreetMap extract",
        "retrieved_at": "2026-11-16T03:00:00-08:00",
        "valid_from": null,
        "valid_until": null,
        "last_updated": null,
        "status": "OK",
        "attribution": "© OpenStreetMap contributors"
      }
    ]
  }
}
```

---

## 9. Validation rules

Validation happens in two stages:

1. **Schema validation (Pydantic).** If it fails, nothing else runs.
2. **Domain validation.** These checks need configuration or geometry. All of them run, so the user sees every problem at once.

Every failure returns `422` with field-level `errors[]`.

| # | Field | Rule | Stage | `code` |
|---|---|---|---|---|
| V1 | `*.lat`, `*.lon` | Number, finite, within range | schema | `INVALID_COORDINATES` |
| V2 | body | Valid JSON, an object, no unknown fields, ≤ 16 KiB | schema | `VALIDATION_ERROR` (`413` for size) |
| V3 | `origin`, `destination`, `modes` | Present | schema | `VALIDATION_ERROR` |
| V4 | `modes` | ≥ 1 item, unique, known values | schema | `UNSUPPORTED_MODE` (unknown value) / `VALIDATION_ERROR` |
| V5 | `modes[i]` | Enabled in this deployment | domain | `UNSUPPORTED_MODE` (`details.supported`) |
| V6 | `transit_submodes_excluded` | Known values; only with TRANSIT; not every submode | schema / domain | `VALIDATION_ERROR` |
| V7 | `waypoints` | ≤ `limits.max_waypoints` | schema (≤ 3) / domain (configured limit) | `TOO_MANY_WAYPOINTS` |
| V8 | `waypoints[i].dwell_minutes` | Integer 0–240 | schema | `VALIDATION_ERROR` |
| V9 | `*.name` | ≤ 200 characters | schema | `VALIDATION_ERROR` |
| V10 | `time.datetime` | RFC 3339 **with an offset** | schema | `INVALID_TIME` |
| V11 | `time.datetime` | Within `limits.departure_window` | domain | `TIME_OUTSIDE_SERVICE_WINDOW` |
| V12 | `time.type` + `waypoints` | `ARRIVE_BY` only with zero waypoints | domain | `ARRIVE_BY_WITH_WAYPOINTS` |
| V13 | `optimize` | Known value, listed in `features.optimize_options` | schema / domain | `UNSUPPORTED_OPTIMIZATION` |
| V14 | `constraints.*`, `max_itineraries` | Within the bounds in section 4.1 | schema | `VALIDATION_ERROR` |
| V15 | origin, destination, each waypoint | Inside the service-area polygon | domain | `OUTSIDE_SERVICE_AREA` (pointer to the point) |
| V16 | origin vs. destination | ≥ 50 m apart | domain | `ORIGIN_EQUALS_DESTINATION` |
| V17 | consecutive points (origin, waypoints…, destination) | ≥ 50 m apart | domain | `WAYPOINT_TOO_CLOSE` |
| V18 | `/places/search` `q` | 3–200 characters; `lat` and `lon` both or neither | schema | `INVALID_QUERY` |
| V19 | `/places/reverse` `lat`, `lon` | Present and within range | schema | `INVALID_COORDINATES` |

**Top-level code rule:** if every field error shares one code, the top-level `code` is that code. Otherwise it is `VALIDATION_ERROR`.

**Not errors:**
- a departure in the past (within the window) → warning `DEPARTURE_IN_PAST`;
- shared modes without data → warning;
- no feasible route → `200 NO_ROUTE`.

---

## 10. Errors

### 10.1 Problem Details structure

Error bodies follow RFC 9457, plus these extension members:

| Member | Type | Notes |
|---|---|---|
| `type` | URI reference | `urn:mmr:problem:<kebab-case code>`. Not dereferenceable in the MVP |
| `title` | string | Short, stable per `code` |
| `status` | integer | Same as the HTTP status |
| `detail` | string | Human-readable explanation for this occurrence |
| `instance` | string | Request path |
| `code` | `ErrorCode` | **The value clients switch on** |
| `request_id` | string | Same as `X-Request-ID` |
| `retryable` | boolean | Whether retrying the identical request may succeed |
| `errors` | `FieldError[]` | `{pointer, code, message}`. `pointer` is a JSON Pointer (RFC 6901) into the body, or `/query/<param>` for query parameters. Empty for non-field errors |
| `details` | object or null | Code-specific data, e.g. `supported` modes, `provider`, `deadline_seconds` |

FastAPI's default validation response (`{"detail": [...]}`) is replaced by this shape through an exception handler (an implementation step, not part of the contract).

### 10.2 Error catalogue

| `code` | HTTP | Retryable | When | Frontend action |
|---|---|---|---|---|
| `VALIDATION_ERROR` | 422 | no | Schema violation not covered below | Highlight `errors[].pointer` fields |
| `INVALID_COORDINATES` | 422 | no | V1, V19 | "That location isn't valid"; clear the point |
| `OUTSIDE_SERVICE_AREA` | 422 | no | V15 | "Outside the area we cover"; show the boundary |
| `ORIGIN_EQUALS_DESTINATION` | 422 | no | V16 | "Start and destination are the same place" |
| `WAYPOINT_TOO_CLOSE` | 422 | no | V17 | Point to the waypoint |
| `TOO_MANY_WAYPOINTS` | 422 | no | V7 | Disable "Add stop" |
| `UNSUPPORTED_MODE` | 422 | no | V4, V5 | Refresh `/transport/modes`; deselect the mode |
| `UNSUPPORTED_OPTIMIZATION` | 422 | no | V13 | Fall back to `FASTEST` |
| `INVALID_TIME` | 422 | no | V10 | Client bug: fix the time formatting |
| `TIME_OUTSIDE_SERVICE_WINDOW` | 422 | no | V11 | "Schedules available until <date>" |
| `ARRIVE_BY_WITH_WAYPOINTS` | 422 | no | V12 | Disable arrive-by when stops exist |
| `INVALID_QUERY` | 422 | no | V18 | Keep typing; no message needed |
| `PAYLOAD_TOO_LARGE` | 413 | no | Body > 16 KiB | Client bug |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | no | Body is not JSON | Client bug |
| `NOT_FOUND` / `METHOD_NOT_ALLOWED` | 404 / 405 | no | Unknown path or method | Client bug |
| `RATE_LIMITED` | 429 | yes | Rate limit exceeded | Back off for `Retry-After` |
| `ROUTING_UNAVAILABLE` | 503 | yes | The routing engine is unreachable, starting up or has expired data | "Route planning is temporarily unavailable"; offer a retry after `Retry-After` |
| `GEOCODING_UNAVAILABLE` | 503 | yes | Geocoder unreachable or erroring | "Search unavailable, click the map" |
| `ROUTING_TIMEOUT` | 504 | yes | The overall deadline (30 s) passed with no complete itinerary | "That took too long"; offer a retry |
| `INTERNAL_ERROR` | 500 | maybe | Unexpected failure, including C++ contract violations | Generic message + `request_id` |
| `UNAUTHENTICATED` | 401 | no | `/me*` without a valid, unexpired Supabase sign-in token | Refresh the token once and retry; otherwise ask the user to log in again |
| `ACCOUNT_NOT_FOUND` | 404 | no | Valid token, but `POST /me` hasn't been called yet (or the account was deleted) | Call `POST /me` to finish sign-up |
| `SAVED_PLACE_LIMIT` | 409 | no | Adding a 51st saved place | "You can save up to 50 places" |
| `HISTORY_DISABLED` | 409 | no | `POST /me/history` while history is paused | Don't send; the client should check `preferences.history_enabled` first |
| `ACCOUNT_SERVICE_UNAVAILABLE` | 503 | yes | Supabase (sign-in or database) unreachable | "Your account is unavailable right now. You can keep planning trips." Planning is unaffected |

### 10.3 The five required error cases

#### 1. Invalid coordinates

`422 INVALID_COORDINATES`, request with `"origin": {"lat": 95.2, …}`:

```json
{
  "type": "urn:mmr:problem:invalid-coordinates",
  "title": "Invalid coordinates",
  "status": 422,
  "detail": "One or more coordinates are out of range.",
  "instance": "/api/v1/routes/plan",
  "code": "INVALID_COORDINATES",
  "request_id": "0b7d4e2a-9c61-4f38-8e05-3a1c7f9d6b24",
  "retryable": false,
  "errors": [
    {
      "pointer": "/origin/lat",
      "code": "INVALID_COORDINATES",
      "message": "Latitude must be between -90 and 90 (got 95.2)."
    }
  ],
  "details": null
}
```

#### 2. Unsupported mode

`422 UNSUPPORTED_MODE`, request with `"modes": ["WALK", "CAR"]` while CAR is disabled. An unknown string such as `"HELICOPTER"` produces the same code, with `details.unsupported: ["HELICOPTER"]`.

```json
{
  "type": "urn:mmr:problem:unsupported-mode",
  "title": "Unsupported mode",
  "status": 422,
  "detail": "CAR is not available in this deployment.",
  "instance": "/api/v1/routes/plan",
  "code": "UNSUPPORTED_MODE",
  "request_id": "6e2f9a14-3d7b-4c85-b0a9-1f4e8c2d7a63",
  "retryable": false,
  "errors": [{"pointer": "/modes/1", "code": "UNSUPPORTED_MODE", "message": "Mode CAR is not enabled."}],
  "details": {"unsupported": ["CAR"], "supported": ["WALK", "TRANSIT", "BIKE"]}
}
```

Related domain error, `422 OUTSIDE_SERVICE_AREA`:

```json
{
  "type": "urn:mmr:problem:outside-service-area",
  "title": "Outside service area",
  "status": 422,
  "detail": "The destination is outside the area we cover (King County, WA).",
  "instance": "/api/v1/routes/plan",
  "code": "OUTSIDE_SERVICE_AREA",
  "request_id": "2c8a5f07-6b1e-4d93-a7c2-9e0f3b5d1a48",
  "retryable": false,
  "errors": [
    {
      "pointer": "/destination",
      "code": "OUTSIDE_SERVICE_AREA",
      "message": "Point (47.2529, -122.4443) is outside King County, WA."
    }
  ],
  "details": {"service_area": "King County, WA"}
}
```

#### 3. No available route

**Not an error response**. It is `200` with `outcome: "NO_ROUTE"`, `itineraries: []` and a `no_route` object containing `reason`, `failed_segment_index` (which part of a waypoint journey failed, FR-WAY-5), `message` and `suggestions`. See the example in section 4.4.

**Rationale:** the request was valid and the system worked correctly. Treating this as an error would make the frontend show "something went wrong" for a normal outcome, such as no service at 2:40 AM.

#### 4. Unavailable transportation provider

`503 ROUTING_UNAVAILABLE` with `Retry-After`. `details.provider` names the dependency and `details.reason` is one of `UNREACHABLE`, `STARTING`, `DATA_EXPIRED`.

- **When it is returned:** only when **every** routing query failed with a connection or HTTP error. This fixes D2, where an outage was reported as "no routes".
- **Partial failures:** if only some candidate queries fail, the response is `200` with the `PARTIAL_RESULTS` warning.
- **Optional providers:** an unavailable *optional* provider, such as a GBFS feed, is never an error. Its options are left out and the `SHARED_MOBILITY_UNAVAILABLE` warning is added.

```json
{
  "type": "urn:mmr:problem:routing-unavailable",
  "title": "Routing unavailable",
  "status": 503,
  "detail": "Route planning is temporarily unavailable. Please try again shortly.",
  "instance": "/api/v1/routes/plan",
  "code": "ROUTING_UNAVAILABLE",
  "request_id": "9f1c3e6b-2a7d-4b58-8d04-6e3a1c9f7b25",
  "retryable": true,
  "errors": [],
  "details": {"provider": "routing_engine", "reason": "UNREACHABLE"}
}
```

#### 5. Routing service timeout

| Situation | Response |
|---|---|
| The overall deadline (30 s, PRD REL-1) passes with **no** complete itinerary | `504 ROUTING_TIMEOUT` |
| The deadline passes but some itineraries are complete | `200` with those itineraries + `PARTIAL_RESULTS` |
| A single routing query times out (10 s) | Treated as a failed candidate, not a whole-request error |

```json
{
  "type": "urn:mmr:problem:routing-timeout",
  "title": "Routing timed out",
  "status": 504,
  "detail": "Planning took longer than 30 seconds and no complete itinerary was found.",
  "instance": "/api/v1/routes/plan",
  "code": "ROUTING_TIMEOUT",
  "request_id": "4d6b8a2f-1e9c-4f73-b5a0-8c2e7d1f3a96",
  "retryable": true,
  "errors": [],
  "details": {"deadline_seconds": 30}
}
```

### 10.4 Retry guidance for clients

- **Don't retry automatically** when `retryable` is `false`.
- **`429` / `503`:** wait for `Retry-After`. Retry at most once automatically; after that, show a retry button.
- **`504`:** retry at most once, after user action.
- **Never retry a superseded request** (one the client has already aborted).

---

## 11. Schema definitions

### 11.1 Pydantic models (schema sketch, not committed code)

This sketch defines the models the implementation will use. Handlers are out of scope. It targets Pydantic 2 and Python 3.12.

```python
from datetime import date
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

class Strict(BaseModel):   # requests: unknown fields -> 422 (API-11)
    model_config = ConfigDict(extra="forbid")

class Out(BaseModel):      # responses: serialised by alias ("from")
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

Lat = Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
Lon = Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
Name = Annotated[str, Field(max_length=200)]
NonNegInt = Annotated[int, Field(ge=0)]

# ----- enums -----
class Mode(StrEnum):
    WALK = "WALK"; TRANSIT = "TRANSIT"; BIKE = "BIKE"; BIKE_SHARE = "BIKE_SHARE"
    SCOOTER_SHARE = "SCOOTER_SHARE"; CAR = "CAR"; TAXI = "TAXI"
class TransitSubmode(StrEnum):
    BUS = "BUS"; LIGHT_RAIL = "LIGHT_RAIL"; STREETCAR = "STREETCAR"; COMMUTER_RAIL = "COMMUTER_RAIL"
    FERRY = "FERRY"; MONORAIL = "MONORAIL"; OTHER = "OTHER"
class TimeType(StrEnum): DEPART_AT = "DEPART_AT"; ARRIVE_BY = "ARRIVE_BY"
class OptimizePreference(StrEnum):
    FASTEST = "FASTEST"; FEWEST_TRANSFERS = "FEWEST_TRANSFERS"; LEAST_WALKING = "LEAST_WALKING"
class ItineraryLabel(StrEnum):
    FASTEST = "FASTEST"; FEWEST_TRANSFERS = "FEWEST_TRANSFERS"; LEAST_WALKING = "LEAST_WALKING"
class TimeBasis(StrEnum): SCHEDULED = "SCHEDULED"; ESTIMATED = "ESTIMATED"; REALTIME = "REALTIME"
class PriceBasis(StrEnum):
    CONFIRMED = "CONFIRMED"; NO_CHARGE = "NO_CHARGE"; PUBLISHED_FARE = "PUBLISHED_FARE"
    ESTIMATED = "ESTIMATED"; PLACEHOLDER = "PLACEHOLDER"
class TransferKind(StrEnum):
    BOARD = "BOARD"; ALIGHT = "ALIGHT"; TRANSIT_TRANSFER = "TRANSIT_TRANSFER"; BIKE_PARK = "BIKE_PARK"
    VEHICLE_PICKUP = "VEHICLE_PICKUP"; VEHICLE_DROPOFF = "VEHICLE_DROPOFF"; PARK_AND_RIDE = "PARK_AND_RIDE"
class EndpointKind(StrEnum): ORIGIN = "ORIGIN"; WAYPOINT = "WAYPOINT"; DESTINATION = "DESTINATION"
class Outcome(StrEnum): OK = "OK"; NO_ROUTE = "NO_ROUTE"
class NoRouteReason(StrEnum):
    NO_PATH_FOUND = "NO_PATH_FOUND"; ALL_EXCLUDED_BY_CONSTRAINTS = "ALL_EXCLUDED_BY_CONSTRAINTS"
    OUTSIDE_SERVICE_HOURS = "OUTSIDE_SERVICE_HOURS"
class Suggestion(StrEnum):
    CHANGE_TIME = "CHANGE_TIME"; ALLOW_MORE_MODES = "ALLOW_MORE_MODES"
    RELAX_CONSTRAINTS = "RELAX_CONSTRAINTS"; MOVE_OR_REMOVE_WAYPOINT = "MOVE_OR_REMOVE_WAYPOINT"
class WarningSeverity(StrEnum): INFO = "INFO"; WARNING = "WARNING"
class WarningCode(StrEnum):
    PARTIAL_RESULTS = "PARTIAL_RESULTS"; DEPARTURE_IN_PAST = "DEPARTURE_IN_PAST"
    ONLY_WALKING_AVAILABLE = "ONLY_WALKING_AVAILABLE"; RESULTS_LIMITED_BY_CONSTRAINTS = "RESULTS_LIMITED_BY_CONSTRAINTS"
    SHARED_MOBILITY_UNAVAILABLE = "SHARED_MOBILITY_UNAVAILABLE"; LOCATION_SNAPPED = "LOCATION_SNAPPED"
    TIGHT_TRANSFER = "TIGHT_TRANSFER"; LONG_WAIT = "LONG_WAIT"; LONG_TRIP = "LONG_TRIP"
    GEOMETRY_APPROXIMATE = "GEOMETRY_APPROXIMATE"; DATA_NEAR_EXPIRY = "DATA_NEAR_EXPIRY"
    DEVELOPMENT_ROUTER = "DEVELOPMENT_ROUTER"; COST_INCOMPLETE = "COST_INCOMPLETE"
class DataSourceType(StrEnum): GTFS = "GTFS"; OSM = "OSM"; GBFS = "GBFS"; GTFS_RT = "GTFS_RT"
class SourceStatus(StrEnum): OK = "OK"; STALE = "STALE"; UNAVAILABLE = "UNAVAILABLE"
# HealthStatus, PlaceCategory, ErrorCode: same pattern, values as in contracts/openapi.yaml.

# ----- request -----
class LocationInput(Strict):
    lat: Lat
    lon: Lon
    name: Name | None = None

class WaypointInput(LocationInput):
    dwell_minutes: Annotated[int, Field(ge=0, le=240)] = 0

class TimeSpec(Strict):
    type: TimeType
    datetime: AwareDatetime                      # naive datetimes rejected (V10)

class PlanConstraints(Strict):
    max_walk_distance_meters: Annotated[int, Field(ge=100, le=10_000)] = 2000
    max_walk_duration_minutes: Annotated[int, Field(ge=1, le=120)] | None = None
    max_transfers: Annotated[int, Field(ge=0, le=5)] = 3

class PlanRequest(Strict):
    origin: LocationInput
    destination: LocationInput
    waypoints: Annotated[list[WaypointInput], Field(max_length=3)] = []
    modes: Annotated[list[Mode], Field(min_length=1)]              # + uniqueness validator (V4)
    transit_submodes_excluded: list[TransitSubmode] = []
    time: TimeSpec | None = None                                   # None = depart now
    optimize: OptimizePreference = OptimizePreference.FASTEST
    constraints: PlanConstraints | None = None
    max_itineraries: Annotated[int, Field(ge=1, le=5)] = 5

# ----- response -----
class Coordinate(Out):
    lat: Lat
    lon: Lon

class StopRef(Out):
    id: str
    code: str | None
    name: str

class Place(Out):
    name: str
    location: Coordinate
    stop: StopRef | None

class EncodedPolyline(Out):
    format: Literal["ENCODED_POLYLINE"] = "ENCODED_POLYLINE"
    precision: Literal[5] = 5
    value: str

class CostEstimate(Out):
    amount_minor: NonNegInt
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
    basis: PriceBasis
    is_estimate: bool                              # False only for CONFIRMED and NO_CHARGE
    low_minor: NonNegInt | None
    high_minor: NonNegInt | None
    note: str | None

class StopCall(Out):
    stop: StopRef
    location: Coordinate
    arrival_time: AwareDatetime | None
    departure_time: AwareDatetime | None

class TransitDetails(Out):
    submode: TransitSubmode
    route_id: str
    route_short_name: str | None
    route_long_name: str | None
    agency_name: str
    headsign: str | None
    intermediate_stops: list[StopCall]

class RentalDetails(Out):
    provider_name: str | None
    vehicle_type: Literal["BIKE", "E_BIKE", "SCOOTER"] | None

class Leg(Out):
    index: NonNegInt
    mode: Mode
    from_: Place = Field(alias="from")
    to: Place
    departure_time: AwareDatetime
    arrival_time: AwareDatetime
    duration_seconds: NonNegInt
    distance_meters: Annotated[float, Field(ge=0)]
    geometry: EncodedPolyline
    time_basis: TimeBasis
    transit: TransitDetails | None                 # exactly when mode == TRANSIT
    rental: RentalDetails | None                   # exactly when mode is *_SHARE
    cost: CostEstimate | None

class SegmentEndpoint(Out):
    kind: EndpointKind
    waypoint_index: NonNegInt | None

class Segment(Out):
    index: NonNegInt
    from_: SegmentEndpoint = Field(alias="from")
    to: SegmentEndpoint
    leg_start: NonNegInt
    leg_end: NonNegInt

class TransferPoint(Out):
    index: NonNegInt
    kind: TransferKind
    place: Place
    from_place: Place | None
    incoming_leg_index: NonNegInt | None
    outgoing_leg_index: NonNegInt | None
    walk_distance_meters: Annotated[float, Field(ge=0)]
    walk_duration_seconds: NonNegInt
    wait_duration_seconds: NonNegInt | None
    counts_as_transfer: bool

class WaypointVisit(Out):
    waypoint_index: NonNegInt
    place: Place
    arrival_time: AwareDatetime
    departure_time: AwareDatetime
    dwell_seconds: NonNegInt

class Warning(Out):
    code: WarningCode
    severity: WarningSeverity
    message: str
    leg_index: NonNegInt | None
    transfer_index: NonNegInt | None
    details: dict[str, Any] | None

class Itinerary(Out):
    id: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")]
    labels: list[ItineraryLabel]
    departure_time: AwareDatetime
    arrival_time: AwareDatetime
    duration_seconds: NonNegInt
    walking_seconds: NonNegInt
    waiting_seconds: NonNegInt
    dwell_seconds: NonNegInt
    distance_meters: Annotated[float, Field(ge=0)]
    walking_distance_meters: Annotated[float, Field(ge=0)]
    transfers: NonNegInt
    mode_sequence: list[Mode]
    cost: CostEstimate | None
    bbox: Annotated[list[float], Field(min_length=4, max_length=4)]
    legs: Annotated[list[Leg], Field(min_length=1)]
    segments: Annotated[list[Segment], Field(min_length=1)]
    transfer_points: list[TransferPoint]
    waypoint_visits: list[WaypointVisit]
    warnings: list[Warning]

class ResolvedConstraints(Out):
    max_walk_distance_meters: int
    max_walk_duration_minutes: int | None
    max_transfers: int

class ResolvedQuery(Out):
    time: TimeSpec
    modes: list[Mode]
    transit_submodes_excluded: list[TransitSubmode]
    optimize: OptimizePreference
    constraints: ResolvedConstraints
    max_itineraries: int
    waypoint_count: NonNegInt

class NoRoute(Out):
    reason: NoRouteReason
    failed_segment_index: NonNegInt | None
    message: str
    suggestions: list[Suggestion]

class RoutingEngine(Out):
    name: str
    version: str | None

class DataSource(Out):
    type: DataSourceType
    name: str
    retrieved_at: AwareDatetime | None
    valid_from: date | None
    valid_until: date | None
    last_updated: AwareDatetime | None
    status: SourceStatus
    attribution: str | None

class DataProvenance(Out):
    data_version: str
    routing_engine: RoutingEngine
    realtime: bool
    sources: list[DataSource]

class PlanResponse(Out):
    request_id: str                                # UUID
    generated_at: AwareDatetime
    outcome: Outcome
    timezone: str
    query: ResolvedQuery
    itineraries: Annotated[list[Itinerary], Field(max_length=5)]
    no_route: NoRoute | None
    warnings: list[Warning]
    data: DataProvenance

class FieldError(Out):
    pointer: str
    code: str                                      # ErrorCode
    message: str

class Problem(Out):                                # media type application/problem+json
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None
    code: str                                      # ErrorCode
    request_id: str
    retryable: bool
    errors: list[FieldError]
    details: dict[str, Any] | None

# ModesResponse, HealthResponse, ServiceInfoResponse, PlaceSearchResponse, PlaceReverseResponse:
# one model per schema of the same name in contracts/openapi.yaml.
```

### 11.2 TypeScript interfaces

These mirror the Pydantic models and the YAML. Once approved, they are **generated** from `contracts/openapi.yaml` (e.g. with `openapi-typescript`) into `packages/shared`. Until then, this listing is the reference.

```typescript
// ----- enums (string literal unions) -----
export type Mode = "WALK" | "TRANSIT" | "BIKE" | "BIKE_SHARE" | "SCOOTER_SHARE" | "CAR" | "TAXI";
export type TransitSubmode = "BUS" | "LIGHT_RAIL" | "STREETCAR" | "COMMUTER_RAIL" | "FERRY" | "MONORAIL" | "OTHER";
export type TimeType = "DEPART_AT" | "ARRIVE_BY";
export type OptimizePreference = "FASTEST" | "FEWEST_TRANSFERS" | "LEAST_WALKING";
export type ItineraryLabel = "FASTEST" | "FEWEST_TRANSFERS" | "LEAST_WALKING";
export type TimeBasis = "SCHEDULED" | "ESTIMATED" | "REALTIME";
export type PriceBasis = "CONFIRMED" | "NO_CHARGE" | "PUBLISHED_FARE" | "ESTIMATED" | "PLACEHOLDER";
export type TransferKind =
  | "BOARD" | "ALIGHT" | "TRANSIT_TRANSFER" | "BIKE_PARK" | "VEHICLE_PICKUP" | "VEHICLE_DROPOFF" | "PARK_AND_RIDE";
export type EndpointKind = "ORIGIN" | "WAYPOINT" | "DESTINATION";
export type Outcome = "OK" | "NO_ROUTE";
export type NoRouteReason = "NO_PATH_FOUND" | "ALL_EXCLUDED_BY_CONSTRAINTS" | "OUTSIDE_SERVICE_HOURS";
export type Suggestion = "CHANGE_TIME" | "ALLOW_MORE_MODES" | "RELAX_CONSTRAINTS" | "MOVE_OR_REMOVE_WAYPOINT";
export type WarningSeverity = "INFO" | "WARNING";
export type WarningCode =
  | "PARTIAL_RESULTS" | "DEPARTURE_IN_PAST" | "ONLY_WALKING_AVAILABLE" | "RESULTS_LIMITED_BY_CONSTRAINTS"
  | "SHARED_MOBILITY_UNAVAILABLE" | "LOCATION_SNAPPED" | "TIGHT_TRANSFER" | "LONG_WAIT" | "LONG_TRIP"
  | "GEOMETRY_APPROXIMATE" | "DATA_NEAR_EXPIRY" | "DEVELOPMENT_ROUTER" | "COST_INCOMPLETE";
export type DataSourceType = "GTFS" | "OSM" | "GBFS" | "GTFS_RT";
export type SourceStatus = "OK" | "STALE" | "UNAVAILABLE";
export type HealthStatus = "OK" | "DEGRADED" | "DOWN" | "UNKNOWN";
export type PlaceCategory = "ADDRESS" | "POI" | "TRANSIT_STOP" | "OTHER";
export type ErrorCode =
  | "VALIDATION_ERROR" | "INVALID_COORDINATES" | "OUTSIDE_SERVICE_AREA" | "ORIGIN_EQUALS_DESTINATION"
  | "WAYPOINT_TOO_CLOSE" | "TOO_MANY_WAYPOINTS" | "UNSUPPORTED_MODE" | "UNSUPPORTED_OPTIMIZATION"
  | "INVALID_TIME" | "TIME_OUTSIDE_SERVICE_WINDOW" | "ARRIVE_BY_WITH_WAYPOINTS" | "INVALID_QUERY"
  | "ROUTING_UNAVAILABLE" | "GEOCODING_UNAVAILABLE" | "ROUTING_TIMEOUT" | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "INTERNAL_ERROR";

/** Response enums may gain values in v1: accept unknown strings when reading them (§2.8). */
export type Open<T extends string> = T | (string & {});

// ----- shared -----
export type IsoDateTime = string;  // RFC 3339 with offset
export type IsoDate = string;      // YYYY-MM-DD
export type BBox = [minLon: number, minLat: number, maxLon: number, maxLat: number];
export interface Coordinate { lat: number; lon: number }
export interface StopRef { id: string; code: string | null; name: string }
export interface Place { name: string; location: Coordinate; stop: StopRef | null }
export interface EncodedPolyline { format: "ENCODED_POLYLINE"; precision: 5; value: string }

// ----- request -----
export interface LocationInput { lat: number; lon: number; name?: string | null }
export interface WaypointInput extends LocationInput { dwell_minutes?: number }
export interface TimeSpec { type: TimeType; datetime: IsoDateTime }
export interface PlanConstraints {
  max_walk_distance_meters?: number;
  max_walk_duration_minutes?: number | null;
  max_transfers?: number;
}
export interface PlanRequest {
  origin: LocationInput;
  destination: LocationInput;
  waypoints?: WaypointInput[];
  modes: Mode[];
  transit_submodes_excluded?: TransitSubmode[];
  time?: TimeSpec | null;          // omitted or null = depart now
  optimize?: OptimizePreference;
  constraints?: PlanConstraints | null;
  max_itineraries?: number;
}

// ----- response -----
export interface CostEstimate {
  amount_minor: number;            // integer, minor units (cents)
  currency: string;                // ISO 4217
  basis: Open<PriceBasis>;
  is_estimate: boolean;            // false only for CONFIRMED and NO_CHARGE
  low_minor: number | null;
  high_minor: number | null;
  note: string | null;
}
export interface StopCall {
  stop: StopRef; location: Coordinate; arrival_time: IsoDateTime | null; departure_time: IsoDateTime | null;
}
export interface TransitDetails {
  submode: Open<TransitSubmode>;
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  agency_name: string;
  headsign: string | null;
  intermediate_stops: StopCall[];
}
export interface RentalDetails { provider_name: string | null; vehicle_type: "BIKE" | "E_BIKE" | "SCOOTER" | null }
export interface Leg {
  index: number;
  mode: Open<Mode>;
  from: Place;
  to: Place;
  departure_time: IsoDateTime;
  arrival_time: IsoDateTime;
  duration_seconds: number;
  distance_meters: number;
  geometry: EncodedPolyline;
  time_basis: Open<TimeBasis>;
  transit: TransitDetails | null;
  rental: RentalDetails | null;
  cost: CostEstimate | null;
}
export interface SegmentEndpoint { kind: EndpointKind; waypoint_index: number | null }
export interface Segment { index: number; from: SegmentEndpoint; to: SegmentEndpoint; leg_start: number; leg_end: number }
export interface TransferPoint {
  index: number;
  kind: Open<TransferKind>;
  place: Place;
  from_place: Place | null;
  incoming_leg_index: number | null;
  outgoing_leg_index: number | null;
  walk_distance_meters: number;
  walk_duration_seconds: number;
  wait_duration_seconds: number | null;
  counts_as_transfer: boolean;
}
export interface WaypointVisit {
  waypoint_index: number; place: Place; arrival_time: IsoDateTime; departure_time: IsoDateTime; dwell_seconds: number;
}
export interface Warning {
  code: Open<WarningCode>;
  severity: WarningSeverity;
  message: string;
  leg_index: number | null;
  transfer_index: number | null;
  details: Record<string, unknown> | null;
}
export interface Itinerary {
  id: string;
  labels: Open<ItineraryLabel>[];
  departure_time: IsoDateTime;
  arrival_time: IsoDateTime;
  duration_seconds: number;
  walking_seconds: number;
  waiting_seconds: number;
  dwell_seconds: number;
  distance_meters: number;
  walking_distance_meters: number;
  transfers: number;
  mode_sequence: Open<Mode>[];
  cost: CostEstimate | null;
  bbox: BBox;
  legs: Leg[];
  segments: Segment[];
  transfer_points: TransferPoint[];
  waypoint_visits: WaypointVisit[];
  warnings: Warning[];
}
export interface ResolvedConstraints {
  max_walk_distance_meters: number; max_walk_duration_minutes: number | null; max_transfers: number;
}
export interface ResolvedQuery {
  time: TimeSpec;
  modes: Mode[];
  transit_submodes_excluded: TransitSubmode[];
  optimize: OptimizePreference;
  constraints: ResolvedConstraints;
  max_itineraries: number;
  waypoint_count: number;
}
export interface NoRoute {
  reason: Open<NoRouteReason>; failed_segment_index: number | null; message: string; suggestions: Open<Suggestion>[];
}
export interface DataSource {
  type: Open<DataSourceType>;
  name: string;
  retrieved_at: IsoDateTime | null;
  valid_from: IsoDate | null;
  valid_until: IsoDate | null;
  last_updated: IsoDateTime | null;
  status: Open<SourceStatus>;
  attribution: string | null;
}
export interface DataProvenance {
  data_version: string; routing_engine: { name: string; version: string | null }; realtime: boolean; sources: DataSource[];
}
export interface PlanResponse {
  request_id: string;
  generated_at: IsoDateTime;
  outcome: Outcome;
  timezone: string;
  query: ResolvedQuery;
  itineraries: Itinerary[];
  no_route: NoRoute | null;
  warnings: Warning[];
  data: DataProvenance;
}

// ----- other endpoints -----
export interface TransitSubmodeInfo { id: Open<TransitSubmode>; label: string; enabled: boolean }
export interface ModeInfo {
  id: Open<Mode>; label: string; description: string; enabled: boolean; default_selected: boolean;
  connector_only_when_unselected: boolean; disabled_reason: string | null; submodes: TransitSubmodeInfo[];
}
export interface ModesResponse { modes: ModeInfo[]; defaults: Mode[] }

export interface ComponentHealth { status: Open<HealthStatus>; detail: string | null; checked_at: IsoDateTime | null }
export interface HealthResponse {
  status: Open<HealthStatus>;
  api_version: string;
  time: IsoDateTime;
  components: { routing_engine: ComponentHealth; native_engine: ComponentHealth; geocoder: ComponentHealth; transit_data: ComponentHealth };
}

export interface IntRange { min: number; max: number; default: number | null }
export interface ServiceInfoResponse {
  api_version: string;
  service_area: {
    name: string; timezone: string; center: Coordinate; bbox: BBox;
    boundary: { type: "Polygon" | "MultiPolygon"; coordinates: unknown[] };  // GeoJSON, [lon, lat]
  };
  limits: {
    max_waypoints: number; max_dwell_minutes: number; max_itineraries: number;
    max_walk_distance_meters: IntRange; max_walk_duration_minutes: IntRange; max_transfers: IntRange;
    departure_window: { earliest: IsoDateTime; latest: IsoDateTime };
  };
  features: {
    cost_estimates: boolean; arrive_by: boolean; arrive_by_with_waypoints: boolean;
    transit_submode_filter: boolean; optimize_options: OptimizePreference[];
  };
  data: DataProvenance;
}

export interface PlaceResult { name: string; label: string; location: Coordinate; category: Open<PlaceCategory> }
export interface PlaceSearchResponse { request_id: string; results: PlaceResult[]; attribution: string }
export interface PlaceReverseResponse {
  request_id: string; result: PlaceResult | null; in_service_area: boolean; attribution: string;
}

// ----- errors -----
export interface FieldError { pointer: string; code: Open<ErrorCode>; message: string }
export interface Problem {
  type: string; title: string; status: number; detail: string; instance?: string;
  code: Open<ErrorCode>; request_id: string; retryable: boolean; errors: FieldError[];
  details: Record<string, unknown> | null;
}
```

---

## 12. Versioning conventions

1. **Major version in the URL:** `/api/v1`. A breaking change creates `/api/v2`. Both run side by side until the frontend has moved; with one internal client, that can be a single release.
2. **Contract version** (`info.version` in the YAML, `api_version` in `/health` and `/service-info`) follows SemVer:
   - **MAJOR** = a new URL version;
   - **MINOR** = an additive change;
   - **PATCH** = documentation or fixes.

   Until the first implementation ships it is `1.0.0-draft.N`; the first released version is `1.0.0`.
3. **Allowed in v1 (additive):**
   - new endpoints;
   - new optional request fields;
   - new response fields;
   - new values in *response* enums;
   - new error codes;
   - new warning codes;
   - accepting new request enum values (e.g. enabling `CHEAPEST`);
   - adding `format` options (e.g. a GeoJSON geometry).
4. **Breaking (requires v2):**
   - removing or renaming a field;
   - changing a type, unit or meaning;
   - making an optional request field required;
   - removing a request enum value;
   - changing default behaviour in a way clients can see (e.g. the default `optimize`);
   - changing an HTTP status for an existing situation.
5. **Deprecation:** deprecated operations are marked `deprecated: true` in the YAML. Responses from them carry a `Deprecation` header and a `Sunset` header (RFC 8594) with the removal date.
6. **Enforcement:** CI compares `contracts/openapi.yaml` on each PR with `main` using a breaking-change checker (e.g. `oasdiff`). A detected break fails the build unless the PR bumps the major version.

---

## 13. How the frontend consumes the API

| Step | What the web app does |
|---|---|
| **Types** | Generates TypeScript types from `contracts/openapi.yaml` into `packages/shared`, and keeps `PlannerClient` as the single HTTP entry point (architecture section 4.1) |
| **Startup** | Calls `GET /service-info` and `GET /transport/modes` once, and caches the results for the session. It then builds the mode picker (enabled modes only), the input bounds (limits), the area outline (boundary), the time formatter (timezone) and the feature toggles (`cost_estimates`, `arrive_by`) |
| **Building a request** | <ul><li>Sends coordinates as `{lat, lon}`.</li><li>Converts user units to metres (mi → m).</li><li>Builds `time.datetime` as the **Seattle wall-clock time with Seattle's offset** for that date. For example, 8:30 on 2026-11-20 becomes `2026-11-20T08:30:00-08:00`, whatever the device's timezone. Use `Intl` with `timeZone: service_area.timezone` or a timezone library.</li><li>Leaves `time` out for "leave now".</li></ul> |
| **Sending** | `POST /api/v1/routes/plan` with an `AbortController`. A new search aborts the previous one. Client timeout: 35 s, longer than the server's 30 s deadline |
| **`200` + `OK`** | Renders `itineraries` in order. Labels are mapped from codes to text. Sorting changes happen client-side over the returned list |
| **`200` + `NO_ROUTE`** | Shows `no_route.message`, highlights `failed_segment_index` when there are waypoints, and offers the `suggestions` as actions |
| **Warnings** | Shows response-level warnings as a banner and itinerary-level ones on the row or step. Unknown codes fall back to `message` |
| **Map** | Decodes each `leg.geometry` (precision 5 → `[lon, lat]` for MapLibre) and calls `fitBounds(itinerary.bbox)`. It draws **waypoint** markers from `waypoint_visits` (numbered) and **transfer** markers from `transfer_points` (transfer symbol), visually distinct |
| **Times and units** | Formats every timestamp with `Intl.DateTimeFormat(..., { timeZone: response.timezone })`. Converts metres to ft/mi for display |
| **Cost** | Shows nothing while `features.cost_estimates` is false. When enabled: never shows `PLACEHOLDER`; labels `is_estimate: true` amounts ("about", or a range); formats `amount_minor / 100` with `Intl.NumberFormat` and the response `currency` |
| **Provenance** | Shows "Scheduled times · data from `<valid_from>`" and every source `attribution` near the results |
| **Errors** | Parses `application/problem+json` and switches on `code` (section 10.2). Field errors map to form fields via `errors[].pointer`. Shows `request_id` for bug reports. Follows the retry guidance in section 10.4 |
| **State** | Treats itinerary IDs as valid only for the current response. Shareable links encode the *request*, never itinerary IDs |

---

## 14. Acceptance criteria and contract tests

### 14.1 Acceptance criteria for the contract

- [ ] The decisions API-1 to API-12 are accepted or amended by the team.
- [ ] The frontend and backend owners both sign off on sections 4, 11 (the contract-change rule in architecture section 15).
- [ ] `contracts/openapi.yaml` validates as OpenAPI 3.1, and **every embedded example validates against its schema** (checked for this draft; see section 14.3).
- [ ] The traceability in section 15 covers every Must requirement that involves the API.
- [x] Every item in section 16 is settled.

### 14.2 Contract tests (to be implemented with the API)

All of these run in CI without OpenTripPlanner: the fake router is swapped in through FastAPI's `app.dependency_overrides`.

| ID | Test | How | Covers |
|---|---|---|---|
| CT-1 | Spec is valid OpenAPI 3.1 | `openapi-spec-validator` | — |
| CT-2 | Every example in the YAML validates against its schema; the Markdown examples equal the YAML ones | jsonschema (Draft 2020-12) over `components.examples` | sections 4.4, 5–10 |
| CT-3 | **Drift check:** the app's generated `/openapi.json` is semantically equal to `contracts/openapi.yaml` | Normalised diff, or `oasdiff` with zero differences | API-12 |
| CT-4 | **Breaking-change check** against `main` | `oasdiff breaking` | section 12 |
| CT-5 | Every response in the API test suite validates against the spec | Response validation in pytest (e.g. `openapi-core`) or property-based tests (e.g. Schemathesis) | All |
| CT-6 | Plan invariants on every OK response: <ul><li>leg indices 0..n−1</li><li>legs don't overlap in time</li><li>`duration = Σ legs + waiting + dwell`</li><li>segments cover the legs exactly</li><li>`segments = waypoints + 1`</li><li>waypoints visited in order</li><li>transfer-point leg indices valid</li><li>no transfer point at a waypoint</li><li>`transfers = #TRANSIT_TRANSFER`</li><li>`transit` non-null ⇔ mode TRANSIT</li><li>only permitted modes (plus WALK)</li><li>constraints respected</li><li>exactly one holder of each label</li><li>every timestamp has an offset</li></ul> | pytest over fake-router scenarios and the PRD benchmark set | section 4.3 |
| CT-7 | Money rules: <ul><li>`cost` is null when `cost_estimates` is false</li><li>`basis` is never `CONFIRMED` in the MVP</li><li>`is_estimate` is consistent with `basis`</li><li>`low ≤ amount ≤ high`</li><li>itinerary basis is the weakest of its legs</li></ul> | pytest with the flag on and off | section 4.3.5 |
| CT-8 | Invalid coordinates → `422 INVALID_COORDINATES` with `pointer` `/origin/lat`; NaN and Infinity rejected | pytest | V1 |
| CT-9 | Unknown mode and disabled mode → `422 UNSUPPORTED_MODE` with `details.supported` | pytest | V4, V5 |
| CT-10 | Outside the area, same origin and destination, waypoint too close, too many waypoints, arrive-by with waypoints, naive datetime, time outside the window → the matching codes | pytest, one case each | V7–V17 |
| CT-11 | **No route:** a stub router returning nothing → `200`, `outcome NO_ROUTE`, empty list, `no_route` present, `failed_segment_index` correct for a waypoint journey | pytest | API-3, FR-WAY-5 |
| CT-12 | **Provider unavailable:** a stub router raising connection errors on every call → `503 ROUTING_UNAVAILABLE` + `Retry-After`. Failing on some calls → `200` + `PARTIAL_RESULTS` | pytest | D2 fix |
| CT-13 | **Timeout:** a stub router sleeping past a shortened deadline → `504 ROUTING_TIMEOUT`. A partial deadline gives `200` + `PARTIAL_RESULTS` | pytest with a 0.5 s test deadline | REL-1 |
| CT-14 | Every error is `application/problem+json` with `code`, `request_id` equal to `X-Request-ID`, and `status` equal to the HTTP status | pytest, all error paths | section 10.1 |
| CT-15 | Unknown request field → `422 VALIDATION_ERROR` | pytest | API-11 |
| CT-16 | Frontend: generated types compile; the client parses every example payload; unknown enum values and extra fields don't break rendering | `tsc` + `node --test` / Vitest over the YAML examples | section 2.8 |
| CT-17 | `/places/search` filters out results outside the area (stub geocoder); `q` shorter than 3 characters → `422 INVALID_QUERY`; geocoder down → `503 GEOCODING_UNAVAILABLE` | pytest | FR-LOC-1 |
| CT-18 | `/me*` without a token, or with an expired or wrong-audience token → `401 UNAUTHENTICATED` + `WWW-Authenticate: Bearer` | pytest with Supabase running locally (Supabase CLI) | API-13 |
| CT-19 | **Isolation:** user A can't read, change or delete user B's places or history (every ID from B returns `404`) | pytest with two local test users | ACCT-1…9 |
| CT-20 | `POST /routes/plan` behaves identically with and without an `Authorization` header and writes nothing to the database | pytest | API-14, PRIV-1 |
| CT-21 | `DELETE /me` removes every row for the user; `GET /me/export` returns exactly what is stored; history over 200 entries or older than 90 days is pruned | pytest | ACCT-6, ACCT-8, ACCT-9 |

### 14.3 Already verified for this draft

| Check | Result |
|---|---|
| `contracts/openapi.yaml` passes `openapi-spec-validator` (OpenAPI 3.1) | Pass |
| All 16 embedded examples validate against their schemas (Draft 2020-12, with format checking) | Pass |
| The example plan responses satisfy the invariants in CT-6 | Pass |
| The schema rejects these requests: latitude 95.2, a naive datetime, empty modes, an unknown mode, duplicate modes, 4 waypoints, a 300-minute dwell, an unknown field, a 50 m walk limit, `optimize: CHEAPEST`, `max_itineraries: 9` | Pass |
| The section 11.2 TypeScript interfaces compile under `tsc --strict` (5.8), every example payload type-checks against them, and an unknown mode is rejected | Pass |

| **draft.2 (2026-11-16):** the spec with the `/me*` paths passes `openapi-spec-validator`; 42 example checks (old and new) validate; the four section 17 JSON examples are identical to the YAML ones | Pass |
| draft.2: the schema rejects an unknown mode tab, an empty place name, latitude 95, an empty place patch, a naive history time, 4 history waypoints, and a `password` field on `POST /me` | Pass |

These checks were run from a scratch environment. They aren't in CI yet: that is CT-1, CT-2 and CT-6.

---

## 15. Traceability to the PRD

| PRD requirement | Contract element |
|---|---|
| FR-MAP-1, MAP-2 | `service-info.service_area` (center, bbox, boundary) |
| FR-MAP-4, MAP-6 | `leg.geometry`, `leg.mode`, `itinerary.bbox` |
| FR-MAP-5 | `waypoint_visits[]` (numbered) vs `transfer_points[]` (system) |
| FR-MAP-8 | `data.sources[].attribution`, `places.*.attribution` |
| FR-LOC-1, LOC-4, LOC-5 | `/places/search`, `/places/reverse`, `OUTSIDE_SERVICE_AREA` |
| FR-MODE-1, -2, -3, -4, -7 | `modes`, `/transport/modes` `enabled`, `transit.submode`, `transit_submodes_excluded` |
| FR-TIME-1 to -5 | `time` omitted / `DEPART_AT` / `ARRIVE_BY`, `timezone`, `INVALID_TIME`, `TIME_OUTSIDE_SERVICE_WINDOW`, `DEPARTURE_IN_PAST` |
| FR-ROUTE-2, -3, -4, -5, -6 | section 4.3.1 selection, `labels`, `constraints`, `ONLY_WALKING_AVAILABLE`, `PARTIAL_RESULTS` |
| FR-WAY-1 to -8 | `waypoints[]`, `segments[]`, `waypoint_visits[]`, `no_route.failed_segment_index`, V7, V12, V17 |
| FR-RES-1, -2, -6, -7, -8 | itinerary summary fields, `labels`, `data.realtime` + `time_basis`, `cost: null`, metres for client conversion |
| FR-ITIN-1 to -5 | `legs[]`, `transit.{headsign, agency_name, intermediate_stops}`, `from.stop`/`to.stop`, `rental` |
| FR-XFER-1 to -5 | `transfer_points[]` (section 4.3.3), `TIGHT_TRANSFER`/`LONG_WAIT`, `transfers` |
| FR-ERR-2, API-4 | section 10 error catalogue, `NO_ROUTE` vs `ROUTING_UNAVAILABLE` vs `ROUTING_TIMEOUT` |
| FR-DATA-5, DQ-2 | `data.data_version`, `sources[].valid_until`, `DATA_NEAR_EXPIRY` |
| PD-1 | `cost` null, `features.cost_estimates`, `PriceBasis` |
| PRIV-1 | Stateless planning, no stored itineraries, no `GET /routes/{id}`; account data only under `/me` with export and delete (section 17) |
| ACCT-1 to ACCT-11 | section 17: `/me`, `/me/preferences`, `/me/places`, `/me/history`, `/me/export`, `features.accounts` |

---

## 16. Settled details

| Topic | What we do |
|---|---|
| Own bike vs. shared bike | Separate `BIKE` and `BIKE_SHARE` modes replace the old `has_bike` flag |
| "No route found" | `200` with `outcome: "NO_ROUTE"`, not an error status |
| Transit details OpenTripPlanner can't provide | The schema stays the same; missing fields are filled from the GTFS stop table |
| Why there is no route | `NO_PATH_FOUND` unless the engine can tell us more |
| Stopovers at launch | 1 in v1.0, up to 3 in v1.1; `service-info.limits.max_waypoints` holds the live value |
| Transit sub-mode mapping | The data owner writes the table from GTFS route types in M0 |
| Name of `/service-info` | Kept as one endpoint |
| GeoJSON geometry | Not in the MVP (can be added later without breaking clients) |
| Rate limits | Set at the proxy after load testing |
| History limits | 90 days and 200 entries |
| What history records | Only routes the user opens or starts, never plain searches |
| Mobile sign-in | Same Supabase project and endpoints as the web app |

---

## 17. Accounts: `/api/v1/me` (optional sign-in)

**Status: decided, not implemented yet.** Team decision PRD PD-9 (2026-11-16). Architecture: [architecture.md](architecture.md) section 16. Screens: [user-flows.md](user-flows.md) sections 3.7, 3.8, 8.

### 17.1 How sign-in fits

1. **Sign-up, log-in, "Continue with Google" and password reset run in Supabase Auth** through the Supabase client library (`supabase-js`) in the app. Our API has **no** sign-up, log-in or password endpoints.
2. After signing in, the app holds a **Supabase sign-in token** (a JWT, short-lived and refreshed automatically by the library). It sends `Authorization: Bearer <token>` on `/api/v1/me*` calls only.
3. On the first sign-in, the app calls `POST /api/v1/me` to create our account record. It sends the guest's device preferences so nothing is lost.
4. **Logging out** happens in the library (`signOut()`). The API has nothing to do, because there are no server sessions.
5. `GET /service-info` → `features.accounts` tells the app whether to show sign-in at all, so accounts can be switched off without a client release.

### 17.2 Endpoints

All responses use `Cache-Control: no-store`. Every `/me*` operation can also return `401 UNAUTHENTICATED`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR` and `503 ACCOUNT_SERVICE_UNAVAILABLE`.

| Operation | Request body | Success | Other errors |
|---|---|---|---|
| `GET /me` | — | `200 Account` | `404 ACCOUNT_NOT_FOUND` |
| `POST /me` | `AccountCreateRequest` (all fields optional) | `201 Account` when created; `200 Account` if it already exists (idempotent; body ignored) | `422 VALIDATION_ERROR` |
| `PATCH /me` | `AccountPatch` (`display_name`) | `200 Account` | `404`, `422` |
| `DELETE /me` | — | `204`. Deletes the Supabase Auth user and all of their data | `404` |
| `GET /me/export` | — | `200 AccountExport` (JSON download) | `404` |
| `PUT /me/preferences` | `Preferences` (full replace) | `200 Preferences` | `404`, `422` |
| `GET /me/places` | — | `200 SavedPlaceList` | `404` |
| `POST /me/places` | `SavedPlaceInput` | `201 SavedPlace`. A new `HOME` or `WORK` replaces the existing one | `404`, `409 SAVED_PLACE_LIMIT`, `422 OUTSIDE_SERVICE_AREA` / `VALIDATION_ERROR` |
| `PATCH /me/places/{place_id}` | `SavedPlacePatch` (at least one field) | `200 SavedPlace` | `404 NOT_FOUND`, `422` |
| `DELETE /me/places/{place_id}` | — | `204` | `404 NOT_FOUND` |
| `GET /me/history?limit=20&cursor=…` | — | `200 HistoryPage` (newest first; `limit` 1–50, default 20) | `404`, `422` (bad cursor) |
| `POST /me/history` | `HistoryEntryInput` | `201 HistoryEntry`. The same trip within 30 minutes returns `200` with the updated existing entry | `404`, `409 HISTORY_DISABLED`, `422` |
| `DELETE /me/history` | — | `204` (clear all) | `404` |
| `DELETE /me/history/{entry_id}` | — | `204` | `404 NOT_FOUND` |

### 17.3 Schemas and examples

**`Account`** (`GET /me`):

```json
{
  "id": "7b2f4c1e-8a3d-4e6f-9b10-2c5d7e8f9a01",
  "email": "alex@uw.edu",
  "display_name": "Alex Kim",
  "sign_in_methods": ["PASSWORD"],
  "created_at": "2026-11-20T09:12:00-08:00",
  "preferences": {
    "default_mode_tab": "BEST",
    "transit_submodes_excluded": ["FERRY"],
    "distance_units": "IMPERIAL",
    "stop_alert_enabled": true,
    "history_enabled": true
  },
  "saved_place_count": 3,
  "history_count": 12
}
```

- `email` and `sign_in_methods` come from the verified token; we don't store the email.
- `sign_in_methods` values: `PASSWORD`, `GOOGLE` (response enum; may grow).
- `Preferences.default_mode_tab` (`ModeTab`): `BEST`, `TRANSIT`, `BIKE_TRANSIT`, `BIKE`, `WALK`. These are the results tabs (user-flows section 4). The plan API itself still takes `modes`.
- `distance_units`: `IMPERIAL` (default, PD-11) or `METRIC`.

**`AccountCreateRequest`** (`POST /me`): `{"display_name": "Alex Kim", "preferences": { …Preferences… }}`. Both fields are optional; missing preferences take the defaults in architecture section 16.4.

**`SavedPlaceList`** (`GET /me/places`):

```json
{
  "places": [
    {
      "id": "c4e1a9b2-5d3f-4a7e-8b6c-1f2e3d4c5b6a",
      "kind": "HOME",
      "name": "Home",
      "address": "4518 Fremont Ave N, Seattle",
      "location": {"lat": 47.66141, "lon": -122.35012},
      "created_at": "2026-11-20T09:15:00-08:00",
      "updated_at": "2026-11-20T09:15:00-08:00"
    },
    {
      "id": "e6a3c1d4-7f5b-4c9a-8d8e-3b4a5f6e7d8c",
      "kind": "OTHER",
      "name": "Cal Anderson Park",
      "address": "1635 11th Ave, Seattle",
      "location": {"lat": 47.61702, "lon": -122.3195},
      "created_at": "2026-11-21T18:02:00-08:00",
      "updated_at": "2026-11-21T18:02:00-08:00"
    }
  ]
}
```

`SavedPlaceInput`: `kind` (`HOME`, `WORK`, `OTHER`), `name` (1–100 characters), `address` (nullable, ≤ 200), `location`. The location must be inside the service area.

**`HistoryEntryInput`** (`POST /me/history`). It reuses the plan request's `LocationInput`, `WaypointInput` and `TimeSpec`. `time: null` means "leave now".

```json
{
  "origin": {"lat": 47.65135, "lon": -122.35012, "name": "Fremont"},
  "destination": {"lat": 47.61702, "lon": -122.3195, "name": "Cal Anderson Park"},
  "waypoints": [],
  "mode_tab": "BEST",
  "time": null,
  "summary": {
    "duration_seconds": 1440,
    "departure_time": "2026-11-20T08:31:00-08:00",
    "arrival_time": "2026-11-20T08:55:00-08:00",
    "transfers": 1,
    "walking_distance_meters": 480,
    "legs": [
      {"mode": "WALK", "submode": null, "route_short_name": null},
      {"mode": "TRANSIT", "submode": "BUS", "route_short_name": "44"},
      {"mode": "TRANSIT", "submode": "LIGHT_RAIL", "route_short_name": "1 Line"},
      {"mode": "WALK", "submode": null, "route_short_name": null}
    ]
  }
}
```

**`HistoryEntry`** is the same object plus `id` and `created_at`. **`HistoryPage`** is `{"entries": [HistoryEntry…], "next_cursor": "opaque" | null}`.

**`AccountExport`** (`GET /me/export`): `{"exported_at", "account": Account, "places": [SavedPlace…], "history": [HistoryEntry…]}`.

### 17.4 Rules

1. **Scoping.** Every query is limited to the token's user. IDs belonging to someone else return `404 NOT_FOUND`, never `403`, so the API doesn't reveal that they exist.
2. **History is written only by `POST /me/history`**. The client sends it when the user opens Route details or taps Start, and only while `history_enabled` is true. "Same trip" for the 30-minute merge means the same origin, destination, waypoints and `mode_tab`.
3. **Limits:**
   - 50 saved places;
   - 200 history entries (the oldest is pruned on insert);
   - entries older than 90 days are deleted nightly;
   - `display_name` ≤ 60 characters.
4. **Replanning** a history entry or saved place is a normal, anonymous `POST /routes/plan` with the current time.
5. **`DELETE /me`** is final: the Supabase Auth user is deleted, which removes all of their rows. The client signs out afterwards.
6. **Timestamps** in responses use the service timezone with an offset (section 2.4).

### 17.5 Error example: expired token

```json
{
  "type": "urn:mmr:problem:unauthenticated",
  "title": "Unauthenticated",
  "status": 401,
  "detail": "The sign-in token has expired. Refresh it and try again.",
  "instance": "/api/v1/me",
  "code": "UNAUTHENTICATED",
  "request_id": "3e7a9c15-4b2d-4f86-a1c0-5d8e2b7f4a39",
  "retryable": false,
  "errors": [],
  "details": {"reason": "TOKEN_EXPIRED"}
}
```

`details.reason` values: `MISSING_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `WRONG_AUDIENCE`.

### 17.6 Schema sketches

```python
class ModeTab(StrEnum):
    BEST = "BEST"; TRANSIT = "TRANSIT"; BIKE_TRANSIT = "BIKE_TRANSIT"; BIKE = "BIKE"; WALK = "WALK"

class DistanceUnits(StrEnum):
    IMPERIAL = "IMPERIAL"; METRIC = "METRIC"

class SavedPlaceKind(StrEnum):
    HOME = "HOME"; WORK = "WORK"; OTHER = "OTHER"

class Preferences(Strict):
    default_mode_tab: ModeTab = ModeTab.BEST
    transit_submodes_excluded: Annotated[list[TransitSubmode], Field(max_length=6)] = []
    distance_units: DistanceUnits = DistanceUnits.IMPERIAL
    stop_alert_enabled: bool = True
    history_enabled: bool = True

class SavedPlaceInput(Strict):
    kind: SavedPlaceKind
    name: Annotated[str, Field(min_length=1, max_length=100)]
    address: Annotated[str, Field(max_length=200)] | None = None
    location: Coordinate

class HistoryLegSummary(Strict):
    mode: Mode
    submode: TransitSubmode | None = None
    route_short_name: Annotated[str, Field(max_length=20)] | None = None

class HistorySummary(Strict):
    duration_seconds: NonNegInt
    departure_time: AwareDatetime
    arrival_time: AwareDatetime
    transfers: NonNegInt
    walking_distance_meters: NonNegInt
    legs: Annotated[list[HistoryLegSummary], Field(min_length=1, max_length=20)]

class HistoryEntryInput(Strict):
    origin: LocationInput
    destination: LocationInput
    waypoints: Annotated[list[WaypointInput], Field(max_length=3)] = []
    mode_tab: ModeTab
    time: TimeSpec | None = None
    summary: HistorySummary
```

```typescript
export type ModeTab = "BEST" | "TRANSIT" | "BIKE_TRANSIT" | "BIKE" | "WALK";
export type SignInMethod = "PASSWORD" | "GOOGLE";
export interface Preferences {
  default_mode_tab: ModeTab; transit_submodes_excluded: TransitSubmode[];
  distance_units: "IMPERIAL" | "METRIC"; stop_alert_enabled: boolean; history_enabled: boolean;
}
export interface Account {
  id: string; email: string | null; display_name: string | null; sign_in_methods: SignInMethod[];
  created_at: string; preferences: Preferences; saved_place_count: number; history_count: number;
}
export interface SavedPlace {
  id: string; kind: "HOME" | "WORK" | "OTHER"; name: string; address: string | null;
  location: Coordinate; created_at: string; updated_at: string;
}
export interface HistoryEntry {
  id: string; created_at: string; origin: LocationInput; destination: LocationInput;
  waypoints: WaypointInput[]; mode_tab: ModeTab; time: TimeSpec | null;
  summary: { duration_seconds: number; departure_time: string; arrival_time: string; transfers: number;
             walking_distance_meters: number;
             legs: { mode: Mode; submode: TransitSubmode | null; route_short_name: string | null }[] };
}
export interface HistoryPage { entries: HistoryEntry[]; next_cursor: string | null }
```

### 17.7 How the apps use it

| Step | Behaviour |
|---|---|
| Startup | If `features.accounts` is false, hide every sign-in entry point. If the Supabase client library reports a signed-in user, call `GET /me`; on `404`, call `POST /me` |
| Token | `PlannerClient` attaches the token **only** to `/me*` calls. Plan, places and service-info calls never carry it |
| `401` | Force-refresh the token once (`getIdToken(true)`) and retry. If it fails again, sign out locally and show "Please log in again" |
| `503 ACCOUNT_SERVICE_UNAVAILABLE` | Show saved data from the local cache, read-only, with a banner. Planning carries on |
| Preferences | Changed in Settings → `PUT /me/preferences` (debounced). Guests keep them in `localStorage` |
| History | After the user opens Route details or taps Start: `POST /me/history` if `history_enabled`. Home and Search show the 3 most recent entries; the History screen pages with `cursor` |
