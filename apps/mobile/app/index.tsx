import { ALL_MODES } from "@mmr/shared";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Field from "../components/Field";
import ModeChips, { Checkbox } from "../components/ModeChips";
import PlaceInput from "../components/PlaceInput";
import { api } from "../lib/api";
import { caps, font, space, type, useTheme } from "../lib/theme";
import { useTrip } from "../lib/trip-store";

export default function SearchScreen() {
  const theme = useTheme();
  const trip = useTrip();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !trip.origin
    ? "a start point"
    : !trip.destination
      ? "a destination"
      : trip.modes.size === 0
        ? "a mode"
        : null;

  async function locate() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission was denied.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      trip.setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current location" });
    } finally {
      setLocating(false);
    }
  }

  async function plan() {
    if (!trip.origin || !trip.destination || missing) return;
    setLoading(true);
    setError(null);
    try {
      const its = await api.plan({
        origin: trip.origin,
        destination: trip.destination,
        modes: ALL_MODES.filter((m) => trip.modes.has(m)),
        prefs: { value_of_time_per_hour: trip.valueOfTime, has_bike: trip.hasBike },
      });
      trip.setResults(its);
      if (its.length === 0) setError("No routes with these modes. Try allowing more.");
      else router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const disabled = !!missing || loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.masthead}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.fg }]}>
            Multimodal
          </Text>
          <Text style={[caps, { color: theme.muted }]}>Seattle · time against money</Text>
        </View>

        <View style={styles.form}>
          <PlaceInput
            label="From"
            value={trip.origin}
            onChange={trip.setOrigin}
            accessory={
              <Pressable accessibilityRole="button" onPress={locate} disabled={locating} hitSlop={space.s2}>
                {({ pressed }) => (
                  <Text
                    style={[
                      caps,
                      styles.textButton,
                      { color: locating ? theme.muted : pressed ? theme.accent : theme.fg, textDecorationLine: locating ? "none" : "underline" },
                    ]}
                  >
                    {locating ? "Locating…" : "Use location"}
                  </Text>
                )}
              </Pressable>
            }
          />
          <PlaceInput label="To" value={trip.destination} onChange={trip.setDestination} />

          {/* TODO: date/time picker; until then trips leave now */}
          <Field label="When">
            <Text style={[styles.when, { color: theme.fg }]}>Leaving now</Text>
          </Field>

          <Field label="Modes">
            <ModeChips value={trip.modes} onChange={trip.setModes} />
            {trip.modes.has("BIKE") && (
              <View style={{ marginTop: space.s3 }}>
                <Checkbox label="I'm bringing my own bike" checked={trip.hasBike} onPress={() => trip.setHasBike(!trip.hasBike)} />
              </View>
            )}
          </Field>

          <Field label="">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, busy: loading }}
              disabled={disabled}
              onPress={plan}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.cta,
                    { backgroundColor: disabled ? theme.rule : pressed ? theme.accent : theme.fg },
                    pressed && { transform: [{ translateY: 1 }] },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.bg} />
                  ) : (
                    <>
                      <Text style={[styles.ctaText, { color: disabled ? theme.muted : pressed ? theme.onAccent : theme.bg }]}>
                        Find routes
                      </Text>
                      {!disabled && <Text style={[styles.ctaText, { color: pressed ? theme.onAccent : theme.bg }]}>→</Text>}
                    </>
                  )}
                </View>
              )}
            </Pressable>
            {missing && !loading && <Text style={[styles.hint, { color: theme.muted }]}>Choose {missing} to continue.</Text>}
            {error && (
              <Text accessibilityRole="alert" style={[styles.error, { color: theme.accent }]}>
                Error — {error}
              </Text>
            )}
          </Field>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.s4, paddingTop: space.s6, paddingBottom: space.s12, gap: space.s8 },
  masthead: { gap: space.s1 },
  title: { fontFamily: font.display, fontSize: type.xl, lineHeight: 48, letterSpacing: -0.4 },
  form: { gap: space.s4 },
  textButton: { paddingBottom: space.s2 },
  when: { fontFamily: font.text, fontSize: type.m, lineHeight: 24, paddingVertical: space.s2 },
  hint: { fontFamily: font.text, fontSize: type.s, lineHeight: 20, marginTop: space.s2 },
  cta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
    minHeight: 48,
    marginTop: space.s2,
  },
  ctaText: { fontFamily: font.textBold, fontSize: type.m, lineHeight: 24 },
  error: { fontFamily: font.textMedium, fontSize: type.s, lineHeight: 20, marginTop: space.s2 },
});
