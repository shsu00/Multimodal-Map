import type { GeocodeResult, Place } from "@mmr/shared";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { api } from "../api";

interface Props {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
}

// Combobox with listbox popup (WAI-ARIA APG pattern): arrows move, Enter picks, Escape closes.
export default function PlaceSearch({ label, value, onChange }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState(value?.name ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);

  // Keep the box in sync when the place is set elsewhere (map click, location).
  useEffect(() => {
    if (value) setText(value.name);
  }, [value]);

  useEffect(() => {
    if (!open || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .geocode(text)
        .then((s) => {
          setSuggestions(s);
          setActive(-1);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [text, open]);

  function choose(s: GeocodeResult) {
    onChange(s);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const expanded = open && suggestions.length > 0;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      if (expanded) setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && expanded) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the form
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current location" });
      },
      () => setLocating(false),
    );
  }

  const expanded = open && suggestions.length > 0;

  return (
    <div className="field place">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="field-body">
        <div className="place-input">
          <input
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
            value={text}
            placeholder="Address, place, or click the map"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
          />
          {label === "From" && (
            <button type="button" className="text-button caps" onClick={locate} disabled={locating}>
              {locating ? "Locating…" : "Use location"}
            </button>
          )}
        </div>
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="suggestions" hidden={!expanded}>
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lon}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus; avoid blur closing the list first
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
