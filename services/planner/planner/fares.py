"""Transit fare engine. Fares are journey-level: transfers inside the window are free.

TODO: zone fares and GTFS Fares v2 once the city is chosen.
"""

from datetime import timedelta

from .config import TransitFare
from .models import Leg
from .modes import Mode


def transit_fares(legs: list[Leg], fare: TransitFare) -> list[float]:
    """Cost of each leg's boarding (0 for non-transit legs and free transfers)."""
    window = timedelta(minutes=fare.transfer_window_min)
    paid_at = None
    costs = []
    for leg in legs:
        if leg.mode != Mode.TRANSIT:
            costs.append(0.0)
        elif paid_at is not None and leg.start - paid_at <= window:
            costs.append(0.0)
        else:
            paid_at = leg.start
            costs.append(fare.flat)
    return costs
