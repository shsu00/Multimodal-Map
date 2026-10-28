import { formatMoney, rerank } from "@mmr/shared";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import ItineraryRow from "../components/ItineraryRow";
import { useTheme } from "../lib/theme";
import { useTrip } from "../lib/trip-store";

export default function ResultsScreen() {
  const theme = useTheme();
  const { results, valueOfTime, setValueOfTime } = useTrip();
  const ranked = useMemo(() => rerank(results, valueOfTime), [results, valueOfTime]);
  const currency = ranked[0]?.currency ?? "USD";

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={ranked}
      keyExtractor={(it) => it.id}
      ListHeaderComponent={
        <View style={styles.slider}>
          <View style={styles.sliderLabels}>
            <Text style={{ color: theme.muted }}>Cheaper</Text>
            <Text style={{ color: theme.muted }}>Faster</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={60}
            step={1}
            value={valueOfTime}
            onValueChange={setValueOfTime}
            minimumTrackTintColor={theme.accent}
          />
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            An hour saved is worth {formatMoney(valueOfTime, currency)} to me
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ItineraryRow itinerary={item} onPress={() => router.push(`/trip/${encodeURIComponent(item.id)}`)} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  slider: { marginBottom: 16, gap: 4 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
});
