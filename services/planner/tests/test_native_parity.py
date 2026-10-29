"""The C++ core must give exactly the same answers as the Python reference.

Random itineraries with a fixed seed go through both implementations. Skipped
when mmr_core isn't built.
"""

import json
import random
from dataclasses import replace
from pathlib import Path

import pytest

from conftest import itin, leg
from planner import _native
from planner.config import CityConfig, RentalPricing, TaxiPricing, TransitFare
from planner.cost_model import _price_itinerary_py
from planner.fake_router import _encode_polyline_py
from planner.fares import _transit_fares_py
from planner.models import Itinerary, Place, Preferences
from planner.modes import Mode
from planner.pareto import _rank_py, rank, score

pytestmark = pytest.mark.skipif(_native.core is None, reason="mmr_core not built")

MODES = list(Mode)
rng = random.Random(20261029)


def random_itinerary() -> Itinerary:
    legs, t = [], rng.randrange(0, 600)
    for _ in range(rng.randint(1, 6)):
        mode = rng.choice(MODES)
        dur = rng.randrange(30, 3600)
        legs.append(
            leg(
                mode,
                t / 60,
                (t + dur) / 60,
                distance_m=round(rng.uniform(0, 30_000), 1),
                rented=mode == Mode.BIKE and rng.random() < 0.5,
                parked_after=mode == Mode.CAR and rng.random() < 0.3,
            )
        )
        t += dur + rng.choice((0, 0, 60, 300, 9000))
    return Itinerary("random", legs)


def random_city() -> CityConfig:
    u = rng.uniform
    return replace(
        CityConfig(),
        fuel_price_per_l=u(1, 3),
        car_l_per_100km=u(4, 14),
        parking_per_hour=u(0, 8),
        pnr_parking_flat=u(0, 10),
        taxi=TaxiPricing(u(2, 5), u(1, 3), u(0.2, 0.8), u(5, 15)),
        bike_rental=RentalPricing(u(0, 2), u(0.1, 0.5)),
        scooter_rental=RentalPricing(u(0, 2), u(0.2, 0.6)),
        transit_fare=TransitFare(u(1.5, 4), rng.choice((60, 90, 120))),
    )


def test_fares_and_pricing_match():
    for _ in range(500):
        city, stay = random_city(), rng.uniform(0, 10)
        a, b = random_itinerary(), random_itinerary()
        b.legs = [replace(x) for x in a.legs]

        assert _native.transit_fares(a.legs, city.transit_fare) == _transit_fares_py(a.legs, city.transit_fare)
        costs, total, estimated = _native.price(a, city, stay)
        _price_itinerary_py(b, city, stay)
        assert costs == [x.cost for x in b.legs]
        assert (total, estimated) == (b.total_cost, b.estimated_cost)


def test_filters_match():
    py_satisfies = lambda it, p: it.walk_m <= p.max_walk_m and it.transfers <= p.max_transfers  # noqa: E731
    for _ in range(500):
        it = random_itinerary()
        prefs = Preferences(max_walk_m=rng.uniform(0, 20_000), max_transfers=rng.randint(0, 3))
        allowed = frozenset(m for m in MODES if rng.random() < 0.5)
        assert _native.satisfies(it, prefs) == py_satisfies(it, prefs)
        modes = set(it.mode_sequence)
        expected = Mode.WALK in allowed if modes == {Mode.WALK} else modes - {Mode.WALK} <= allowed
        assert _native.uses_allowed_modes(it, allowed) == expected


def _ranked(chosen):
    return [(id(it), tuple(it.labels)) for it in chosen]


@pytest.mark.parametrize("n", [1, 3, 8, 40])
def test_rank_matches(n):
    for _ in range(100):
        # Few distinct values so ties and duplicate sequences are common.
        its = [
            itin(rng.choice((10, 20, 25, 30, 45)), rng.choice((0, 2.75, 5, 12.5, 20)), tuple(rng.choices(MODES, k=rng.randint(1, 3))))
            for _ in range(n)
        ]
        prefs = Preferences(value_of_time_per_hour=rng.choice((0, 5, 15, 60)), transfer_penalty=rng.choice((0, 1, 3)))
        limit, min_results = rng.choice(((5, 3), (2, 3), (10, 1)))
        native = _ranked(rank(its, prefs, limit, min_results))
        python = _ranked(_rank_py(its, prefs, limit, min_results))
        assert native == python


SCORE_CASES = Path(__file__).parents[3] / "packages/shared/test/score-cases.json"


def test_score_matches_shared_fixture():
    """Same cases packages/shared/test/score.test.ts checks against the TS slider."""
    for c in json.loads(SCORE_CASES.read_text())["cases"]:
        prefs = Preferences(value_of_time_per_hour=c["value_of_time_per_hour"], transfer_penalty=c["transfer_penalty"])
        it = itin(c["duration_s"] / 60, c["total_cost"], (Mode.TRANSIT,) * (c["transfers"] + 1))
        assert it.transfers == c["transfers"]
        assert score(it, prefs) == c["score"]
        assert _native.core.score(_native._itinerary(it), _native._prefs(prefs)) == c["score"]


def test_polyline_matches():
    for _ in range(200):
        pts = [Place(rng.uniform(-90, 90), rng.uniform(-180, 180)) for _ in range(rng.randint(0, 20))]
        assert _native.encode_polyline(pts) == _encode_polyline_py(pts)
        decoded = _native.core.decode_polyline(_native.encode_polyline(pts))
        flat = [x for pair in decoded for x in pair]
        assert flat == pytest.approx([x for p in pts for x in (p.lat, p.lon)], abs=0.51e-5)
