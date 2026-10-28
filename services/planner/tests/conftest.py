from datetime import datetime, timedelta, timezone

import pytest

from planner.config import CityConfig
from planner.models import Itinerary, Leg, Place
from planner.modes import Mode

T0 = datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc)
A = Place(47.60, -122.33, "A")
B = Place(47.65, -122.30, "B")


def leg(mode: Mode, start_min: float, end_min: float, distance_m: float = 1000, **kw) -> Leg:
    return Leg(
        mode=mode,
        start=T0 + timedelta(minutes=start_min),
        end=T0 + timedelta(minutes=end_min),
        distance_m=distance_m,
        origin=A,
        destination=B,
        **kw,
    )


def itin(minutes: float, cost: float, modes=(Mode.WALK,), name: str = "x") -> Itinerary:
    step = minutes / len(modes)
    legs = [leg(m, i * step, (i + 1) * step) for i, m in enumerate(modes)]
    return Itinerary(template=name, legs=legs, total_cost=cost)


@pytest.fixture
def city() -> CityConfig:
    return CityConfig()
