# Multimodal Router: MVP API Endpoints (interface specification)

| | |
|---|---|
| **Status** | **Decided** API v1 (contract `1.0.0-draft.2`). Not implemented yet: today's prototype serves `POST /v1/plan`, `GET /v1/geocode`, `GET /v1/reverse`, `GET /v1/city` and `GET /health`, which move to the paths below |
| **Source** | Generated from [contracts/openapi.yaml](../contracts/openapi.yaml). Full rules, semantics and examples: [api-contract.md](api-contract.md) |
| **Base URL** | Same origin as the web app; every path starts with `/api/v1` |

## Endpoint summary

| # | Method | Endpoint | Purpose | MVP priority |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/routes/plan` | Generate candidate multimodal itineraries | Must |
| 2 | `GET` | `/api/v1/places/search` | Search addresses and places inside the service area | Must |
| 3 | `GET` | `/api/v1/places/reverse` | Name the place at a coordinate (for map-picked points) | Should |
| 4 | `GET` | `/api/v1/transport/modes` | List transportation modes and whether each is enabled in this deployment | Must |
| 5 | `GET` | `/api/v1/service-info` | Service area, timezone, limits, enabled features and data freshness | Should |
| 6 | `GET` | `/api/v1/health` | Basic service health | Must |

## Conventions (all endpoints)

- **Format:** JSON, UTF-8, `snake_case` field names. Request bodies are at most 16 KiB.
- **Coordinates:** `{"lat": …, "lon": …}` objects (WGS 84, decimal degrees). GeoJSON fields (`bbox`, `boundary`) use `[lon, lat]` order.
- **Units:** distances in metres (`_meters`), durations in seconds (`_seconds`), money in integer cents (`_minor`) plus a currency code. The app converts to miles and feet for display.
- **Times:** RFC 3339 with a UTC offset (for example `2026-11-20T08:30:00-08:00`). Request times without an offset are rejected. Responses use Seattle time.
- **Fields:** every response field is always present; `null` means "not applicable". Lists are never `null`.
- **Enums:** `UPPER_SNAKE_CASE`. Clients must ignore unknown response fields and handle unknown enum values.
- **Headers:** every response has `X-Request-ID`. `429` and `503` responses include `Retry-After` (seconds).
- **Errors:** every 4xx/5xx response uses the Problem Details body below. Clients switch on `code`. (The `code` list also contains codes reserved for the post-MVP account endpoints.)
- **Schemas** below are JSON Schema (draft 2020-12). Nested object types are listed under `$defs`.

### Common error response (Problem Details, RFC 9457)

Content type `application/problem+json`. Used by every 4xx and 5xx status code below.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Problem",
  "type": "object",
  "required": ["type", "title", "status", "detail", "code", "request_id", "retryable", "errors", "details"],
  "properties": {
    "type": {"type": "string", "format": "uri-reference"},
    "title": {"type": "string"},
    "status": {"type": "integer", "minimum": 400, "maximum": 599},
    "detail": {"type": "string"},
    "instance": {"type": "string"},
    "code": {
      "type": "string",
      "enum": ["VALIDATION_ERROR", "INVALID_COORDINATES", "OUTSIDE_SERVICE_AREA", "ORIGIN_EQUALS_DESTINATION", "WAYPOINT_TOO_CLOSE", "TOO_MANY_WAYPOINTS", "UNSUPPORTED_MODE", "UNSUPPORTED_OPTIMIZATION", "INVALID_TIME", "TIME_OUTSIDE_SERVICE_WINDOW", "ARRIVE_BY_WITH_WAYPOINTS", "INVALID_QUERY", "ROUTING_UNAVAILABLE", "GEOCODING_UNAVAILABLE", "ROUTING_TIMEOUT", "RATE_LIMITED", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "NOT_FOUND", "METHOD_NOT_ALLOWED", "INTERNAL_ERROR", "UNAUTHENTICATED", "ACCOUNT_NOT_FOUND", "SAVED_PLACE_LIMIT", "HISTORY_DISABLED", "ACCOUNT_SERVICE_UNAVAILABLE"]
    },
    "request_id": {"type": "string"},
    "retryable": {"type": "boolean"},
    "errors": {"type": "array", "items": {"$ref": "#/$defs/FieldError"}},
    "details": {"type": ["object", "null"]}
  },
  "$defs": {
    "FieldError": {
      "type": "object",
      "additionalProperties": false,
      "required": ["pointer", "code", "message"],
      "properties": {
        "pointer": {"type": "string"},
        "code": {
          "type": "string",
          "enum": ["VALIDATION_ERROR", "INVALID_COORDINATES", "OUTSIDE_SERVICE_AREA", "ORIGIN_EQUALS_DESTINATION", "WAYPOINT_TOO_CLOSE", "TOO_MANY_WAYPOINTS", "UNSUPPORTED_MODE", "UNSUPPORTED_OPTIMIZATION", "INVALID_TIME", "TIME_OUTSIDE_SERVICE_WINDOW", "ARRIVE_BY_WITH_WAYPOINTS", "INVALID_QUERY", "ROUTING_UNAVAILABLE", "GEOCODING_UNAVAILABLE", "ROUTING_TIMEOUT", "RATE_LIMITED", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "NOT_FOUND", "METHOD_NOT_ALLOWED", "INTERNAL_ERROR", "UNAUTHENTICATED", "ACCOUNT_NOT_FOUND", "SAVED_PLACE_LIMIT", "HISTORY_DISABLED", "ACCOUNT_SERVICE_UNAVAILABLE"]
        },
        "message": {"type": "string"}
      }
    }
  }
}
```

---

## 1. Plan a trip

**Endpoint:** `/api/v1/routes/plan`

**Method:** `POST`

**Description:** Generate and return up to 5 distinct candidate itineraries for a journey: origin, destination, up to 3 ordered stopovers (each with an optional stay), the permitted modes, an optional time (leave now, depart at, or arrive by) and optional limits. Each itinerary includes its legs (with transit route, headsign and intermediate stops), segments between stopovers, system-generated transfer points, labels (Fastest, Fewest transfers, Least walking) and warnings. Times are scheduled, in Seattle time. `cost` is always `null` in the MVP (prices are hidden, PRD PD-1).

**Request** (JSON body, `Content-Type: application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlanRequest",
  "type": "object",
  "additionalProperties": false,
  "required": ["origin", "destination", "modes"],
  "properties": {
    "origin": {"$ref": "#/$defs/LocationInput"},
    "destination": {"$ref": "#/$defs/LocationInput"},
    "waypoints": {"type": "array", "maxItems": 3, "default": [], "items": {"$ref": "#/$defs/WaypointInput"}},
    "modes": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
      }
    },
    "transit_submodes_excluded": {
      "type": "array",
      "uniqueItems": true,
      "default": [],
      "items": {
        "type": "string",
        "enum": ["BUS", "LIGHT_RAIL", "STREETCAR", "COMMUTER_RAIL", "FERRY", "MONORAIL", "OTHER"]
      }
    },
    "time": {"anyOf": [{"$ref": "#/$defs/TimeSpec"}, {"type": "null"}]},
    "optimize": {"type": "string", "enum": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"]},
    "constraints": {"anyOf": [{"$ref": "#/$defs/PlanConstraints"}, {"type": "null"}]},
    "max_itineraries": {"type": "integer", "minimum": 1, "maximum": 5, "default": 5}
  },
  "$defs": {
    "DateTimeWithOffset": {
      "type": "string",
      "format": "date-time",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$"
    },
    "LocationInput": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180},
        "name": {"type": ["string", "null"], "maxLength": 200}
      }
    },
    "PlanConstraints": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "max_walk_distance_meters": {"type": "integer", "minimum": 100, "maximum": 10000, "default": 2000},
        "max_walk_duration_minutes": {"type": ["integer", "null"], "minimum": 1, "maximum": 120},
        "max_transfers": {"type": "integer", "minimum": 0, "maximum": 5, "default": 3}
      }
    },
    "TimeSpec": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "datetime"],
      "properties": {
        "type": {"type": "string", "enum": ["DEPART_AT", "ARRIVE_BY"]},
        "datetime": {"$ref": "#/$defs/DateTimeWithOffset"}
      }
    },
    "WaypointInput": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180},
        "name": {"type": ["string", "null"], "maxLength": 200},
        "dwell_minutes": {"type": "integer", "minimum": 0, "maximum": 240, "default": 0}
      }
    }
  }
}
```

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlanResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["request_id", "generated_at", "outcome", "timezone", "query", "itineraries", "no_route", "warnings", "data"],
  "properties": {
    "request_id": {"type": "string", "format": "uuid"},
    "generated_at": {"$ref": "#/$defs/DateTimeWithOffset"},
    "outcome": {"type": "string", "enum": ["OK", "NO_ROUTE"]},
    "timezone": {"type": "string"},
    "query": {"$ref": "#/$defs/ResolvedQuery"},
    "itineraries": {"type": "array", "maxItems": 5, "items": {"$ref": "#/$defs/Itinerary"}},
    "no_route": {"anyOf": [{"$ref": "#/$defs/NoRoute"}, {"type": "null"}]},
    "warnings": {"type": "array", "items": {"$ref": "#/$defs/Warning"}},
    "data": {"$ref": "#/$defs/DataProvenance"}
  },
  "$defs": {
    "Coordinate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180}
      }
    },
    "CostEstimate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["amount_minor", "currency", "basis", "is_estimate", "low_minor", "high_minor", "note"],
      "properties": {
        "amount_minor": {"type": "integer", "minimum": 0},
        "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
        "basis": {
          "type": "string",
          "enum": ["CONFIRMED", "NO_CHARGE", "PUBLISHED_FARE", "ESTIMATED", "PLACEHOLDER"]
        },
        "is_estimate": {"type": "boolean"},
        "low_minor": {"type": ["integer", "null"], "minimum": 0},
        "high_minor": {"type": ["integer", "null"], "minimum": 0},
        "note": {"type": ["string", "null"]}
      }
    },
    "DataProvenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["data_version", "routing_engine", "realtime", "sources"],
      "properties": {
        "data_version": {"type": "string"},
        "routing_engine": {"$ref": "#/$defs/RoutingEngine"},
        "realtime": {"type": "boolean"},
        "sources": {"type": "array", "items": {"$ref": "#/$defs/DataSource"}}
      }
    },
    "DataSource": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "name", "retrieved_at", "valid_from", "valid_until", "last_updated", "status", "attribution"],
      "properties": {
        "type": {"type": "string", "enum": ["GTFS", "OSM", "GBFS", "GTFS_RT"]},
        "name": {"type": "string"},
        "retrieved_at": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]},
        "valid_from": {"type": ["string", "null"], "format": "date"},
        "valid_until": {"type": ["string", "null"], "format": "date"},
        "last_updated": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]},
        "status": {"type": "string", "enum": ["OK", "STALE", "UNAVAILABLE"]},
        "attribution": {"type": ["string", "null"]}
      }
    },
    "DateTimeWithOffset": {
      "type": "string",
      "format": "date-time",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$"
    },
    "EncodedPolyline": {
      "type": "object",
      "additionalProperties": false,
      "required": ["format", "precision", "value"],
      "properties": {
        "format": {"type": "string", "enum": ["ENCODED_POLYLINE"]},
        "precision": {"type": "integer", "enum": [5]},
        "value": {"type": "string"}
      }
    },
    "Itinerary": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "labels", "departure_time", "arrival_time", "duration_seconds", "walking_seconds", "waiting_seconds", "dwell_seconds", "distance_meters", "walking_distance_meters", "transfers", "mode_sequence", "cost", "bbox", "legs", "segments", "transfer_points", "waypoint_visits", "warnings"],
      "properties": {
        "id": {"type": "string", "pattern": "^[A-Za-z0-9_-]{1,64}$"},
        "labels": {
          "type": "array",
          "uniqueItems": true,
          "items": {"type": "string", "enum": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"]}
        },
        "departure_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "arrival_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "duration_seconds": {"type": "integer", "minimum": 0},
        "walking_seconds": {"type": "integer", "minimum": 0},
        "waiting_seconds": {"type": "integer", "minimum": 0},
        "dwell_seconds": {"type": "integer", "minimum": 0},
        "distance_meters": {"type": "number", "minimum": 0},
        "walking_distance_meters": {"type": "number", "minimum": 0},
        "transfers": {"type": "integer", "minimum": 0},
        "mode_sequence": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
          }
        },
        "cost": {"anyOf": [{"$ref": "#/$defs/CostEstimate"}, {"type": "null"}]},
        "bbox": {"type": "array", "minItems": 4, "maxItems": 4, "items": {"type": "number"}},
        "legs": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/Leg"}},
        "segments": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/Segment"}},
        "transfer_points": {"type": "array", "items": {"$ref": "#/$defs/TransferPoint"}},
        "waypoint_visits": {"type": "array", "items": {"$ref": "#/$defs/WaypointVisit"}},
        "warnings": {"type": "array", "items": {"$ref": "#/$defs/Warning"}}
      }
    },
    "Leg": {
      "type": "object",
      "additionalProperties": false,
      "required": ["index", "mode", "from", "to", "departure_time", "arrival_time", "duration_seconds", "distance_meters", "geometry", "time_basis", "transit", "rental", "cost"],
      "properties": {
        "index": {"type": "integer", "minimum": 0},
        "mode": {
          "type": "string",
          "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
        },
        "from": {"$ref": "#/$defs/Place"},
        "to": {"$ref": "#/$defs/Place"},
        "departure_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "arrival_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "duration_seconds": {"type": "integer", "minimum": 0},
        "distance_meters": {"type": "number", "minimum": 0},
        "geometry": {"$ref": "#/$defs/EncodedPolyline"},
        "time_basis": {"type": "string", "enum": ["SCHEDULED", "ESTIMATED", "REALTIME"]},
        "transit": {"anyOf": [{"$ref": "#/$defs/TransitDetails"}, {"type": "null"}]},
        "rental": {"anyOf": [{"$ref": "#/$defs/RentalDetails"}, {"type": "null"}]},
        "cost": {"anyOf": [{"$ref": "#/$defs/CostEstimate"}, {"type": "null"}]}
      }
    },
    "NoRoute": {
      "type": "object",
      "additionalProperties": false,
      "required": ["reason", "failed_segment_index", "message", "suggestions"],
      "properties": {
        "reason": {
          "type": "string",
          "enum": ["NO_PATH_FOUND", "ALL_EXCLUDED_BY_CONSTRAINTS", "OUTSIDE_SERVICE_HOURS"]
        },
        "failed_segment_index": {"type": ["integer", "null"], "minimum": 0},
        "message": {"type": "string"},
        "suggestions": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["CHANGE_TIME", "ALLOW_MORE_MODES", "RELAX_CONSTRAINTS", "MOVE_OR_REMOVE_WAYPOINT"]
          }
        }
      }
    },
    "Place": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "location", "stop"],
      "properties": {
        "name": {"type": "string"},
        "location": {"$ref": "#/$defs/Coordinate"},
        "stop": {"anyOf": [{"$ref": "#/$defs/StopRef"}, {"type": "null"}]}
      }
    },
    "RentalDetails": {
      "type": "object",
      "additionalProperties": false,
      "required": ["provider_name", "vehicle_type"],
      "properties": {
        "provider_name": {"type": ["string", "null"]},
        "vehicle_type": {"type": ["string", "null"], "enum": ["BIKE", "E_BIKE", "SCOOTER", null]}
      }
    },
    "ResolvedConstraints": {
      "type": "object",
      "additionalProperties": false,
      "required": ["max_walk_distance_meters", "max_walk_duration_minutes", "max_transfers"],
      "properties": {
        "max_walk_distance_meters": {"type": "integer"},
        "max_walk_duration_minutes": {"type": ["integer", "null"]},
        "max_transfers": {"type": "integer"}
      }
    },
    "ResolvedQuery": {
      "type": "object",
      "additionalProperties": false,
      "required": ["time", "modes", "transit_submodes_excluded", "optimize", "constraints", "max_itineraries", "waypoint_count"],
      "properties": {
        "time": {"$ref": "#/$defs/TimeSpec"},
        "modes": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
          }
        },
        "transit_submodes_excluded": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["BUS", "LIGHT_RAIL", "STREETCAR", "COMMUTER_RAIL", "FERRY", "MONORAIL", "OTHER"]
          }
        },
        "optimize": {"type": "string", "enum": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"]},
        "constraints": {"$ref": "#/$defs/ResolvedConstraints"},
        "max_itineraries": {"type": "integer"},
        "waypoint_count": {"type": "integer", "minimum": 0}
      }
    },
    "RoutingEngine": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version"],
      "properties": {"name": {"type": "string"}, "version": {"type": ["string", "null"]}}
    },
    "Segment": {
      "type": "object",
      "additionalProperties": false,
      "required": ["index", "from", "to", "leg_start", "leg_end"],
      "properties": {
        "index": {"type": "integer", "minimum": 0},
        "from": {"$ref": "#/$defs/SegmentEndpoint"},
        "to": {"$ref": "#/$defs/SegmentEndpoint"},
        "leg_start": {"type": "integer", "minimum": 0},
        "leg_end": {"type": "integer", "minimum": 0}
      }
    },
    "SegmentEndpoint": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "waypoint_index"],
      "properties": {
        "kind": {"type": "string", "enum": ["ORIGIN", "WAYPOINT", "DESTINATION"]},
        "waypoint_index": {"type": ["integer", "null"], "minimum": 0}
      }
    },
    "StopCall": {
      "type": "object",
      "additionalProperties": false,
      "required": ["stop", "location", "arrival_time", "departure_time"],
      "properties": {
        "stop": {"$ref": "#/$defs/StopRef"},
        "location": {"$ref": "#/$defs/Coordinate"},
        "arrival_time": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]},
        "departure_time": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]}
      }
    },
    "StopRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "code", "name"],
      "properties": {
        "id": {"type": "string"},
        "code": {"type": ["string", "null"]},
        "name": {"type": "string"}
      }
    },
    "TimeSpec": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "datetime"],
      "properties": {
        "type": {"type": "string", "enum": ["DEPART_AT", "ARRIVE_BY"]},
        "datetime": {"$ref": "#/$defs/DateTimeWithOffset"}
      }
    },
    "TransferPoint": {
      "type": "object",
      "additionalProperties": false,
      "required": ["index", "kind", "place", "from_place", "incoming_leg_index", "outgoing_leg_index", "walk_distance_meters", "walk_duration_seconds", "wait_duration_seconds", "counts_as_transfer"],
      "properties": {
        "index": {"type": "integer", "minimum": 0},
        "kind": {
          "type": "string",
          "enum": ["BOARD", "ALIGHT", "TRANSIT_TRANSFER", "BIKE_PARK", "VEHICLE_PICKUP", "VEHICLE_DROPOFF", "PARK_AND_RIDE"]
        },
        "place": {"$ref": "#/$defs/Place"},
        "from_place": {"anyOf": [{"$ref": "#/$defs/Place"}, {"type": "null"}]},
        "incoming_leg_index": {"type": ["integer", "null"], "minimum": 0},
        "outgoing_leg_index": {"type": ["integer", "null"], "minimum": 0},
        "walk_distance_meters": {"type": "number", "minimum": 0},
        "walk_duration_seconds": {"type": "integer", "minimum": 0},
        "wait_duration_seconds": {"type": ["integer", "null"], "minimum": 0},
        "counts_as_transfer": {"type": "boolean"}
      }
    },
    "TransitDetails": {
      "type": "object",
      "additionalProperties": false,
      "required": ["submode", "route_id", "route_short_name", "route_long_name", "agency_name", "headsign", "intermediate_stops"],
      "properties": {
        "submode": {
          "type": "string",
          "enum": ["BUS", "LIGHT_RAIL", "STREETCAR", "COMMUTER_RAIL", "FERRY", "MONORAIL", "OTHER"]
        },
        "route_id": {"type": "string"},
        "route_short_name": {"type": ["string", "null"]},
        "route_long_name": {"type": ["string", "null"]},
        "agency_name": {"type": "string"},
        "headsign": {"type": ["string", "null"]},
        "intermediate_stops": {"type": "array", "items": {"$ref": "#/$defs/StopCall"}}
      }
    },
    "Warning": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "severity", "message", "leg_index", "transfer_index", "details"],
      "properties": {
        "code": {
          "type": "string",
          "enum": ["PARTIAL_RESULTS", "DEPARTURE_IN_PAST", "ONLY_WALKING_AVAILABLE", "RESULTS_LIMITED_BY_CONSTRAINTS", "SHARED_MOBILITY_UNAVAILABLE", "LOCATION_SNAPPED", "TIGHT_TRANSFER", "LONG_WAIT", "LONG_TRIP", "GEOMETRY_APPROXIMATE", "DATA_NEAR_EXPIRY", "DEVELOPMENT_ROUTER", "COST_INCOMPLETE"]
        },
        "severity": {"type": "string", "enum": ["INFO", "WARNING"]},
        "message": {"type": "string"},
        "leg_index": {"type": ["integer", "null"], "minimum": 0},
        "transfer_index": {"type": ["integer", "null"], "minimum": 0},
        "details": {"type": ["object", "null"]}
      }
    },
    "WaypointVisit": {
      "type": "object",
      "additionalProperties": false,
      "required": ["waypoint_index", "place", "arrival_time", "departure_time", "dwell_seconds"],
      "properties": {
        "waypoint_index": {"type": "integer", "minimum": 0},
        "place": {"$ref": "#/$defs/Place"},
        "arrival_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "departure_time": {"$ref": "#/$defs/DateTimeWithOffset"},
        "dwell_seconds": {"type": "integer", "minimum": 0}
      }
    }
  }
}
```

**Status Codes:**

- **200**: OK. Planning finished. `outcome` is `OK` (1–5 itineraries), or `NO_ROUTE` when the request is valid but no route exists (`itineraries` is empty and `no_route` gives the reason, the failing segment and suggestions).
- **413**: Payload Too Large. The body is over 16 KiB (`PAYLOAD_TOO_LARGE`).
- **415**: Unsupported Media Type. The body is not `application/json` (`UNSUPPORTED_MEDIA_TYPE`).
- **422**: Unprocessable Content. The request is invalid; `errors[]` points at each bad field. `code` is one of `VALIDATION_ERROR`, `INVALID_COORDINATES`, `OUTSIDE_SERVICE_AREA`, `ORIGIN_EQUALS_DESTINATION`, `WAYPOINT_TOO_CLOSE`, `TOO_MANY_WAYPOINTS`, `UNSUPPORTED_MODE`, `UNSUPPORTED_OPTIMIZATION`, `INVALID_TIME`, `TIME_OUTSIDE_SERVICE_WINDOW`, `ARRIVE_BY_WITH_WAYPOINTS`.
- **429**: Too Many Requests. Rate limit exceeded (`RATE_LIMITED`); retry after `Retry-After` seconds.
- **500**: Internal Server Error. Unexpected failure (`INTERNAL_ERROR`); quote `request_id` when reporting it.
- **503**: Service Unavailable. The routing engine is unreachable or starting up (`ROUTING_UNAVAILABLE`); retry after `Retry-After` seconds. An outage is never returned as an empty route list.
- **504**: Gateway Timeout. The 30-second planning deadline passed with no complete itinerary (`ROUTING_TIMEOUT`).

_Error body: Problem Details (see “Common error response”)._

---

## 2. Search places

**Endpoint:** `/api/v1/places/search`

**Method:** `GET`

**Description:** Search addresses, points of interest and transit stops by text, for the From, To and stopover fields. The server calls the geocoder, removes results outside the service area (King County) and caches results. An optional `lat`/`lon` biases results towards the map centre.

**Request** (query-string parameters, shown as a JSON object):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlaceSearchQuery",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "q": {"type": "string", "minLength": 3, "maxLength": 200},
    "limit": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5},
    "lat": {"type": "number", "minimum": -90, "maximum": 90},
    "lon": {"type": "number", "minimum": -180, "maximum": 180}
  },
  "required": ["q"]
}
```

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlaceSearchResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["request_id", "results", "attribution"],
  "properties": {
    "request_id": {"type": "string", "format": "uuid"},
    "results": {"type": "array", "maxItems": 10, "items": {"$ref": "#/$defs/PlaceResult"}},
    "attribution": {"type": "string"}
  },
  "$defs": {
    "Coordinate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180}
      }
    },
    "PlaceResult": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "label", "location", "category"],
      "properties": {
        "name": {"type": "string"},
        "label": {"type": "string"},
        "location": {"$ref": "#/$defs/Coordinate"},
        "category": {"type": "string", "enum": ["ADDRESS", "POI", "TRANSIT_STOP", "OTHER"]}
      }
    }
  }
}
```

**Status Codes:**

- **200**: OK. Matching places inside the service area (the list may be empty).
- **422**: Unprocessable Content. `INVALID_QUERY` (`q` shorter than 3 or longer than 200 characters, or only one of `lat`/`lon` sent) or `VALIDATION_ERROR`.
- **429**: Too Many Requests. Rate limit exceeded (`RATE_LIMITED`); retry after `Retry-After` seconds.
- **500**: Internal Server Error. Unexpected failure (`INTERNAL_ERROR`).
- **503**: Service Unavailable. The geocoder is down (`GEOCODING_UNAVAILABLE`); the app suggests choosing the point on the map instead.

_Error body: Problem Details (see “Common error response”)._

---

## 3. Name a map point

**Endpoint:** `/api/v1/places/reverse`

**Method:** `GET`

**Description:** Return the best place name for a coordinate the user picked on the map, and whether that point is inside the service area.

**Request** (query-string parameters, shown as a JSON object):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlaceReverseQuery",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "lat": {"type": "number", "minimum": -90, "maximum": 90},
    "lon": {"type": "number", "minimum": -180, "maximum": 180}
  },
  "required": ["lat", "lon"]
}
```

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlaceReverseResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["request_id", "result", "in_service_area", "attribution"],
  "properties": {
    "request_id": {"type": "string", "format": "uuid"},
    "result": {"anyOf": [{"$ref": "#/$defs/PlaceResult"}, {"type": "null"}]},
    "in_service_area": {"type": "boolean"},
    "attribution": {"type": "string"}
  },
  "$defs": {
    "Coordinate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180}
      }
    },
    "PlaceResult": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "label", "location", "category"],
      "properties": {
        "name": {"type": "string"},
        "label": {"type": "string"},
        "location": {"$ref": "#/$defs/Coordinate"},
        "category": {"type": "string", "enum": ["ADDRESS", "POI", "TRANSIT_STOP", "OTHER"]}
      }
    }
  }
}
```

**Status Codes:**

- **200**: OK. The best match, or `result: null` if nothing suitable was found. `in_service_area` says whether the point can be used for planning.
- **422**: Unprocessable Content. `lat` or `lon` is missing or out of range (`INVALID_COORDINATES`).
- **429**: Too Many Requests. Rate limit exceeded (`RATE_LIMITED`); retry after `Retry-After` seconds.
- **500**: Internal Server Error. Unexpected failure (`INTERNAL_ERROR`).
- **503**: Service Unavailable. The geocoder is down (`GEOCODING_UNAVAILABLE`).

_Error body: Problem Details (see “Common error response”)._

---

## 4. List transportation modes

**Endpoint:** `/api/v1/transport/modes`

**Method:** `GET`

**Description:** List every transportation mode and transit sub-mode (bus, light rail, streetcar, ferry, …), with labels and whether each is enabled in this deployment. The app builds its mode tabs and transit filters from this instead of hard-coding them. Cacheable for 1 hour.

**Request:** none (no request body and no query parameters).

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ModesResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["modes", "defaults"],
  "properties": {
    "modes": {"type": "array", "items": {"$ref": "#/$defs/ModeInfo"}},
    "defaults": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
      }
    }
  },
  "$defs": {
    "ModeInfo": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label", "description", "enabled", "default_selected", "connector_only_when_unselected", "disabled_reason", "submodes"],
      "properties": {
        "id": {
          "type": "string",
          "enum": ["WALK", "TRANSIT", "BIKE", "BIKE_SHARE", "SCOOTER_SHARE", "CAR", "TAXI"]
        },
        "label": {"type": "string"},
        "description": {"type": "string"},
        "enabled": {"type": "boolean"},
        "default_selected": {"type": "boolean"},
        "connector_only_when_unselected": {"type": "boolean"},
        "disabled_reason": {"type": ["string", "null"]},
        "submodes": {"type": "array", "items": {"$ref": "#/$defs/TransitSubmodeInfo"}}
      }
    },
    "TransitSubmodeInfo": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label", "enabled"],
      "properties": {
        "id": {
          "type": "string",
          "enum": ["BUS", "LIGHT_RAIL", "STREETCAR", "COMMUTER_RAIL", "FERRY", "MONORAIL", "OTHER"]
        },
        "label": {"type": "string"},
        "enabled": {"type": "boolean"}
      }
    }
  }
}
```

**Status Codes:**

- **200**: OK. The mode catalogue (`Cache-Control: public, max-age=3600`).
- **500**: Internal Server Error. Unexpected failure (`INTERNAL_ERROR`).

_Error body: Problem Details (see “Common error response”)._

---

## 5. Get service information

**Endpoint:** `/api/v1/service-info`

**Method:** `GET`

**Description:** Return what the app needs to configure itself: the service-area boundary and centre, the timezone (America/Los_Angeles), limits (maximum stopovers, itineraries, walking), enabled features (cost display off, arrive-by, accounts) and data freshness with attributions. Called once at startup. Cacheable for 1 hour.

**Request:** none (no request body and no query parameters).

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ServiceInfoResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["api_version", "service_area", "limits", "features", "data"],
  "properties": {
    "api_version": {"type": "string"},
    "service_area": {"$ref": "#/$defs/ServiceArea"},
    "limits": {"$ref": "#/$defs/ServiceLimits"},
    "features": {"$ref": "#/$defs/ServiceFeatures"},
    "data": {"$ref": "#/$defs/DataProvenance"}
  },
  "$defs": {
    "Coordinate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["lat", "lon"],
      "properties": {
        "lat": {"type": "number", "minimum": -90, "maximum": 90},
        "lon": {"type": "number", "minimum": -180, "maximum": 180}
      }
    },
    "DataProvenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["data_version", "routing_engine", "realtime", "sources"],
      "properties": {
        "data_version": {"type": "string"},
        "routing_engine": {"$ref": "#/$defs/RoutingEngine"},
        "realtime": {"type": "boolean"},
        "sources": {"type": "array", "items": {"$ref": "#/$defs/DataSource"}}
      }
    },
    "DataSource": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "name", "retrieved_at", "valid_from", "valid_until", "last_updated", "status", "attribution"],
      "properties": {
        "type": {"type": "string", "enum": ["GTFS", "OSM", "GBFS", "GTFS_RT"]},
        "name": {"type": "string"},
        "retrieved_at": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]},
        "valid_from": {"type": ["string", "null"], "format": "date"},
        "valid_until": {"type": ["string", "null"], "format": "date"},
        "last_updated": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]},
        "status": {"type": "string", "enum": ["OK", "STALE", "UNAVAILABLE"]},
        "attribution": {"type": ["string", "null"]}
      }
    },
    "DateTimeWithOffset": {
      "type": "string",
      "format": "date-time",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$"
    },
    "DepartureWindow": {
      "type": "object",
      "additionalProperties": false,
      "required": ["earliest", "latest"],
      "properties": {
        "earliest": {"$ref": "#/$defs/DateTimeWithOffset"},
        "latest": {"$ref": "#/$defs/DateTimeWithOffset"}
      }
    },
    "GeoJSONArea": {
      "type": "object",
      "required": ["type", "coordinates"],
      "properties": {
        "type": {"type": "string", "enum": ["Polygon", "MultiPolygon"]},
        "coordinates": {"type": "array"}
      }
    },
    "IntRange": {
      "type": "object",
      "additionalProperties": false,
      "required": ["min", "max", "default"],
      "properties": {
        "min": {"type": "integer"},
        "max": {"type": "integer"},
        "default": {"type": ["integer", "null"]}
      }
    },
    "RoutingEngine": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version"],
      "properties": {"name": {"type": "string"}, "version": {"type": ["string", "null"]}}
    },
    "ServiceArea": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "timezone", "center", "bbox", "boundary"],
      "properties": {
        "name": {"type": "string"},
        "timezone": {"type": "string"},
        "center": {"$ref": "#/$defs/Coordinate"},
        "bbox": {"type": "array", "minItems": 4, "maxItems": 4, "items": {"type": "number"}},
        "boundary": {"$ref": "#/$defs/GeoJSONArea"}
      }
    },
    "ServiceFeatures": {
      "type": "object",
      "additionalProperties": false,
      "required": ["cost_estimates", "arrive_by", "arrive_by_with_waypoints", "transit_submode_filter", "optimize_options", "accounts"],
      "properties": {
        "cost_estimates": {"type": "boolean"},
        "arrive_by": {"type": "boolean"},
        "arrive_by_with_waypoints": {"type": "boolean"},
        "transit_submode_filter": {"type": "boolean"},
        "optimize_options": {
          "type": "array",
          "items": {"type": "string", "enum": ["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALKING"]}
        },
        "accounts": {"type": "boolean"}
      }
    },
    "ServiceLimits": {
      "type": "object",
      "additionalProperties": false,
      "required": ["max_waypoints", "max_dwell_minutes", "max_itineraries", "max_walk_distance_meters", "max_walk_duration_minutes", "max_transfers", "departure_window"],
      "properties": {
        "max_waypoints": {"type": "integer", "minimum": 0, "maximum": 3},
        "max_dwell_minutes": {"type": "integer"},
        "max_itineraries": {"type": "integer"},
        "max_walk_distance_meters": {"$ref": "#/$defs/IntRange"},
        "max_walk_duration_minutes": {"$ref": "#/$defs/IntRange"},
        "max_transfers": {"$ref": "#/$defs/IntRange"},
        "departure_window": {"$ref": "#/$defs/DepartureWindow"}
      }
    }
  }
}
```

**Status Codes:**

- **200**: OK. Service configuration (`Cache-Control: public, max-age=3600`).
- **500**: Internal Server Error. Unexpected failure (`INTERNAL_ERROR`).

_Error body: Problem Details (see “Common error response”)._

---

## 6. Check service health

**Endpoint:** `/api/v1/health`

**Method:** `GET`

**Description:** Liveness and dependency check for the deployment health check. Reports the overall status and each component: routing engine (OpenTripPlanner), native C++ engine, geocoder and transit data (with its version and validity). Probes are cheap and cached for up to 10 seconds; the body has no secrets.

**Request:** none (no request body and no query parameters).

**Response** (`200`, `application/json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "HealthResponse",
  "type": "object",
  "additionalProperties": false,
  "required": ["status", "api_version", "time", "components"],
  "properties": {
    "status": {"type": "string", "enum": ["OK", "DEGRADED", "DOWN", "UNKNOWN"]},
    "api_version": {"type": "string"},
    "time": {"$ref": "#/$defs/DateTimeWithOffset"},
    "components": {
      "type": "object",
      "additionalProperties": false,
      "required": ["routing_engine", "native_engine", "geocoder", "transit_data"],
      "properties": {
        "routing_engine": {"$ref": "#/$defs/ComponentHealth"},
        "native_engine": {"$ref": "#/$defs/ComponentHealth"},
        "geocoder": {"$ref": "#/$defs/ComponentHealth"},
        "transit_data": {"$ref": "#/$defs/ComponentHealth"}
      }
    }
  },
  "$defs": {
    "ComponentHealth": {
      "type": "object",
      "additionalProperties": false,
      "required": ["status", "detail", "checked_at"],
      "properties": {
        "status": {"type": "string", "enum": ["OK", "DEGRADED", "DOWN", "UNKNOWN"]},
        "detail": {"type": ["string", "null"]},
        "checked_at": {"anyOf": [{"$ref": "#/$defs/DateTimeWithOffset"}, {"type": "null"}]}
      }
    },
    "DateTimeWithOffset": {
      "type": "string",
      "format": "date-time",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$"
    }
  }
}
```

**Status Codes:**

- **200**: OK. Returned whenever the API process can respond. `status` summarises the dependencies: `OK` (all healthy), `DEGRADED` (planning works with reduced capability, e.g. geocoder down) or `DOWN` (planning impossible, e.g. routing engine unreachable or schedule data expired).

---

## Not in this list

- **Optional account endpoints** (`/api/v1/me`, preferences, saved places, trip history) come after the MVP (v1.1–v1.2). They need a Supabase sign-in token; see [api-contract.md](api-contract.md) section 17.
- `GET /routes/{id}` is deliberately not offered: planning is stateless, and shared links carry the trip request instead.
