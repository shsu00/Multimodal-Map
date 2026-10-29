"""Turn the user's allowed modes into candidate trip shapes to ask the router for."""

from dataclasses import dataclass

from .modes import Mode

DIRECT_MODES = (Mode.WALK, Mode.BIKE, Mode.SCOOTER, Mode.CAR, Mode.TAXI)
FIRST_MILE = (Mode.WALK, Mode.BIKE, Mode.SCOOTER, Mode.TAXI)
LAST_MILE = (Mode.WALK, Mode.BIKE, Mode.SCOOTER, Mode.TAXI)


@dataclass(frozen=True)
class Template:
    name: str
    direct: Mode | None = None  # single-mode trip, no transit
    access: Mode | None = None  # first mile before transit
    egress: Mode | None = None  # last mile after transit
    park_and_ride: bool = False

    @property
    def uses_transit(self) -> bool:
        return self.direct is None

    @property
    def uses_taxi_stitch(self) -> bool:
        """OTP can't route taxi to/from transit, so these are stitched by hand."""
        return self.uses_transit and Mode.TAXI in (self.access, self.egress)

    @property
    def complexity(self) -> int:
        return sum(m not in (None, Mode.WALK) for m in (self.direct, self.access, self.egress))


def generate_templates(allowed: frozenset[Mode], max_templates: int = 12) -> list[Template]:
    """Every trip shape that only uses allowed modes.

    Walking to and between stops is always permitted for transit trips, but a
    walk-only trip is only offered when WALK is selected.
    """
    out = [Template(m.value, direct=m) for m in DIRECT_MODES if m in allowed]

    if Mode.TRANSIT in allowed:
        connectors = allowed | {Mode.WALK}
        for a in FIRST_MILE:
            for e in LAST_MILE:
                if a not in connectors or e not in connectors:
                    continue
                if a == e == Mode.TAXI:
                    continue  # taxi both ends: just take the taxi
                out.append(Template(f"{a.value}+TRANSIT+{e.value}", access=a, egress=e))
        if Mode.CAR in allowed:
            out.append(
                Template("CAR+TRANSIT+WALK", access=Mode.CAR, egress=Mode.WALK, park_and_ride=True)
            )

    out.sort(key=lambda t: t.complexity)
    return out[:max_templates]
