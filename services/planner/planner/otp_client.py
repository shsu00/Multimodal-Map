"""OpenTripPlanner 2 GraphQL client (planConnection API)."""

from datetime import datetime
from typing import Protocol

import httpx

from .models import Itinerary, Leg, Place
from .modes import Mode
from .templates import Template

PLAN_QUERY = """
query Plan($origin: PlanLabeledLocationInput!, $destination: PlanLabeledLocationInput!,
           $dateTime: PlanDateTimeInput!, $modes: PlanModesInput, $first: Int) {
  planConnection(origin: $origin, destination: $destination, dateTime: $dateTime,
                 modes: $modes, first: $first) {
    edges { node { legs {
      mode transitLeg rentedBike distance
      start { scheduledTime } end { scheduledTime }
      from { name lat lon } to { name lat lon }
      route { shortName longName }
      legGeometry { points }
    } } }
  }
}
"""

HUBS_QUERY = """
query Hubs($lat: Float!, $lon: Float!, $radius: Int!, $first: Int!) {
  nearest(lat: $lat, lon: $lon, maxDistance: $radius, first: $first,
          filterByPlaceTypes: [STOP], filterByModes: [RAIL, SUBWAY, TRAM, FERRY]) {
    edges { node { place { ... on Stop { name lat lon } } } }
  }
}
"""


class Router(Protocol):
    async def plan(
        self, origin: Place, dest: Place, when: datetime, arrive_by: bool, template: Template, has_bike: bool
    ) -> list[Itinerary]: ...

    async def nearest_hubs(self, place: Place, k: int = 3) -> list[Place]: ...


def _direct_mode(mode: Mode, has_bike: bool) -> str:
    return {
        Mode.WALK: "WALK",
        Mode.BIKE: "BICYCLE" if has_bike else "BICYCLE_RENTAL",
        Mode.SCOOTER: "SCOOTER_RENTAL",
        Mode.CAR: "CAR",
        Mode.TAXI: "CAR",  # routed as a car, relabelled and priced as a taxi
    }[mode]


def _access_mode(t: Template, has_bike: bool) -> str:
    if t.park_and_ride:
        return "CAR_PARKING"
    return {
        Mode.WALK: "WALK",
        Mode.BIKE: "BICYCLE_PARKING" if has_bike else "BICYCLE_RENTAL",
        Mode.SCOOTER: "SCOOTER_RENTAL",
    }[t.access]


def _egress_mode(t: Template) -> str:
    # An owned bike stays at the origin side, so last-mile bikes are rentals.
    return {Mode.WALK: "WALK", Mode.BIKE: "BICYCLE_RENTAL", Mode.SCOOTER: "SCOOTER_RENTAL"}[t.egress]


def _with_walk(mode: str) -> list[str]:
    # OTP 2.10 rejects rental modes unless WALK is allowed on the same leg.
    return [mode, "WALK"] if mode.endswith("_RENTAL") else [mode]


def otp_modes(t: Template, has_bike: bool) -> dict:
    if t.direct:
        return {"directOnly": True, "direct": _with_walk(_direct_mode(t.direct, has_bike))}
    return {
        "transitOnly": True,
        "transit": {
            "access": _with_walk(_access_mode(t, has_bike)),
            "egress": _with_walk(_egress_mode(t)),
            "transfer": ["WALK"],
        },
    }


def _leg_mode(raw: dict, t: Template) -> Mode:
    if raw["transitLeg"]:
        return Mode.TRANSIT
    match raw["mode"]:
        case "BICYCLE":
            return Mode.BIKE
        case "SCOOTER":
            return Mode.SCOOTER
        case "CAR":
            return Mode.TAXI if t.direct == Mode.TAXI else Mode.CAR
        case _:
            return Mode.WALK


def _place(raw: dict) -> Place:
    return Place(raw["lat"], raw["lon"], raw.get("name") or "")


def parse_itinerary(node: dict, t: Template) -> Itinerary:
    legs = []
    for raw in node["legs"]:
        route = raw.get("route") or {}
        legs.append(
            Leg(
                mode=_leg_mode(raw, t),
                start=datetime.fromisoformat(raw["start"]["scheduledTime"]),
                end=datetime.fromisoformat(raw["end"]["scheduledTime"]),
                distance_m=raw["distance"],
                origin=_place(raw["from"]),
                destination=_place(raw["to"]),
                polyline=(raw.get("legGeometry") or {}).get("points", ""),
                route_name=route.get("shortName") or route.get("longName"),
                rented=bool(raw.get("rentedBike")),
            )
        )
    for prev, nxt in zip(legs, legs[1:]):
        if prev.mode == Mode.CAR and nxt.mode != Mode.CAR:
            prev.parked_after = True
    return Itinerary(template=t.name, legs=legs)


def _location(p: Place) -> dict:
    return {"label": p.name, "location": {"coordinate": {"latitude": p.lat, "longitude": p.lon}}}


class OTPClient:
    def __init__(self, base_url: str, http: httpx.AsyncClient, results_per_template: int = 3):
        self.url = base_url.rstrip("/") + "/otp/gtfs/v1"
        self.http = http
        self.first = results_per_template

    async def _query(self, query: str, variables: dict) -> dict:
        r = await self.http.post(self.url, json={"query": query, "variables": variables}, timeout=10)
        r.raise_for_status()
        body = r.json()
        if body.get("errors"):
            raise RuntimeError(f"OTP error: {body['errors']}")
        return body["data"]

    async def plan(self, origin, dest, when, arrive_by, template, has_bike):
        key = "latestArrival" if arrive_by else "earliestDeparture"
        data = await self._query(
            PLAN_QUERY,
            {
                "origin": _location(origin),
                "destination": _location(dest),
                "dateTime": {key: when.isoformat()},
                "modes": otp_modes(template, has_bike),
                "first": self.first,
            },
        )
        return [parse_itinerary(e["node"], template) for e in data["planConnection"]["edges"]]

    async def nearest_hubs(self, place, k=3):
        data = await self._query(HUBS_QUERY, {"lat": place.lat, "lon": place.lon, "radius": 8000, "first": k})
        return [_place(e["node"]["place"]) for e in data["nearest"]["edges"]]
