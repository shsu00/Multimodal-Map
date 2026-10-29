import { decodePolyline, MODE_LINE, type Itinerary } from "@mmr/shared";
import { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTheme } from "../lib/theme";

// Grayscale Google style for Android; iOS Apple Maps uses mutedStandard.
const ANDROID_GRAY = [
  { elementType: "geometry", stylers: [{ saturation: -100 }] },
  { elementType: "labels", stylers: [{ saturation: -100 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export default function TripMap({ itinerary }: { itinerary: Itinerary }) {
  const theme = useTheme();
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
      const t = setTimeout(
        () => map.current?.fitToCoordinates(all, { edgePadding: { top: 48, bottom: 48, left: 48, right: 48 } }),
        100,
      );
      return () => clearTimeout(t);
    }
  }, [lines]);

  const first = itinerary.legs[0].origin;
  const last = itinerary.legs[itinerary.legs.length - 1].destination;

  return (
    <MapView
      ref={map}
      style={styles.map}
      mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
      customMapStyle={Platform.OS === "android" ? ANDROID_GRAY : undefined}
      showsPointsOfInterest={false}
      accessibilityLabel="Route map"
      initialRegion={{ latitude: first.lat, longitude: first.lon, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
    >
      {lines.map((l, i) => {
        const style = MODE_LINE[l.mode];
        return (
          <Polyline
            key={i}
            coordinates={l.coords}
            strokeColor={theme.fg}
            strokeWidth={style.width}
            lineDashPattern={style.dash ? style.dash.map((d) => Math.max(1, d * style.width * 2)) : undefined}
          />
        );
      })}
      <Marker coordinate={{ latitude: first.lat, longitude: first.lon }} title="Start" anchor={{ x: 0.5, y: 0.5 }}>
        <View style={[styles.origin, { borderColor: theme.fg, backgroundColor: theme.bg }]} />
      </Marker>
      <Marker coordinate={{ latitude: last.lat, longitude: last.lon }} title="Destination" anchor={{ x: 0.5, y: 0.5 }}>
        <View style={[styles.dest, { backgroundColor: theme.accent, borderColor: theme.bg }]} />
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: "45%", width: "100%" },
  origin: { width: 16, height: 16, borderRadius: 8, borderWidth: 4 },
  dest: { width: 16, height: 16, borderWidth: 2 },
});
