import { formatDistance, formatDuration, formatMoney, formatTime, MODE_LABEL, type Itinerary } from "@mmr/shared";

// Vertical strip map of the selected trip: time | rail | what to do.
export default function LegList({ itinerary: it }: { itinerary: Itinerary }) {
  const last = it.legs[it.legs.length - 1];
  return (
    <ol className="legs" aria-label="Trip steps">
      {it.legs.map((leg, i) => (
        <li key={i} className="leg" data-mode={leg.mode}>
          <span className="leg-time num">{formatTime(leg.start)}</span>
          <span className="leg-rail" aria-hidden="true" />
          <div className="leg-body">
            <p className="leg-title">
              {leg.mode === "TRANSIT" && leg.route_name ? leg.route_name : MODE_LABEL[leg.mode]}
              {leg.rented && <span className="muted"> · rental</span>}
            </p>
            <p className="leg-meta muted">
              <span className="num">{formatDuration(leg.duration_s)}</span> ·{" "}
              <span className="num">{formatDistance(leg.distance_m)}</span>
              {leg.cost > 0 && (
                <>
                  {" "}
                  · <span className="num">{formatMoney(leg.cost, it.currency)}</span>
                </>
              )}
            </p>
            <p className="leg-to muted">to {leg.destination.name || "next stop"}</p>
          </div>
        </li>
      ))}
      <li className="leg leg-end">
        <span className="leg-time num">{formatTime(it.end)}</span>
        <span className="leg-rail" aria-hidden="true" />
        <div className="leg-body">
          <p className="leg-title">Arrive{last.destination.name ? ` · ${last.destination.name}` : ""}</p>
          {it.estimated_cost && <p className="leg-meta muted">Car and taxi costs are estimates.</p>}
        </div>
      </li>
    </ol>
  );
}
