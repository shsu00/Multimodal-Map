"""Taxi + transit trips, which OTP can't plan in one query.

Taxi first mile: taxi to each of the k nearest rail/metro hubs, then transit
from there. Taxi last mile: transit to hubs near the destination, then taxi.
"""

import asyncio
from datetime import timedelta

from .models import Itinerary, Place
from .modes import Mode
from .otp_client import Router
from .templates import Template

BUFFER = timedelta(minutes=2)  # get out of the taxi / find the platform
TAXI = Template("TAXI", direct=Mode.TAXI)


async def _first_mile(router: Router, origin, dest, when, t: Template, hub: Place, has_bike) -> list[Itinerary]:
    taxis = await router.plan(origin, hub, when, False, TAXI, has_bike)
    if not taxis:
        return []
    taxi = taxis[0]
    rest_t = Template(t.name, access=Mode.WALK, egress=t.egress)
    rests = await router.plan(hub, dest, taxi.end + BUFFER, False, rest_t, has_bike)
    return [Itinerary(t.name, taxi.legs + r.legs) for r in rests[:1]]


async def _last_mile(router: Router, origin, dest, when, t: Template, hub: Place, has_bike) -> list[Itinerary]:
    head_t = Template(t.name, access=t.access, egress=Mode.WALK)
    heads = await router.plan(origin, hub, when, False, head_t, has_bike)
    if not heads:
        return []
    head = heads[0]
    taxis = await router.plan(hub, dest, head.end + BUFFER, False, TAXI, has_bike)
    return [Itinerary(t.name, head.legs + x.legs) for x in taxis[:1]]


async def plan_taxi_transit(
    router: Router, origin: Place, dest: Place, when, t: Template, has_bike: bool, k: int = 3
) -> list[Itinerary]:
    if t.access == Mode.TAXI:
        hubs = await router.nearest_hubs(origin, k)
        step = _first_mile
    else:
        hubs = await router.nearest_hubs(dest, k)
        step = _last_mile
    results = await asyncio.gather(*(step(router, origin, dest, when, t, h, has_bike) for h in hubs))
    return [it for group in results for it in group]
