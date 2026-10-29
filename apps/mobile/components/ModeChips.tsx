import { ALL_MODES, MODE_LABEL, type Mode } from "@mmr/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { font, space, type, useTheme } from "../lib/theme";

interface Props {
  value: Set<Mode>;
  onChange: (modes: Set<Mode>) => void;
}

export function Checkbox({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={space.s2}
      style={styles.check}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.box, { borderColor: pressed ? theme.accent : theme.fg }]}>
            {checked && <View style={[styles.fill, { backgroundColor: theme.fg }]} />}
          </View>
          <Text style={[styles.label, { color: theme.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function ModeChips({ value, onChange }: Props) {
  function toggle(m: Mode) {
    const next = new Set(value);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(next);
  }

  return (
    <View style={styles.grid} accessibilityRole="none">
      {ALL_MODES.map((m) => (
        <View key={m} style={styles.cell}>
          <Checkbox label={MODE_LABEL[m]} checked={value.has(m)} onPress={() => toggle(m)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space.s2, paddingTop: space.s2 },
  cell: { width: "50%" },
  check: { flexDirection: "row", alignItems: "center", gap: space.s2, minHeight: 32 },
  box: { width: 14, height: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fill: { width: 8, height: 8 },
  label: { fontFamily: font.text, fontSize: type.m, lineHeight: 24 },
});
