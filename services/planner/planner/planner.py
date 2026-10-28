"""Orchestration: templates → parallel routing → pricing → constraints → ranking."""

import asyncio
import logging

from .config import CityConfig
from .cost_model import price_itinerary
from .models import Itinerary, Preferences, TripRequest
from .modes import Mode
from .otp_client import Router
from .pareto import rank
from .taxi_stitch import plan_taxi_transit
from .templates import Template, generate_templates

log = logging.getLogger(__name__)


def satisfies(it: Itinerary, prefs: Preferences) -> bool:
    return it.walk_m <= prefs.max_walk_m and it.transfers <= prefs.max_transfers


def uses_allowed_modes(it: Itinerary, allowed: frozenset[Mode]) -> bool:
    """Walking is always fine as a connector, but a walk-only trip needs WALK selected.

    Needed because OTP may fall back to walking when a rental query allows WALK.
    """
    modes = set(it.mode_sequence)
    if modes == {Mode.WALK}:
        return Mode.WALK in allowed
    return modes - {Mode.WALK} <= allowed


async def _route(router: Router, req: TripRequest, t: Template) -> list[Itinerary]:
    has_bike = req.prefs.has_bike
    if t.uses_taxi_stitch:
        return await plan_taxi_transit(router, req.origin, req.destination, req.when, t, has_bike)
    return await router.plan(req.origin, req.destination, req.when, req.arrive_by, t, has_bike)


async def plan_trip(req: TripRequest, router: Router, city: CityConfig) -> list[Itinerary]:
    templates = generate_templates(req.modes)
    results = await asyncio.gather(*(_route(router, req, t) for t in templates), return_exceptions=True)

    candidates: list[Itinerary] = []
    for t, res in zip(templates, results):
        if isinstance(res, BaseException):
            log.warning("template %s failed: %s", t.name, res)
            continue
        candidates.extend(res)

    priced = [price_itinerary(it, city, req.prefs.stay_hours) for it in candidates if it.legs]
    allowed = [it for it in priced if satisfies(it, req.prefs) and uses_allowed_modes(it, req.modes)]
    return rank(allowed, req.prefs)
