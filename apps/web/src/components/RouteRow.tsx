import { formatDistance, formatMoney, formatTime, type Itinerary } from "@mmr/shared";
import TripStrip from "./TripStrip";

interface Props {
  itinerary: Itinerary;
  selected: boolean;
  onSelect: () => void;
}

function durationParts(seconds: number): [string, string] {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return [String(mins), "min"];
  return [`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`, "h"];
}

export default function RouteRow({ itinerary: it, selected, onSelect }: Props) {
  const [num, unit] = durationParts(it.duration_s);
  const transfers = `${it.transfers} ${it.transfers === 1 ? "transfer" : "transfers"}`;
  return (
    <button type="button" className="route" aria-pressed={selected} onClick={onSelect}>
      <span className="route-top">
        <span className="route-duration num">
          {num}
          <span className="route-unit">{unit}</span>
        </span>
        <span className="route-cost num">
          {it.estimated_cost && <span aria-label="about">~</span>}
          {formatMoney(it.total_cost, it.currency)}
        </span>
        {it.labels.length > 0 && <span className="route-tags caps">{it.labels.join(" · ")}</span>}
      </span>
      <TripStrip itinerary={it} />
      <span className="route-meta muted">
        <span className="num">
          {formatTime(it.start)}–{formatTime(it.end)}
        </span>
        {" · "}
        {transfers}
        {it.walk_m > 0 && ` · ${formatDistance(it.walk_m)} walk`}
      </span>
    </button>
  );
}
