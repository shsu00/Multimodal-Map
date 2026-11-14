import { formatDistance, formatMoney, formatTime, type Itinerary } from "@mmr/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { caps, font, space, type, useTheme } from "../lib/theme";
import TripStrip from "./TripStrip";

interface Props {
  itinerary: Itinerary;
  onPress: () => void;
}

function durationParts(seconds: number): [string, string] {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return [String(mins), "min"];
  return [`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`, "h"];
}

export default function ItineraryRow({ itinerary: it, onPress }: Props) {
  const theme = useTheme();
  const [num, unit] = durationParts(it.duration_s);
  const cost = `${it.estimated_cost ? "~" : ""}${formatMoney(it.total_cost, it.currency)}`;
  const transfers = `${it.transfers} ${it.transfers === 1 ? "transfer" : "transfers"}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Shows the steps and map for this route"
      accessibilityLabel={`${num} ${unit === "min" ? "minutes" : "hours"}, ${cost}${it.labels.length ? `, ${it.labels.join(", ")}` : ""}`}
    >
      {({ pressed }) => (
        <View style={[styles.row, { borderLeftColor: pressed ? theme.accent : "transparent" }]}>
          <View style={styles.top}>
            <Text style={[styles.duration, { color: theme.fg }]}>
              {num}
              <Text style={styles.unit}> {unit}</Text>
            </Text>
            <Text style={[styles.cost, { color: theme.fg }]}>{cost}</Text>
            {it.labels.length > 0 && (
              <Text style={[caps, styles.tags, { color: theme.accent }]}>{it.labels.join(" · ")}</Text>
            )}
          </View>
          <TripStrip itinerary={it} />
          <Text style={[styles.meta, { color: theme.muted }]}>
            {formatTime(it.start)}–{formatTime(it.end)} · {transfers}
            {it.walk_m > 0 ? ` · ${formatDistance(it.walk_m)} walk` : ""}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.s2, paddingVertical: space.s2, paddingLeft: space.s3, borderLeftWidth: 4, marginLeft: -space.s4 },
  top: { flexDirection: "row", alignItems: "baseline", gap: space.s4, flexWrap: "wrap" },
  duration: { fontFamily: font.numMedium, fontSize: type.l, lineHeight: 32, letterSpacing: -0.5 },
  unit: { fontFamily: font.num, fontSize: type.s, letterSpacing: 0 },
  cost: { fontFamily: font.num, fontSize: type.m },
  tags: { marginLeft: "auto" },
  meta: { fontFamily: font.num, fontSize: type.xs, lineHeight: 16 },
});
