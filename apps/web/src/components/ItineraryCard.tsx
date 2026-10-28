import {
  formatDistance,
  formatDuration,
  formatMoney,
  formatTime,
  MODE_COLOR,
  MODE_EMOJI,
  MODE_LABEL,
  type Itinerary,
} from "@mmr/shared";

interface Props {
  itinerary: Itinerary;
  selected: boolean;
  onSelect: () => void;
}

export default function ItineraryCard({ itinerary: it, selected, onSelect }: Props) {
  return (
    <article className={`card${selected ? " selected" : ""}`} onClick={onSelect}>
      <header>
        <div className="sequence">
          {it.mode_sequence.map((m, i) => (
            <span key={i} className="mode-pill" style={{ borderColor: MODE_COLOR[m] }} title={MODE_LABEL[m]}>
              {MODE_EMOJI[m]}
            </span>
          ))}
        </div>
        <div className="labels">
          {it.labels.map((l) => (
            <span key={l} className="label">
              {l}
            </span>
          ))}
        </div>
      </header>
      <div className="stats">
        <strong>{formatDuration(it.duration_s)}</strong>
        <strong>
          {it.estimated_cost && "~"}
          {formatMoney(it.total_cost, it.currency)}
        </strong>
        <span>
          {formatTime(it.start)} – {formatTime(it.end)}
        </span>
        <span>{it.transfers} transfers</span>
      </div>
      {selected && (
        <ol className="legs">
          {it.legs.map((leg, i) => (
            <li key={i} style={{ borderLeftColor: MODE_COLOR[leg.mode] }}>
              <span>
                {MODE_EMOJI[leg.mode]} {MODE_LABEL[leg.mode]}
                {leg.route_name && ` · ${leg.route_name}`}
                {leg.rented && " (rental)"}
              </span>
              <span className="muted">
                {formatTime(leg.start)} · {formatDuration(leg.duration_s)} · {formatDistance(leg.distance_m)}
                {leg.cost > 0 && ` · ${formatMoney(leg.cost, it.currency)}`}
              </span>
              <span className="muted">to {leg.destination.name || "next stop"}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
