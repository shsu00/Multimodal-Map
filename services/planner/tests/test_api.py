"""End-to-end through the HTTP API with the fake router (no OTP needed)."""

import os

os.environ["PLANNER_FAKE_ROUTER"] = "1"

import pytest
from fastapi.testclient import TestClient

from planner.main import app

TRIP = {
    "origin": {"lat": 47.6062, "lon": -122.3321, "name": "Downtown"},
    "destination": {"lat": 47.6740, "lon": -122.1215, "name": "Redmond"},
    "when": "2026-10-28T08:00:00",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def plan(client, modes, **prefs):
    r = client.post("/v1/plan", json={**TRIP, "modes": modes, "prefs": prefs})
    assert r.status_code == 200, r.text
    return r.json()["itineraries"]


def test_only_selected_modes_returned(client):
    for it in plan(client, ["WALK", "TRANSIT", "CAR"]):
        assert set(it["mode_sequence"]) <= {"WALK", "TRANSIT", "CAR"}


def test_fastest_and_cheapest_labels_are_correct(client):
    its = plan(client, ["WALK", "TRANSIT", "CAR", "TAXI", "BIKE", "SCOOTER"], max_walk_m=50_000)
    fastest = next(i for i in its if "Fastest" in i["labels"])
    cheapest = next(i for i in its if "Cheapest" in i["labels"])
    assert all(fastest["duration_s"] <= i["duration_s"] for i in its)
    assert all(cheapest["total_cost"] <= i["total_cost"] for i in its)


def test_adding_car_offers_park_and_ride_or_drive(client):
    without = plan(client, ["WALK", "TRANSIT"])
    with_car = plan(client, ["WALK", "TRANSIT", "CAR"])
    assert not any("CAR" in i["mode_sequence"] for i in without)
    assert any("CAR" in i["mode_sequence"] for i in with_car)


def test_taxi_transit_stitched(client):
    its = plan(client, ["TRANSIT", "TAXI"], max_walk_m=50_000)
    assert any(i["template"].startswith("TAXI+TRANSIT") or i["template"].endswith("+TAXI") for i in its)


def test_rejects_empty_modes(client):
    r = client.post("/v1/plan", json={**TRIP, "modes": []})
    assert r.status_code == 422
