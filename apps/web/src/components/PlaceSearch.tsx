import type { GeocodeResult, Place } from "@mmr/shared";
import { useEffect, useId, useState } from "react";
import { api } from "../api";

interface Props {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
}

export default function PlaceSearch({ label, value, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.name ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);

  // Keep the box in sync when the place is set elsewhere (map click, "my location").
  useEffect(() => {
    if (value) setText(value.name);
  }, [value]);

  useEffect(() => {
    if (!open || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      api.geocode(text).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [text, open]);

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) =>
      onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "My location" }),
    );
  }

  return (
    <div className="place">
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <input
          id={id}
          value={text}
          placeholder="Search address or click the map"
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <button type="button" title="Use my location" onClick={useMyLocation}>
          ◎
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
