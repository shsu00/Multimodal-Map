import { formatMoney } from "@mmr/shared";

interface Props {
  value: number; // value of time, money per hour
  onChange: (v: number) => void;
  currency: string;
}

export default function CostTimeSlider({ value, onChange, currency }: Props) {
  const money = formatMoney(value, currency);
  return (
    <div className="tradeoff">
      <div className="tradeoff-ends caps muted" aria-hidden="true">
        <span>Cheaper</span>
        <span>Faster</span>
      </div>
      <input
        type="range"
        min={0}
        max={60}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="How much an hour of your time is worth"
        aria-valuetext={`${money} per hour`}
      />
      <p className="tradeoff-readout">
        An hour of my time is worth <span className="num">{money}</span>
      </p>
    </div>
  );
}
