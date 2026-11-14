"""Bridge to the C++ core in services/planner/core (the `mmr_core` module).

The only module that imports mmr_core. It converts the dataclasses to the
core's plain structs and returns plain Python values. Callers check NATIVE and
fall back to their Python implementation, which is also the reference the
parity tests compare against. Set PLANNER_PURE_PYTHON=1 to force the fallback.
"""

import os
from collections.abc import Iterable

from .config import CityConfig, TransitFare
from .models import Itinerary, Leg, Place, Preferences
from .modes import Mode

try:
    import mmr_core as core
except ImportError:  # not built: pip install -e ./core
    core = None

NATIVE = core is not None and not os.environ.get("PLANNER_PURE_PYTHON")

if core is not None:
    _MODE = {m: core.Mode[m.value] for m in Mode}
    FASTEST, CHEAPEST, BEST_BALANCE = core.FASTEST, core.CHEAPEST, core.BEST_BALANCE


def _legs(legs: list[Leg]) -> list:
    # Times go in as seconds from the first leg's start: small, exact numbers.
    if not legs:
        return []
    t0 = legs[0].start
    return [
        core.Leg(
            _MODE[leg.mode],
            (leg.start - t0).total_seconds(),
            (leg.end - t0).total_seconds(),
            leg.distance_m,
            leg.rented,
            leg.parked_after,
        )
        for leg in legs
    ]


def _itinerary(it: Itinerary):
    return core.Itinerary(_legs(it.legs), it.total_cost)


def _prefs(p: Preferences):
    out = core.Prefs()
    out.value_of_time_per_hour = p.value_of_time_per_hour
    out.transfer_penalty = p.transfer_penalty
    out.max_walk_m = p.max_walk_m
    out.max_transfers = p.max_transfers
    return out


def _fare(f: TransitFare):
    out = core.TransitFare()
    out.flat = f.flat
    out.transfer_window_min = f.transfer_window_min
    return out


def _city(city: CityConfig):
    out = core.CityPrices()
    out.fuel_price_per_l = city.fuel_price_per_l
    out.car_l_per_100km = city.car_l_per_100km
    out.parking_per_hour = city.parking_per_hour
    out.pnr_parking_flat = city.pnr_parking_flat
    for name in ("base", "per_km", "per_min", "min_fare"):
        setattr(out.taxi, name, getattr(city.taxi, name))
    for target, src in ((out.bike_rental, city.bike_rental), (out.scooter_rental, city.scooter_rental)):
        target.unlock = src.unlock
        target.per_min = src.per_min
    out.transit_fare = _fare(city.transit_fare)
    return out


def transit_fares(legs: list[Leg], fare: TransitFare) -> list[float]:
    return core.transit_fares(_legs(legs), _fare(fare))


def price(it: Itinerary, city: CityConfig, stay_hours: float) -> tuple[list[float], float, bool]:
    """Per-leg costs, rounded total and whether the price is an estimate."""
    priced = core.price_itinerary(_itinerary(it), _city(city), stay_hours)
    return [leg.cost for leg in priced.legs], priced.total_cost, priced.estimated_cost


def rank(its: list[Itinerary], prefs: Preferences, limit: int, min_results: int) -> list[tuple[int, int]]:
    """(index into its, label bits) per chosen itinerary, best first."""
    return core.rank([_itinerary(it) for it in its], _prefs(prefs), limit, min_results)


def satisfies(it: Itinerary, prefs: Preferences) -> bool:
    return core.satisfies(_itinerary(it), _prefs(prefs))


def uses_allowed_modes(it: Itinerary, allowed: Iterable[Mode]) -> bool:
    mask = 0
    for m in allowed:
        mask |= 1 << _MODE[m].value
    return core.uses_allowed_modes(_itinerary(it), mask)


def encode_polyline(points: list[Place]) -> str:
    return core.encode_polyline([(p.lat, p.lon) for p in points])
