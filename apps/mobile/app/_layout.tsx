import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold } from "@expo-google-fonts/archivo";
import { ArchivoNarrow_600SemiBold } from "@expo-google-fonts/archivo-narrow";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { font, useTheme } from "../lib/theme";
import { TripProvider } from "../lib/trip-store";

export default function RootLayout() {
  const theme = useTheme();
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    ArchivoNarrow_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  // Paper-coloured blank while fonts load, so there's no flash of system type.
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  return (
    <TripProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerShadowVisible: false,
          headerTintColor: theme.fg,
          headerTitleStyle: { fontFamily: font.display, fontSize: 20 },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ title: "Routes" }} />
        <Stack.Screen name="trip/[id]" options={{ title: "Trip" }} />
      </Stack>
    </TripProvider>
  );
}
