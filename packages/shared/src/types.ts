// Mirrors the planner's pydantic models (services/planner/planner/main.py).
// TODO: generate from /openapi.json with openapi-typescript once the API settles.

export type Mode = "WALK" | "BIKE" | "SCOOTER" | "CAR" | "TAXI" | "TRANSIT";

export interface Place {
  lat: number;
  lon: number;
  name: string;
}

export interface Prefs {
  value_of_time_per_hour: number;
  transfer_penalty: number;
  max_walk_m: number;
  max_transfers: number;
  has_bike: boolean;
  stay_hours: number;
}

export interface PlanRequest {
  origin: Place;
  destination: Place;
  when?: string;
  arrive_by?: boolean;
  modes: Mode[];
  prefs?: Partial<Prefs>;
}

export interface Leg {
  mode: Mode;
  start: string;
  end: string;
  duration_s: number;
  distance_m: number;
  origin: Place;
  destination: Place;
  polyline: string;
  route_name: string | null;
  rented: boolean;
  cost: number;
}

export interface Itinerary {
  id: string;
  template: string;
  labels: string[];
  start: string;
  end: string;
  duration_s: number;
  total_cost: number;
  estimated_cost: boolean;
  currency: string;
  transfers: number;
  walk_m: number;
  co2_g: number;
  mode_sequence: Mode[];
  legs: Leg[];
}

export interface City {
  name: string;
  currency: string;
  bbox: [number, number, number, number];
  center: [number, number];
  modes: Mode[];
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
}
