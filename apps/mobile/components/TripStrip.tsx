import { formatDuration, stripSegments, type Itinerary, type Mode } from "@mmr/shared";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { font, space, type, useTheme, type Theme } from "../lib/theme";

// One segment per leg, sized by time. React Native has no CSS patterns, so
// modes are told apart by fill vs outline style plus a text label.
function segmentStyle(mode: Mode, theme: Theme): ViewStyle {
  switch (mode) {
    case "TRANSIT":
      return { backgroundColor: theme.fg };
    case "CAR":
      return { borderWidth: 2, borderColor: theme.fg };
    case "TAXI":
      return { borderWidth: 2, borderColor: theme.fg, borderStyle: "dashed" };
    case "BIKE":
    case "SCOOTER":
      return { borderWidth: 2, borderColor: theme.fg, borderStyle: "dotted" };
    case "WALK":
      return {};
  }
}

export default function TripStrip({ itinerary }: { itinerary: Itinerary }) {
  const theme = useTheme();
  const segments = stripSegments(itinerary);
  const description = itinerary.legs.map((leg, i) => `${segments[i].label} ${formatDuration(leg.duration_s)}`).join(", then ");

  return (
    <View style={styles.strip} accessible accessibilityRole="image" accessibilityLabel={description}>
      {segments.map((s, i) => (
        <View key={i} style={[styles.seg, { flexGrow: s.fraction }, segmentStyle(s.mode, theme)]}>
          {s.mode === "WALK" && <View style={[styles.walkLine, { backgroundColor: theme.fg }]} />}
          {s.fraction >= 0.18 && (
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                s.mode === "TRANSIT"
                  ? { color: theme.bg }
                  : { color: theme.fg, backgroundColor: theme.bg, paddingHorizontal: space.s1 },
              ]}
            >
              {s.label.toUpperCase()}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", gap: 2, height: 20 },
  seg: { flexBasis: 0, minWidth: 6, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  walkLine: { position: "absolute", left: 0, right: 0, height: 1 },
  label: { fontFamily: font.num, fontSize: type.xs, lineHeight: 16 },
});
