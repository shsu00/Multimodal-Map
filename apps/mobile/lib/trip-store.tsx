import type { Itinerary, Mode, Place } from "@mmr/shared";
import { createContext, useContext, useState, type ReactNode } from "react";

// Search inputs and results, shared across the search → results → trip screens.
interface TripState {
  origin: Place | null;
  setOrigin: (p: Place | null) => void;
  destination: Place | null;
  setDestination: (p: Place | null) => void;
  modes: Set<Mode>;
  setModes: (m: Set<Mode>) => void;
  hasBike: boolean;
  setHasBike: (b: boolean) => void;
  arriveBy: boolean;
  setArriveBy: (b: boolean) => void;
  valueOfTime: number;
  setValueOfTime: (v: number) => void;
  results: Itinerary[];
  setResults: (its: Itinerary[]) => void;
}

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [modes, setModes] = useState<Set<Mode>>(new Set(["WALK", "TRANSIT", "CAR"]));
  const [hasBike, setHasBike] = useState(false);
  const [arriveBy, setArriveBy] = useState(false);
  const [valueOfTime, setValueOfTime] = useState(15);
  const [results, setResults] = useState<Itinerary[]>([]);

  return (
    <TripContext.Provider
      value={{
        origin,
        setOrigin,
        destination,
        setDestination,
        modes,
        setModes,
        hasBike,
        setHasBike,
        arriveBy,
        setArriveBy,
        valueOfTime,
        setValueOfTime,
        results,
        setResults,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip(): TripState {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside TripProvider");
  return ctx;
}
