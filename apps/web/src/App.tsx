import { ALL_MODES, rerank, type Itinerary, type Mode, type Place } from "@mmr/shared";
import { useMemo, useState } from "react";
import { api } from "./api";
import CostTimeSlider from "./components/CostTimeSlider";
import ItineraryCard from "./components/ItineraryCard";
import MapView from "./components/MapView";
import ModePicker from "./components/ModePicker";
import PlaceSearch from "./components/PlaceSearch";

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function App() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [modes, setModes] = useState<Set<Mode>>(new Set(["WALK", "TRANSIT", "CAR"]));
  const [when, setWhen] = useState(localNow);
  const [arriveBy, setArriveBy] = useState(false);
  const [hasBike, setHasBike] = useState(false);
  const [valueOfTime, setValueOfTime] = useState(15);
  const [results, setResults] = useState<Itinerary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranked = useMemo(() => rerank(results, valueOfTime), [results, valueOfTime]);
  const selected = ranked.find((it) => it.id === selectedId) ?? ranked[0] ?? null;
  const canPlan = origin && destination && modes.size > 0 && !loading;

  async function plan() {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const its = await api.plan({
        origin,
        destination,
        when,
        arrive_by: arriveBy,
        modes: ALL_MODES.filter((m) => modes.has(m)),
        prefs: { value_of_time_per_hour: valueOfTime, has_bike: hasBike },
      });
      setResults(its);
      setSelectedId(null);
      if (its.length === 0) setError("No routes found with those modes. Try allowing more.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onMapClick(p: Place) {
    if (!origin) setOrigin(p);
    else setDestination(p);
  }

  return (
    <div className="layout">
      <aside className="panel">
        <h1>Trip planner</h1>
        <PlaceSearch label="From" value={origin} onChange={setOrigin} />
        <PlaceSearch label="To" value={destination} onChange={setDestination} />

        <fieldset className="row">
          <select value={arriveBy ? "arrive" : "depart"} onChange={(e) => setArriveBy(e.target.value === "arrive")}>
            <option value="depart">Leave at</option>
            <option value="arrive">Arrive by</option>
          </select>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </fieldset>

        <ModePicker value={modes} onChange={setModes} />
        {modes.has("BIKE") && (
          <label className="check">
            <input type="checkbox" checked={hasBike} onChange={(e) => setHasBike(e.target.checked)} />I have my own bike
          </label>
        )}

        <button className="primary" disabled={!canPlan} onClick={plan}>
          {loading ? "Planning…" : "Find routes"}
        </button>

        {error && <p className="error">{error}</p>}

        {ranked.length > 0 && (
          <>
            <CostTimeSlider value={valueOfTime} onChange={setValueOfTime} currency={ranked[0].currency} />
            <ol className="results">
              {ranked.map((it) => (
                <li key={it.id}>
                  <ItineraryCard
                    itinerary={it}
                    selected={it.id === selected?.id}
                    onSelect={() => setSelectedId(it.id)}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
      <main className="map">
        <MapView origin={origin} destination={destination} itinerary={selected} onMapClick={onMapClick} />
      </main>
    </div>
  );
}
