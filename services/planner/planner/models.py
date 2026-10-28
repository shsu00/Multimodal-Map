from dataclasses import dataclass, field
from datetime import datetime

from .modes import CO2_G_PER_KM, Mode


@dataclass(frozen=True)
class Place:
    lat: float
    lon: float
    name: str = ""


@dataclass
class Preferences:
    value_of_time_per_hour: float = 15.0  # money the user would pay to save one hour
    transfer_penalty: float = 1.0  # money-equivalent annoyance of each transfer
    max_walk_m: float = 2000.0
    max_transfers: int = 3
    has_bike: bool = False  # owns a bike (otherwise bike legs are rentals)
    stay_hours: float = 2.0  # how long the car stays parked at the destination


@dataclass
class TripRequest:
    origin: Place
    destination: Place
    when: datetime
    modes: frozenset[Mode]
    arrive_by: bool = False
    prefs: Preferences = field(default_factory=Preferences)


@dataclass
class Leg:
    mode: Mode
    start: datetime
    end: datetime
    distance_m: float
    origin: Place
    destination: Place
    polyline: str = ""
    route_name: str | None = None
    rented: bool = False
    parked_after: bool = False  # car is left at a park & ride after this leg
    cost: float = 0.0

    @property
    def duration_s(self) -> float:
        return (self.end - self.start).total_seconds()


@dataclass
class Itinerary:
    template: str
    legs: list[Leg]
    total_cost: float = 0.0
    estimated_cost: bool = False
    labels: list[str] = field(default_factory=list)

    @property
    def start(self) -> datetime:
        return self.legs[0].start

    @property
    def end(self) -> datetime:
        return self.legs[-1].end

    @property
    def duration_s(self) -> float:
        return (self.end - self.start).total_seconds()

    @property
    def transfers(self) -> int:
        return max(0, sum(leg.mode == Mode.TRANSIT for leg in self.legs) - 1)

    @property
    def walk_m(self) -> float:
        return sum(leg.distance_m for leg in self.legs if leg.mode == Mode.WALK)

    @property
    def co2_g(self) -> float:
        return sum(CO2_G_PER_KM[leg.mode] * leg.distance_m / 1000 for leg in self.legs)

    @property
    def mode_sequence(self) -> tuple[Mode, ...]:
        """Modes in order with consecutive repeats collapsed, e.g. (WALK, TRANSIT, WALK)."""
        seq: list[Mode] = []
        for leg in self.legs:
            if not seq or seq[-1] != leg.mode:
                seq.append(leg.mode)
        return tuple(seq)
