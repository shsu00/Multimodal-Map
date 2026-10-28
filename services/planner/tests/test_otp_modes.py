from conftest import itin
from planner.modes import Mode
from planner.otp_client import otp_modes
from planner.planner import uses_allowed_modes
from planner.templates import Template


def test_rental_modes_are_sent_with_walk():
    # OTP 2.10 rejects SCOOTER_RENTAL / BICYCLE_RENTAL without WALK on the same leg.
    assert otp_modes(Template("SCOOTER", direct=Mode.SCOOTER), has_bike=False)["direct"] == ["SCOOTER_RENTAL", "WALK"]
    t = Template("BIKE+TRANSIT+SCOOTER", access=Mode.BIKE, egress=Mode.SCOOTER)
    transit = otp_modes(t, has_bike=False)["transit"]
    assert transit["access"] == ["BICYCLE_RENTAL", "WALK"]
    assert transit["egress"] == ["SCOOTER_RENTAL", "WALK"]


def test_own_bike_and_car_are_not_mixed_with_walk():
    assert otp_modes(Template("BIKE", direct=Mode.BIKE), has_bike=True)["direct"] == ["BICYCLE"]
    pnr = Template("CAR+TRANSIT+WALK", access=Mode.CAR, egress=Mode.WALK, park_and_ride=True)
    assert otp_modes(pnr, has_bike=False)["transit"]["access"] == ["CAR_PARKING"]


def test_walk_only_fallback_needs_walk_selected():
    walk_only = itin(100, 0, (Mode.WALK,))
    assert not uses_allowed_modes(walk_only, frozenset({Mode.SCOOTER}))
    assert uses_allowed_modes(walk_only, frozenset({Mode.SCOOTER, Mode.WALK}))


def test_walking_is_always_ok_as_a_connector():
    it = itin(30, 3, (Mode.WALK, Mode.TRANSIT, Mode.WALK))
    assert uses_allowed_modes(it, frozenset({Mode.TRANSIT}))
    assert not uses_allowed_modes(itin(30, 3, (Mode.WALK, Mode.CAR)), frozenset({Mode.TRANSIT}))
