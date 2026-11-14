import { ALL_MODES, MODE_LABEL, type Mode } from "@mmr/shared";

interface Props {
  value: Set<Mode>;
  onChange: (modes: Set<Mode>) => void;
  hasBike: boolean;
  onHasBikeChange: (b: boolean) => void;
}

export default function ModePicker({ value, onChange, hasBike, onHasBikeChange }: Props) {
  function toggle(m: Mode) {
    const next = new Set(value);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(next);
  }

  return (
    <div className="field" role="group" aria-labelledby="modes-label">
      <span className="field-label" id="modes-label">
        Modes
      </span>
      <div className="field-body">
        <div className="modes">
          {ALL_MODES.map((m) => (
            <label key={m} className="check">
              <input type="checkbox" checked={value.has(m)} onChange={() => toggle(m)} />
              <span className="check-box" aria-hidden="true" />
              {MODE_LABEL[m]}
            </label>
          ))}
        </div>
        {value.has("BIKE") && (
          <label className="check check-sub">
            <input type="checkbox" checked={hasBike} onChange={(e) => onHasBikeChange(e.target.checked)} />
            <span className="check-box" aria-hidden="true" />
            I'm bringing my own bike
          </label>
        )}
      </div>
    </div>
  );
}
