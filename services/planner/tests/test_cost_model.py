import pytest

from conftest import leg
from planner.cost_model import price_itinerary
from planner.fares import transit_fares
from planner.models import Itinerary
from planner.modes import Mode


def test_car_fuel_plus_destination_parking(city):
    it = Itinerary("CAR", [leg(Mode.CAR, 0, 20, distance_m=10_000)])
    price_itinerary(it, city, stay_hours=2)
    fuel = 10 * city.car_l_per_100km / 100 * city.fuel_price_per_l
    assert it.total_cost == pytest.approx(fuel + 2 * city.parking_per_hour, abs=0.01)
    assert it.estimated_cost


def test_park_and_ride_uses_flat_lot_price(city):
    it = Itinerary(
        "CAR+TRANSIT+WALK",
        [leg(Mode.CAR, 0, 10, 5000, parked_after=True), leg(Mode.TRANSIT, 15, 40), leg(Mode.WALK, 40, 45)],
    )
    price_itinerary(it, city, stay_hours=8)
    fuel = 5 * city.car_l_per_100km / 100 * city.fuel_price_per_l
    assert it.legs[0].cost == pytest.approx(fuel + city.pnr_parking_flat)
    assert it.legs[1].cost == city.transit_fare.flat


def test_taxi_minimum_fare(city):
    it = Itinerary("TAXI", [leg(Mode.TAXI, 0, 2, distance_m=300)])
    price_itinerary(it, city, 0)
    assert it.total_cost == city.taxi.min_fare


def test_own_bike_free_rental_charged(city):
    own = Itinerary("BIKE", [leg(Mode.BIKE, 0, 10)])
    rented = Itinerary("BIKE", [leg(Mode.BIKE, 0, 10, rented=True)])
    assert price_itinerary(own, city, 0).total_cost == 0
    expected = city.bike_rental.unlock + 10 * city.bike_rental.per_min
    assert price_itinerary(rented, city, 0).total_cost == pytest.approx(expected)


def test_transfer_inside_window_is_free(city):
    legs = [leg(Mode.TRANSIT, 0, 20), leg(Mode.WALK, 20, 25), leg(Mode.TRANSIT, 25, 50)]
    assert transit_fares(legs, city.transit_fare) == [city.transit_fare.flat, 0.0, 0.0]


def test_boarding_after_window_pays_again(city):
    late = city.transit_fare.transfer_window_min + 1
    legs = [leg(Mode.TRANSIT, 0, 20), leg(Mode.TRANSIT, late, late + 10)]
    assert transit_fares(legs, city.transit_fare) == [city.transit_fare.flat] * 2
