import { formatDuration, stripSegments, type Itinerary } from "@mmr/shared";

// Horizontal bar, one segment per leg, sized by time. Modes are distinguished
// by fill pattern (see .seg[data-mode] in styles.css) and a text label.
export default function TripStrip({ itinerary }: { itinerary: Itinerary }) {
  const segments = stripSegments(itinerary);
  const description = itinerary.legs.map((leg, i) => `${segments[i].label} ${formatDuration(leg.duration_s)}`).join(", then ");

  return (
    <span className="strip" role="img" aria-label={description}>
      {segments.map((s, i) => (
        <span key={i} className="seg" data-mode={s.mode} style={{ flexGrow: s.fraction }}>
          {s.fraction >= 0.14 && <span className="seg-label">{s.label}</span>}
        </span>
      ))}
    </span>
  );
}
