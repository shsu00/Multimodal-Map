import { ALL_MODES } from "@mmr/shared";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import ModeChips from "../components/ModeChips";
import PlaceInput from "../components/PlaceInput";
import { api } from "../lib/api";
import { useTheme } from "../lib/theme";
import { useTrip } from "../lib/trip-store";

export default function SearchScreen() {
  const theme = useTheme();
  const trip = useTrip();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission denied.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    trip.setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "My location" });
  }

  async function plan() {
    if (!trip.origin || !trip.destination) return;
    setLoading(true);
    setError(null);
    try {
      const its = await api.plan({
        origin: trip.origin,
        destination: trip.destination,
        arrive_by: trip.arriveBy,
        modes: ALL_MODES.filter((m) => trip.modes.has(m)),
        prefs: { value_of_time_per_hour: trip.valueOfTime, has_bike: trip.hasBike },
      });
      trip.setResults(its);
      if (its.length === 0) setError("No routes found with those modes. Try allowing more.");
      else router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const canPlan = trip.origin && trip.destination && trip.modes.size > 0 && !loading;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PlaceInput label="From" value={trip.origin} onChange={trip.setOrigin} />
      <Pressable onPress={useMyLocation}>
        <Text style={[styles.link, { color: theme.accent }]}>◎ Use my location</Text>
      </Pressable>
      <PlaceInput label="To" value={trip.destination} onChange={trip.setDestination} />

      <View style={styles.switchRow}>
        <Text style={{ color: theme.text }}>{trip.arriveBy ? "Arrive by now" : "Leave now"}</Text>
        <Switch value={trip.arriveBy} onValueChange={trip.setArriveBy} />
      </View>

      <Text style={[styles.heading, { color: theme.muted }]}>How can you travel?</Text>
      <ModeChips value={trip.modes} onChange={trip.setModes} />
      {trip.modes.has("BIKE") && (
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text }}>I have my own bike</Text>
          <Switch value={trip.hasBike} onValueChange={trip.setHasBike} />
        </View>
      )}

      <Pressable
        style={[styles.button, { backgroundColor: theme.accent, opacity: canPlan ? 1 : 0.5 }]}
        disabled={!canPlan}
        onPress={plan}
      >
        {loading ? (
          <ActivityIndicator color={theme.accentText} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.accentText }]}>Find routes</Text>
        )}
      </Pressable>
      {error && <Text style={{ color: theme.error }}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 13, marginTop: 8 },
  link: { fontSize: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { fontWeight: "600", fontSize: 16 },
});
