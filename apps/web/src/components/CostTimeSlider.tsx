import { formatMoney } from "@mmr/shared";

interface Props {
  value: number; // value of time, money per hour
  onChange: (v: number) => void;
  currency: string;
}

export default function CostTimeSlider({ value, onChange, currency }: Props) {
  return (
    <div className="slider">
      <div className="slider-labels">
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
        aria-label="Trade money for time"
      />
      <small>An hour saved is worth {formatMoney(value, currency)} to me</small>
    </div>
  );
}
