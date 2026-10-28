import { decodePolyline, MODE_COLOR, type Itinerary } from "@mmr/shared";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface Props {
  itinerary: Itinerary;
}

export default function TripMap({ itinerary }: Props) {
  const map = useRef<MapView>(null);

  const lines = useMemo(
    () =>
      itinerary.legs.map((leg) => {
        const pts = leg.polyline
          ? decodePolyline(leg.polyline)
          : [
              [leg.origin.lon, leg.origin.lat] as [number, number],
              [leg.destination.lon, leg.destination.lat] as [number, number],
            ];
        return { mode: leg.mode, coords: pts.map(([lon, lat]) => ({ latitude: lat, longitude: lon })) };
      }),
    [itinerary],
  );

  useEffect(() => {
    const all = lines.flatMap((l) => l.coords);
    if (all.length > 1) {
      // Wait a tick so the map has a size before fitting.
      setTimeout(() => map.current?.fitToCoordinates(all, { edgePadding: { top: 40, bottom: 40, left: 40, right: 40 } }), 100);
    }
  }, [lines]);

  const first = itinerary.legs[0].origin;
  const last = itinerary.legs[itinerary.legs.length - 1].destination;

  return (
    <MapView
      ref={map}
      style={styles.map}
      initialRegion={{ latitude: first.lat, longitude: first.lon, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
    >
      {lines.map((l, i) => (
        <Polyline
          key={i}
          coordinates={l.coords}
          strokeColor={MODE_COLOR[l.mode]}
          strokeWidth={5}
          lineDashPattern={l.mode === "WALK" ? [4, 6] : undefined}
        />
      ))}
      <Marker coordinate={{ latitude: first.lat, longitude: first.lon }} pinColor="green" title="Start" />
      <Marker coordinate={{ latitude: last.lat, longitude: last.lon }} pinColor="red" title="End" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: "45%", width: "100%" },
});
