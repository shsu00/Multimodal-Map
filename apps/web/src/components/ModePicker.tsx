import { ALL_MODES, MODE_EMOJI, MODE_LABEL, type Mode } from "@mmr/shared";

interface Props {
  value: Set<Mode>;
  onChange: (modes: Set<Mode>) => void;
}

export default function ModePicker({ value, onChange }: Props) {
  function toggle(m: Mode) {
    const next = new Set(value);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(next);
  }

  return (
    <div className="modes" role="group" aria-label="Transport modes">
      {ALL_MODES.map((m) => (
        <button key={m} type="button" className="chip" aria-pressed={value.has(m)} onClick={() => toggle(m)}>
          {MODE_EMOJI[m]} {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}
