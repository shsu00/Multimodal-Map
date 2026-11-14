import { formatDistance, formatDuration, formatMoney, formatTime, MODE_LABEL, type Mode } from "@mmr/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TripMap from "../../components/TripMap";
import { font, LABEL_COL, space, type, useTheme } from "../../lib/theme";
import { useTrip } from "../../lib/trip-store";

// Rail weight per mode (RN can't dash a single border side reliably).
const RAIL_WIDTH: Record<Mode, number> = { TRANSIT: 6, CAR: 3, TAXI: 3, BIKE: 2, SCOOTER: 2, WALK: 1 };

export default function TripScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const it = useTrip().results.find((r) => r.id === id);

  if (!it) return <Text style={[styles.title, { color: theme.fg, padding: space.s4 }]}>Trip not found.</Text>;
  const last = it.legs[it.legs.length - 1];

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${formatDuration(it.duration_s)} · ${formatMoney(it.total_cost, it.currency)}` }} />
      <TripMap itinerary={it} />
      <ScrollView contentContainerStyle={styles.legs} accessibilityLabel="Trip steps">
        {it.legs.map((leg, i) => (
          <View key={i} style={styles.leg}>
            <Text style={[styles.time, { color: theme.fg }]}>{formatTime(leg.start)}</Text>
            <View style={styles.rail}>
              <View style={[styles.line, { width: RAIL_WIDTH[leg.mode], backgroundColor: theme.fg }]} />
              <View style={[styles.stop, { borderColor: theme.fg, backgroundColor: theme.bg }]} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: theme.fg }]}>
                {leg.mode === "TRANSIT" && leg.route_name ? leg.route_name : MODE_LABEL[leg.mode]}
                {leg.rented ? <Text style={{ color: theme.muted }}> · rental</Text> : null}
              </Text>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {formatDuration(leg.duration_s)} · {formatDistance(leg.distance_m)}
                {leg.cost > 0 ? ` · ${formatMoney(leg.cost, it.currency)}` : ""}
              </Text>
              <Text style={[styles.meta, { color: theme.muted }]}>to {leg.destination.name || "next stop"}</Text>
            </View>
          </View>
        ))}
        <View style={styles.leg}>
          <Text style={[styles.time, { color: theme.fg }]}>{formatTime(it.end)}</Text>
          <View style={styles.rail}>
            <View style={[styles.stop, styles.end, { backgroundColor: theme.accent, borderColor: theme.accent }]} />
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.fg }]}>Arrive{last.destination.name ? ` · ${last.destination.name}` : ""}</Text>
            {it.estimated_cost && <Text style={[styles.meta, { color: theme.muted }]}>Car and taxi costs are estimates.</Text>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  legs: { paddingHorizontal: space.s4, paddingTop: space.s6, paddingBottom: space.s12 },
  leg: { flexDirection: "row", gap: space.s3 },
  time: { width: LABEL_COL, textAlign: "right", fontFamily: font.num, fontSize: type.xs, lineHeight: 20 },
  rail: { width: 16, alignItems: "center" },
  line: { position: "absolute", top: 10, bottom: -10 },
  stop: { marginTop: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  end: { borderRadius: 0 },
  body: { flex: 1, paddingBottom: space.s4 },
  title: { fontFamily: font.textBold, fontSize: type.m, lineHeight: 20 },
  meta: { fontFamily: font.num, fontSize: type.xs, lineHeight: 16 },
});
