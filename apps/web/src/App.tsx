import { ALL_MODES, rerank, type Itinerary, type Mode, type Place } from "@mmr/shared";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "./api";
import CostTimeSlider from "./components/CostTimeSlider";
import LegList from "./components/LegList";
import MapView from "./components/MapView";
import ModePicker from "./components/ModePicker";
import PlaceSearch from "./components/PlaceSearch";
import RouteRow from "./components/RouteRow";

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
  const missing = !origin ? "a start point" : !destination ? "a destination" : modes.size === 0 ? "a mode" : null;

  async function plan(e: FormEvent) {
    e.preventDefault();
    if (!origin || !destination || missing) return;
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
      if (its.length === 0) setError("No routes with these modes. Try allowing more.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function onMapClick(p: Place) {
    if (!origin) setOrigin(p);
    else setDestination(p);
  }

  return (
    <div className="app">
      <aside className="panel">
        <header className="masthead">
          <h1>Multimodal</h1>
          <p className="caps muted">Seattle · time against money</p>
        </header>

        <form className="trip-form" onSubmit={plan} aria-label="Plan a trip">
          <PlaceSearch label="From" value={origin} onChange={setOrigin} />
          <PlaceSearch label="To" value={destination} onChange={setDestination} />

          <div className="field">
            <label className="field-label" htmlFor="when">
              When
            </label>
            <div className="field-body when">
              <span className="select">
                <select
                  aria-label="Departure or arrival"
                  value={arriveBy ? "arrive" : "depart"}
                  onChange={(e) => setArriveBy(e.target.value === "arrive")}
                >
                  <option value="depart">Leave at</option>
                  <option value="arrive">Arrive by</option>
                </select>
              </span>
              <input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>

          <ModePicker value={modes} onChange={setModes} hasBike={hasBike} onHasBikeChange={setHasBike} />

          <div className="field">
            <span className="field-label" aria-hidden="true" />
            <div className="field-body">
              <button className="cta" type="submit" disabled={!!missing || loading}>
                {loading ? "Finding routes…" : "Find routes"}
                <span aria-hidden="true">→</span>
              </button>
              {missing && !loading && <p className="hint muted">Choose {missing} to continue.</p>}
            </div>
          </div>
        </form>

        <section className="results" aria-live="polite" aria-busy={loading} aria-label="Routes">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {ranked.length > 0 && (
            <>
              <div className="results-head">
                <h2 className="caps">
                  {ranked.length} {ranked.length === 1 ? "route" : "routes"}
                </h2>
                <CostTimeSlider value={valueOfTime} onChange={setValueOfTime} currency={ranked[0].currency} />
              </div>
              <ol className="routes">
                {ranked.map((it) => (
                  <li key={it.id}>
                    <RouteRow itinerary={it} selected={it.id === selected?.id} onSelect={() => setSelectedId(it.id)} />
                    {it.id === selected?.id && <LegList itinerary={it} />}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </aside>

      <main className="map">
        <MapView origin={origin} destination={destination} itinerary={selected} onMapClick={onMapClick} />
        {(!origin || !destination) && (
          <p className="map-hint caps" aria-hidden="true">
            Click map to set <strong>{!origin ? "From" : "To"}</strong>
          </p>
        )}
      </main>
    </div>
  );
}
