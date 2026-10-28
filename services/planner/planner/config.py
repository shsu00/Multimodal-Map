from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class TaxiPricing:
    base: float = 3.0
    per_km: float = 1.8
    per_min: float = 0.4
    min_fare: float = 8.0


@dataclass
class RentalPricing:
    unlock: float = 1.0
    per_min: float = 0.35


@dataclass
class TransitFare:
    flat: float = 2.75
    transfer_window_min: int = 120  # boardings within this window of the paid one are free


@dataclass
class CityConfig:
    name: str = "Example City"
    currency: str = "USD"
    timezone: str = "UTC"
    bbox: tuple[float, float, float, float] = (-180.0, -90.0, 180.0, 90.0)  # min lon, min lat, max lon, max lat
    center: tuple[float, float] = (0.0, 0.0)  # lat, lon
    fuel_price_per_l: float = 1.8
    car_l_per_100km: float = 8.0
    parking_per_hour: float = 4.0
    pnr_parking_flat: float = 5.0
    taxi: TaxiPricing = field(default_factory=TaxiPricing)
    bike_rental: RentalPricing = field(default_factory=lambda: RentalPricing(1.0, 0.2))
    scooter_rental: RentalPricing = field(default_factory=RentalPricing)
    transit_fare: TransitFare = field(default_factory=TransitFare)


def load_city(path: str | Path) -> CityConfig:
    raw = yaml.safe_load(Path(path).read_text())
    return CityConfig(
        name=raw["name"],
        currency=raw["currency"],
        timezone=raw["timezone"],
        bbox=tuple(raw["bbox"]),
        center=tuple(raw["center"]),
        fuel_price_per_l=raw["car"]["fuel_price_per_l"],
        car_l_per_100km=raw["car"]["l_per_100km"],
        parking_per_hour=raw["car"]["parking_per_hour"],
        pnr_parking_flat=raw["car"]["pnr_parking_flat"],
        taxi=TaxiPricing(**raw["taxi"]),
        bike_rental=RentalPricing(**raw["bike_rental"]),
        scooter_rental=RentalPricing(**raw["scooter_rental"]),
        transit_fare=TransitFare(**raw["transit_fare"]),
    )
