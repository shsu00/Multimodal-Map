import { decodePolyline, MODE_LINE, type Itinerary, type Mode, type Place } from "@mmr/shared";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";

// Grayscale basemaps so routes in ink read clearly. Free, no API key.
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const SEATTLE: [number, number] = [-122.3321, 47.6062];

interface Props {
  origin: Place | null;
  destination: Place | null;
  itinerary: Itinerary | null;
  onMapClick: (p: Place) => void;
}

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function legsGeoJSON(it: Itinerary | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (it?.legs ?? []).map((leg) => ({
      type: "Feature",
      properties: { mode: leg.mode },
      geometry: {
        type: "LineString",
        coordinates: leg.polyline
          ? decodePolyline(leg.polyline)
          : [
              [leg.origin.lon, leg.origin.lat],
              [leg.destination.lon, leg.destination.lat],
            ],
      },
    })),
  };
}

// One line layer per dash pattern; MapLibre can't vary dashes per feature.
function addRouteLayers(m: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  const ink = cssVar("--fg");
  const casing = cssVar("--bg");
  m.addSource("route", { type: "geojson", data });
  m.addLayer({
    id: "route-casing",
    type: "line",
    source: "route",
    paint: { "line-color": casing, "line-width": ["match", ["get", "mode"], "TRANSIT", 10, 7] },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  const groups = new Map<string, Mode[]>();
  for (const [mode, style] of Object.entries(MODE_LINE) as [Mode, (typeof MODE_LINE)[Mode]][]) {
    const key = style.dash ? style.dash.join(",") : "solid";
    groups.set(key, [...(groups.get(key) ?? []), mode]);
  }
  for (const [key, modes] of groups) {
    const style = MODE_LINE[modes[0]];
    m.addLayer({
      id: `route-${key}`,
      type: "line",
      source: "route",
      filter: ["in", ["get", "mode"], ["literal", modes]],
      paint: {
        "line-color": ink,
        "line-width": style.width,
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
      layout: { "line-cap": style.dash ? "round" : "butt", "line-join": "round" },
    });
  }
}

function markerEl(kind: "origin" | "destination"): HTMLElement {
  const el = document.createElement("div");
  el.className = `marker marker-${kind}`;
  el.setAttribute("aria-label", kind === "origin" ? "Start" : "Destination");
  return el;
}

export default function MapView({ origin, destination, itinerary, onMapClick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const dataRef = useRef(legsGeoJSON(null));
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    const mq = darkQuery();
    const m = new maplibregl.Map({
      container: container.current!,
      style: mq.matches ? STYLE_DARK : STYLE_LIGHT,
      center: SEATTLE,
      zoom: 11.5,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Fires on first load and after every theme switch (setStyle wipes our layers).
    m.on("style.load", () => addRouteLayers(m, dataRef.current));
    m.on("click", (e) => clickRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng, name: "Dropped pin" }));
    const onTheme = () => m.setStyle(mq.matches ? STYLE_DARK : STYLE_LIGHT);
    mq.addEventListener("change", onTheme);
    map.current = m;
    return () => {
      mq.removeEventListener("change", onTheme);
      m.remove();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    if (origin) markers.current.push(new maplibregl.Marker({ element: markerEl("origin") }).setLngLat([origin.lon, origin.lat]).addTo(m));
    if (destination)
      markers.current.push(
        new maplibregl.Marker({ element: markerEl("destination") }).setLngLat([destination.lon, destination.lat]).addTo(m),
      );
  }, [origin, destination]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    dataRef.current = legsGeoJSON(itinerary);
    (m.getSource("route") as GeoJSONSource | undefined)?.setData(dataRef.current);
    const coords = dataRef.current.features.flatMap((f) => (f.geometry as GeoJSON.LineString).coordinates);
    if (coords.length > 1) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
      );
      m.fitBounds(bounds, { padding: 64, maxZoom: 15 });
    }
  }, [itinerary]);

  return <div ref={container} className="map-canvas" role="region" aria-label="Route map" />;
}
