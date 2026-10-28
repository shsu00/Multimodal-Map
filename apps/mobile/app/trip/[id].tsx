import { formatDistance, formatDuration, formatMoney, formatTime, MODE_COLOR, MODE_EMOJI, MODE_LABEL } from "@mmr/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TripMap from "../../components/TripMap";
import { useTheme } from "../../lib/theme";
import { useTrip } from "../../lib/trip-store";

export default function TripScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const it = useTrip().results.find((r) => r.id === id);

  if (!it) return <Text style={{ color: theme.text, padding: 16 }}>Trip not found.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${formatDuration(it.duration_s)} · ${formatMoney(it.total_cost, it.currency)}` }} />
      <TripMap itinerary={it} />
      <ScrollView contentContainerStyle={styles.legs}>
        {it.legs.map((leg, i) => (
          <View key={i} style={[styles.leg, { borderLeftColor: MODE_COLOR[leg.mode] }]}>
            <Text style={[styles.legTitle, { color: theme.text }]}>
              {MODE_EMOJI[leg.mode]} {MODE_LABEL[leg.mode]}
              {leg.route_name ? ` · ${leg.route_name}` : ""}
              {leg.rented ? " (rental)" : ""}
            </Text>
            <Text style={{ color: theme.muted }}>
              {formatTime(leg.start)} · {formatDuration(leg.duration_s)} · {formatDistance(leg.distance_m)}
              {leg.cost > 0 ? ` · ${formatMoney(leg.cost, it.currency)}` : ""}
            </Text>
            <Text style={{ color: theme.muted }}>to {leg.destination.name || "next stop"}</Text>
          </View>
        ))}
        {it.estimated_cost && (
          <Text style={{ color: theme.muted, fontSize: 12 }}>Car and taxi costs are estimates.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  legs: { padding: 16, gap: 12 },
  leg: { borderLeftWidth: 4, paddingLeft: 10, gap: 2 },
  legTitle: { fontWeight: "600" },
});
