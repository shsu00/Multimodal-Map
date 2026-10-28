import { useColorScheme } from "react-native";

const light = {
  bg: "#ffffff",
  card: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  accent: "#2563eb",
  accentText: "#ffffff",
  selected: "#eff6ff",
  error: "#b91c1c",
};

const dark: typeof light = {
  bg: "#0b1120",
  card: "#111827",
  text: "#e5e7eb",
  muted: "#94a3b8",
  border: "#1f2937",
  accent: "#3b82f6",
  accentText: "#ffffff",
  selected: "#172554",
  error: "#f87171",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
