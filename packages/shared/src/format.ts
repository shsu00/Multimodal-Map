import type { Itinerary, Leg, Mode } from "./types";

export const ALL_MODES: Mode[] = ["WALK", "TRANSIT", "BIKE", "SCOOTER", "CAR", "TAXI"];

export const MODE_LABEL: Record<Mode, string> = {
  WALK: "Walk",
  BIKE: "Bike",
  SCOOTER: "Scooter",
  CAR: "Car",
  TAXI: "Taxi",
  TRANSIT: "Transit",
};

// Short uppercase codes, signage-style. Modes are told apart by code and line
// pattern rather than colour, so the UI can stay inside a 3-colour palette.
export const MODE_CODE: Record<Mode, string> = {
  WALK: "WALK",
  BIKE: "BIKE",
  SCOOTER: "SCOOT",
  CAR: "CAR",
  TAXI: "TAXI",
  TRANSIT: "TRANSIT",
};

// How each mode is drawn on maps (width in px, dash pattern in line widths).
export const MODE_LINE: Record<Mode, { width: number; dash?: [number, number] }> = {
  TRANSIT: { width: 6 },
  CAR: { width: 3 },
  TAXI: { width: 3 },
  BIKE: { width: 3, dash: [2, 1] },
  SCOOTER: { width: 3, dash: [2, 1] },
  WALK: { width: 2, dash: [0.5, 1.5] },
};

/** Route name for transit legs ("1 Line", "556"), the mode code otherwise. */
export function legLabel(leg: Leg): string {
  if (leg.mode === "TRANSIT" && leg.route_name) return leg.route_name;
  return MODE_CODE[leg.mode];
}

export interface StripSegment {
  mode: Mode;
  label: string;
  fraction: number; // share of total trip time, 0..1
}

/** One segment per leg, sized by duration, for the horizontal trip strip. */
export function stripSegments(it: Itinerary): StripSegment[] {
  const total = it.legs.reduce((s, l) => s + l.duration_s, 0) || 1;
  return it.legs.map((leg) => ({ mode: leg.mode, label: legLabel(leg), fraction: leg.duration_s / total }));
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
