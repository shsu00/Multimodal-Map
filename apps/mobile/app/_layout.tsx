import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TripProvider } from "../lib/trip-store";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const theme = useTheme();
  return (
    <TripProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Plan a trip" }} />
        <Stack.Screen name="results" options={{ title: "Routes" }} />
        <Stack.Screen name="trip/[id]" options={{ title: "Trip" }} />
      </Stack>
    </TripProvider>
  );
}
