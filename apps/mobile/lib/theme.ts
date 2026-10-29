import { useColorScheme } from "react-native";

// Same system as apps/web/src/styles.css: paper / ink / signal red, with
// muted and rule tones as ink tints. Contrast: ink/paper 15.6:1,
// accent 5.0:1 (light) and 6.4:1 (dark), muted 5.2:1 / 7.1:1.
const light = {
  bg: "#F2EFE6",
  fg: "#17171A",
  accent: "#BF3014",
  onAccent: "#F2EFE6",
  muted: "#646361",
  rule: "#BBB9B3",
};

const dark: typeof light = {
  bg: "#17171A",
  fg: "#F2EFE6",
  accent: "#FF6B4A",
  onAccent: "#17171A",
  muted: "#A5A39F",
  rule: "#4E4D4D",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

// 4px grid
export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s6: 24, s8: 32, s12: 48 } as const;

// Asymmetric scale: 11 / 14 / 16 / 28 / 44
export const type = { xs: 11, s: 14, m: 16, l: 28, xl: 44 } as const;

export const font = {
  text: "Archivo_400Regular",
  textMedium: "Archivo_500Medium",
  textBold: "Archivo_600SemiBold",
  display: "ArchivoNarrow_600SemiBold",
  num: "IBMPlexMono_400Regular",
  numMedium: "IBMPlexMono_500Medium",
} as const;

export const LABEL_COL = 64;

export const caps = {
  fontFamily: font.textMedium,
  fontSize: type.xs,
  lineHeight: 16,
  letterSpacing: 0.9,
  textTransform: "uppercase",
} as const;
