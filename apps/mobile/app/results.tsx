import { formatMoney, rerank } from "@mmr/shared";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import ItineraryRow from "../components/ItineraryRow";
import { caps, font, space, type, useTheme } from "../lib/theme";
import { useTrip } from "../lib/trip-store";

export default function ResultsScreen() {
  const theme = useTheme();
  const { results, valueOfTime, setValueOfTime } = useTrip();
  const ranked = useMemo(() => rerank(results, valueOfTime), [results, valueOfTime]);
  const money = formatMoney(valueOfTime, ranked[0]?.currency ?? "USD");

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={ranked}
      keyExtractor={(it) => it.id}
      ListHeaderComponent={
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[caps, { color: theme.fg }]}>
            {ranked.length} {ranked.length === 1 ? "route" : "routes"}
          </Text>
          <View style={styles.ends}>
            <Text style={[caps, { color: theme.muted }]}>Cheaper</Text>
            <Text style={[caps, { color: theme.muted }]}>Faster</Text>
          </View>
          <Slider
            accessibilityLabel="How much an hour of your time is worth"
            accessibilityValue={{ text: `${money} per hour` }}
            minimumValue={0}
            maximumValue={60}
            step={1}
            value={valueOfTime}
            onValueChange={setValueOfTime}
            minimumTrackTintColor={theme.fg}
            maximumTrackTintColor={theme.rule}
            thumbTintColor={theme.fg}
          />
          <Text style={[styles.readout, { color: theme.muted }]}>
            An hour of my time is worth <Text style={[styles.num, { color: theme.fg }]}>{money}</Text>
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ItineraryRow itinerary={item} onPress={() => router.push(`/trip/${encodeURIComponent(item.id)}`)} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: space.s6 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.s4, paddingTop: space.s4, paddingBottom: space.s12 },
  head: { gap: space.s2, marginBottom: space.s8 },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: space.s2 },
  readout: { fontFamily: font.text, fontSize: type.s, lineHeight: 20 },
  num: { fontFamily: font.num },
});
