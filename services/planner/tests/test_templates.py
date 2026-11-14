from planner.modes import Mode
from planner.templates import generate_templates


def names(modes):
    return {t.name for t in generate_templates(frozenset(modes), max_templates=100)}


def test_only_allowed_modes_used():
    for t in generate_templates(frozenset({Mode.TRANSIT, Mode.BIKE}), max_templates=100):
        used = {t.direct, t.access, t.egress} - {None}
        assert used <= {Mode.TRANSIT, Mode.BIKE, Mode.WALK}


def test_walk_is_implicit_for_transit_but_not_direct():
    got = names({Mode.TRANSIT})
    assert got == {"WALK+TRANSIT+WALK"}
    assert "WALK" not in got


def test_park_and_ride_needs_car_and_transit():
    assert "CAR+TRANSIT+WALK" in names({Mode.CAR, Mode.TRANSIT})
    assert "CAR+TRANSIT+WALK" not in names({Mode.CAR, Mode.WALK})


def test_no_taxi_on_both_ends():
    assert "TAXI+TRANSIT+TAXI" not in names({Mode.TAXI, Mode.TRANSIT})
    assert {"TAXI+TRANSIT+WALK", "WALK+TRANSIT+TAXI"} <= names({Mode.TAXI, Mode.TRANSIT})


def test_capped_and_simplest_first():
    ts = generate_templates(frozenset(Mode), max_templates=5)
    assert len(ts) == 5
    assert [t.complexity for t in ts] == sorted(t.complexity for t in ts)
