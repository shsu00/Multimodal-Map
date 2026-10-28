from .config import CityConfig, RentalPricing
from .fares import transit_fares
from .models import Itinerary, Leg
from .modes import Mode


def _rental(leg: Leg, pricing: RentalPricing) -> float:
    return pricing.unlock + pricing.per_min * leg.duration_s / 60


def leg_cost(leg: Leg, city: CityConfig, stay_hours: float, is_last_car_leg: bool) -> float:
    """Price of a non-transit leg. Transit is priced per journey in fares.py."""
    km = leg.distance_m / 1000
    match leg.mode:
        case Mode.CAR:
            fuel = km * city.car_l_per_100km / 100 * city.fuel_price_per_l
            if leg.parked_after:
                return fuel + city.pnr_parking_flat
            if is_last_car_leg:
                return fuel + city.parking_per_hour * stay_hours
            return fuel
        case Mode.TAXI:
            t = city.taxi
            return max(t.min_fare, t.base + t.per_km * km + t.per_min * leg.duration_s / 60)
        case Mode.BIKE:
            return _rental(leg, city.bike_rental) if leg.rented else 0.0
        case Mode.SCOOTER:
            return _rental(leg, city.scooter_rental)
        case _:
            return 0.0


def price_itinerary(it: Itinerary, city: CityConfig, stay_hours: float) -> Itinerary:
    fares = transit_fares(it.legs, city.transit_fare)
    last_car = max((i for i, leg in enumerate(it.legs) if leg.mode == Mode.CAR), default=-1)
    for i, (leg, fare) in enumerate(zip(it.legs, fares)):
        if leg.mode == Mode.TRANSIT:
            leg.cost = fare
        else:
            leg.cost = leg_cost(leg, city, stay_hours, is_last_car_leg=i == last_car)
    it.total_cost = round(sum(leg.cost for leg in it.legs), 2)
    it.estimated_cost = any(leg.mode in (Mode.TAXI, Mode.CAR) for leg in it.legs)
    return it
