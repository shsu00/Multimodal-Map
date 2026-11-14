from enum import StrEnum


class Mode(StrEnum):
    """User-facing transport modes."""

    WALK = "WALK"
    BIKE = "BIKE"
    SCOOTER = "SCOOTER"
    CAR = "CAR"
    TAXI = "TAXI"
    TRANSIT = "TRANSIT"


# Grams of CO2 per passenger-km, rough averages.
CO2_G_PER_KM = {
    Mode.WALK: 0,
    Mode.BIKE: 0,
    Mode.SCOOTER: 35,
    Mode.CAR: 170,
    Mode.TAXI: 170,
    Mode.TRANSIT: 60,
}
