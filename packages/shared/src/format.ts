import type { Mode } from "./types";

export const ALL_MODES: Mode[] = ["WALK", "TRANSIT", "BIKE", "SCOOTER", "CAR", "TAXI"];

export const MODE_LABEL: Record<Mode, string> = {
  WALK: "Walk",
  BIKE: "Bike",
  SCOOTER: "Scooter",
  CAR: "Car",
  TAXI: "Taxi",
  TRANSIT: "Transit",
};

export const MODE_EMOJI: Record<Mode, string> = {
  WALK: "🚶",
  BIKE: "🚲",
  SCOOTER: "🛴",
  CAR: "🚗",
  TAXI: "🚕",
  TRANSIT: "🚆",
};

// Distinguishable on light and dark map tiles.
export const MODE_COLOR: Record<Mode, string> = {
  WALK: "#6b7280",
  BIKE: "#16a34a",
  SCOOTER: "#0d9488",
  CAR: "#dc2626",
  TAXI: "#d97706",
  TRANSIT: "#2563eb",
};

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
