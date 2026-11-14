"""HTTP API for the web and mobile apps."""

import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import _native
from .config import load_city
from .fake_router import FakeRouter
from .models import Itinerary, Place, Preferences, TripRequest
from .modes import Mode
from .otp_client import OTPClient
from .planner import plan_trip

REPO_ROOT = Path(__file__).resolve().parents[3]
CITY = load_city(os.environ.get("CITY_CONFIG", REPO_ROOT / "cities" / "seattle.yaml"))
OTP_URL = os.environ.get("OTP_URL", "http://localhost:8080")
PHOTON_URL = os.environ.get("PHOTON_URL", "https://photon.komoot.io")
FAKE_ROUTER = os.environ.get("PLANNER_FAKE_ROUTER") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Public OSM services (Photon) reject requests without an identifying User-Agent.
    async with httpx.AsyncClient(headers={"User-Agent": "multimodal-router/0.1 (dev)"}) as http:
        app.state.http = http
        app.state.router = FakeRouter() if FAKE_ROUTER else OTPClient(OTP_URL, http)
        yield


app = FastAPI(title="Multi-modal Router", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class PlaceIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    name: str = ""


class PrefsIn(BaseModel):
    value_of_time_per_hour: float = Field(15.0, ge=0)
    transfer_penalty: float = Field(1.0, ge=0)
    max_walk_m: float = Field(2000, gt=0)
    max_transfers: int = Field(3, ge=0)
    has_bike: bool = False
    stay_hours: float = Field(2.0, ge=0)


class PlanIn(BaseModel):
    origin: PlaceIn
    destination: PlaceIn
    when: datetime | None = None  # defaults to now
    arrive_by: bool = False
    modes: list[Mode] = Field(min_length=1)
    prefs: PrefsIn = PrefsIn()


class LegOut(BaseModel):
    mode: Mode
    start: datetime
    end: datetime
    duration_s: float
    distance_m: float
    origin: PlaceIn
    destination: PlaceIn
    polyline: str
    route_name: str | None
    rented: bool
    cost: float


class ItineraryOut(BaseModel):
    id: str
    template: str
    labels: list[str]
    start: datetime
    end: datetime
    duration_s: float
    total_cost: float
    estimated_cost: bool
    currency: str
    transfers: int
    walk_m: float
    co2_g: float
    mode_sequence: list[Mode]
    legs: list[LegOut]


class PlanOut(BaseModel):
    itineraries: list[ItineraryOut]


class CityOut(BaseModel):
    name: str
    currency: str
    bbox: tuple[float, float, float, float]
    center: tuple[float, float]
    modes: list[Mode]


class GeocodeResult(BaseModel):
    name: str
    lat: float
    lon: float


def _place_out(p: Place) -> PlaceIn:
    return PlaceIn(lat=p.lat, lon=p.lon, name=p.name)


def _itinerary_out(i: int, it: Itinerary) -> ItineraryOut:
    return ItineraryOut(
        id=f"{i}-{it.template}",
        template=it.template,
        labels=it.labels,
        start=it.start,
        end=it.end,
        duration_s=it.duration_s,
        total_cost=it.total_cost,
        estimated_cost=it.estimated_cost,
        currency=CITY.currency,
        transfers=it.transfers,
        walk_m=round(it.walk_m),
        co2_g=round(it.co2_g),
        mode_sequence=list(it.mode_sequence),
        legs=[
            LegOut(
                mode=leg.mode,
                start=leg.start,
                end=leg.end,
                duration_s=leg.duration_s,
                distance_m=round(leg.distance_m),
                origin=_place_out(leg.origin),
                destination=_place_out(leg.destination),
                polyline=leg.polyline,
                route_name=leg.route_name,
                rented=leg.rented,
                cost=round(leg.cost, 2),
            )
            for leg in it.legs
        ],
    )


@app.get("/health")
async def health():
    return {"ok": True, "fake_router": FAKE_ROUTER, "native": _native.NATIVE}


@app.get("/v1/city", response_model=CityOut)
async def city():
    return CityOut(name=CITY.name, currency=CITY.currency, bbox=CITY.bbox, center=CITY.center, modes=list(Mode))


@app.post("/v1/plan", response_model=PlanOut)
async def plan(body: PlanIn):
    tz = ZoneInfo(CITY.timezone)
    when = body.when or datetime.now(tz)
    if when.tzinfo is None:
        when = when.replace(tzinfo=tz)
    req = TripRequest(
        origin=Place(body.origin.lat, body.origin.lon, body.origin.name or "Origin"),
        destination=Place(body.destination.lat, body.destination.lon, body.destination.name or "Destination"),
        when=when,
        arrive_by=body.arrive_by,
        modes=frozenset(body.modes),
        prefs=Preferences(**body.prefs.model_dump()),
    )
    its = await plan_trip(req, app.state.router, CITY)
    return PlanOut(itineraries=[_itinerary_out(i, it) for i, it in enumerate(its)])


def _photon_results(body: dict) -> list[GeocodeResult]:
    out = []
    for f in body.get("features", []):
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        parts = [p.get("name"), p.get("street"), p.get("city")]
        out.append(GeocodeResult(name=", ".join(x for x in parts if x), lat=lat, lon=lon))
    return out


@app.get("/v1/geocode", response_model=list[GeocodeResult])
async def geocode(q: str, limit: int = 5):
    lat, lon = CITY.center
    try:
        r = await app.state.http.get(
            f"{PHOTON_URL}/api", params={"q": q, "limit": limit, "lat": lat, "lon": lon}, timeout=5
        )
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"geocoder unavailable: {e}") from e
    return _photon_results(r.json())


@app.get("/v1/reverse", response_model=list[GeocodeResult])
async def reverse(lat: float, lon: float):
    try:
        r = await app.state.http.get(f"{PHOTON_URL}/reverse", params={"lat": lat, "lon": lon}, timeout=5)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"geocoder unavailable: {e}") from e
    return _photon_results(r.json())
