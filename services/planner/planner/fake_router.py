"""Synthetic router for developing the apps before OTP is running (PLANNER_FAKE_ROUTER=1).

Legs are straight lines with rough city speeds. Good enough to exercise the
UI and the ranking logic, not for real trips.
"""

import math
from datetime import datetime, timedelta

from .models import Itinerary, Leg, Place
from .modes import Mode
from .templates import Template

SPEED_MPS = {Mode.WALK: 1.35, Mode.BIKE: 4.5, Mode.SCOOTER: 5.0, Mode.CAR: 9.0, Mode.TAXI: 9.0, Mode.TRANSIT: 8.0}
DETOUR = 1.3  # street distance vs straight line
TRANSIT_WAIT = timedelta(minutes=6)
PARKING_TIME = timedelta(minutes=5)


def haversine_m(a: Place, b: Place) -> float:
    r = 6_371_000
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp, dl = p2 - p1, math.radians(b.lon - a.lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def lerp(a: Place, b: Place, f: float, name: str = "") -> Place:
    return Place(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f, name)


def encode_polyline(points: list[Place]) -> str:
    """Google encoded polyline (precision 5), the same format OTP returns."""
    out, prev_lat, prev_lon = [], 0, 0
    for p in points:
        lat, lon = round(p.lat * 1e5), round(p.lon * 1e5)
        for delta in (lat - prev_lat, lon - prev_lon):
            v = ~(delta << 1) if delta < 0 else delta << 1
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1F)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        prev_lat, prev_lon = lat, lon
    return "".join(out)


class FakeRouter:
    def _leg(self, mode: Mode, a: Place, b: Place, start: datetime, has_bike: bool, route=None) -> Leg:
        dist = haversine_m(a, b) * DETOUR
        dur = timedelta(seconds=dist / SPEED_MPS[mode])
        if mode == Mode.TRANSIT:
            start += TRANSIT_WAIT
        return Leg(
            mode=mode,
            start=start,
            end=start + dur,
            distance_m=dist,
            origin=a,
            destination=b,
            polyline=encode_polyline([a, b]),
            route_name=route,
            rented=mode == Mode.BIKE and not has_bike,
        )

    def _chain(self, stops: list[tuple[Mode, Place, Place, str | None]], when: datetime, has_bike: bool) -> list[Leg]:
        legs, t = [], when
        for mode, a, b, route in stops:
            leg = self._leg(mode, a, b, t, has_bike, route)
            legs.append(leg)
            t = leg.end
        return legs

    async def plan(self, origin, dest, when, arrive_by, template, has_bike):
        if template.direct:
            legs = self._chain([(template.direct, origin, dest, None)], when, has_bike)
        else:
            access = Mode.CAR if template.park_and_ride else template.access
            # Faster first/last-mile modes reach a stop further away.
            a_frac = 0.08 if access == Mode.WALK else 0.2
            e_frac = 0.08 if template.egress == Mode.WALK else 0.2
            s1 = lerp(origin, dest, a_frac, "Origin Station")
            s2 = lerp(origin, dest, 1 - e_frac, "Destination Station")
            legs = self._chain(
                [(access, origin, s1, None), (Mode.TRANSIT, s1, s2, "Line 1"), (template.egress, s2, dest, None)],
                when,
                has_bike,
            )
            if template.park_and_ride:
                legs[0].parked_after = True
                legs[0].end += PARKING_TIME
                for leg in legs[1:]:
                    leg.start += PARKING_TIME
                    leg.end += PARKING_TIME
        if arrive_by:
            shift = legs[-1].end - when
            for leg in legs:
                leg.start -= shift
                leg.end -= shift
        return [Itinerary(template=template.name, legs=legs)]

    async def nearest_hubs(self, place, k=3):
        return [Place(place.lat + 0.01 * (i + 1), place.lon + 0.01 * (i + 1), f"Hub {i + 1}") for i in range(k)]
