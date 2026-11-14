import type { Itinerary } from "./types";

// Same formula as services/planner/planner/pareto.py, so the cheap ↔ fast
// slider can re-rank results without another API call.
export function score(it: Itinerary, valueOfTimePerHour: number, transferPenalty = 1): number {
  return it.total_cost + valueOfTimePerHour * (it.duration_s / 3600) + transferPenalty * it.transfers;
}

export const BEST_BALANCE = "Best balance";

export function rerank(its: Itinerary[], valueOfTimePerHour: number, transferPenalty = 1): Itinerary[] {
  if (its.length === 0) return [];
  const sorted = [...its].sort(
    (a, b) => score(a, valueOfTimePerHour, transferPenalty) - score(b, valueOfTimePerHour, transferPenalty),
  );
  return sorted.map((it, i) => {
    const labels = it.labels.filter((l) => l !== BEST_BALANCE);
    return { ...it, labels: i === 0 ? [...labels, BEST_BALANCE] : labels };
  });
}
