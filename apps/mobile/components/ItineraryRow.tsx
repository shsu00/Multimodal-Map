import { formatDuration, formatMoney, formatTime, MODE_COLOR, MODE_EMOJI, type Itinerary } from "@mmr/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

interface Props {
  itinerary: Itinerary;
  onPress: () => void;
}

export default function ItineraryRow({ itinerary: it, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.sequence}>
          {it.mode_sequence.map((m, i) => (
            <Text key={i} style={[styles.pill, { borderColor: MODE_COLOR[m] }]}>
              {MODE_EMOJI[m]}
            </Text>
          ))}
        </View>
        <View style={styles.labels}>
          {it.labels.map((l) => (
            <Text key={l} style={[styles.label, { backgroundColor: theme.accent, color: theme.accentText }]}>
              {l}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.big, { color: theme.text }]}>{formatDuration(it.duration_s)}</Text>
        <Text style={[styles.big, { color: theme.text }]}>
          {it.estimated_cost ? "~" : ""}
          {formatMoney(it.total_cost, it.currency)}
        </Text>
      </View>
      <Text style={{ color: theme.muted }}>
        {formatTime(it.start)} – {formatTime(it.end)} · {it.transfers} transfers
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  sequence: { flexDirection: "row", gap: 4 },
  pill: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 6, overflow: "hidden" },
  labels: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  label: { fontSize: 11, fontWeight: "600", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: "hidden" },
  stats: { flexDirection: "row", gap: 16 },
  big: { fontSize: 18, fontWeight: "600" },
});
