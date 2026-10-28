import { decodePolyline, MODE_COLOR, type Itinerary, type Place } from "@mmr/shared";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";

// Free vector tiles, no API key needed.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [-122.3321, 47.6062];

interface Props {
  origin: Place | null;
  destination: Place | null;
  itinerary: Itinerary | null;
  onMapClick: (p: Place) => void;
}

function legsGeoJSON(it: Itinerary | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (it?.legs ?? []).map((leg) => ({
      type: "Feature",
      properties: { mode: leg.mode, color: MODE_COLOR[leg.mode] },
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

export default function MapView({ origin, destination, itinerary, onMapClick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    const m = new maplibregl.Map({ container: container.current!, style: STYLE_URL, center: DEFAULT_CENTER, zoom: 11 });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("load", () => {
      m.addSource("route", { type: "geojson", data: legsGeoJSON(null) });
      m.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        paint: { "line-color": "#ffffff", "line-width": 8 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      m.addLayer({
        id: "route-solid",
        type: "line",
        source: "route",
        filter: ["!=", ["get", "mode"], "WALK"],
        paint: { "line-color": ["get", "color"], "line-width": 5 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      m.addLayer({
        id: "route-walk",
        type: "line",
        source: "route",
        filter: ["==", ["get", "mode"], "WALK"],
        paint: { "line-color": ["get", "color"], "line-width": 4, "line-dasharray": [1, 1.5] },
      });
    });
    m.on("click", (e) => clickRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng, name: "Dropped pin" }));
    map.current = m;
    return () => m.remove();
  }, []);

  // Origin / destination markers
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [
      origin && new maplibregl.Marker({ color: "#16a34a" }).setLngLat([origin.lon, origin.lat]).addTo(m),
      destination && new maplibregl.Marker({ color: "#dc2626" }).setLngLat([destination.lon, destination.lat]).addTo(m),
    ].filter((x): x is maplibregl.Marker => x !== null);
  }, [origin, destination]);

  // Selected itinerary
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      const data = legsGeoJSON(itinerary);
      (m.getSource("route") as GeoJSONSource | undefined)?.setData(data);
      const coords = data.features.flatMap((f) => (f.geometry as GeoJSON.LineString).coordinates);
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
        );
        m.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    };
    if (m.isStyleLoaded() && m.getSource("route")) draw();
    else m.once("load", draw);
  }, [itinerary]);

  return <div ref={container} className="map-canvas" />;
}
