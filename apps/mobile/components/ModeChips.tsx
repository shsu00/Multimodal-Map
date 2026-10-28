import { ALL_MODES, MODE_EMOJI, MODE_LABEL, type Mode } from "@mmr/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

interface Props {
  value: Set<Mode>;
  onChange: (modes: Set<Mode>) => void;
}

export default function ModeChips({ value, onChange }: Props) {
  const theme = useTheme();

  function toggle(m: Mode) {
    const next = new Set(value);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(next);
  }

  return (
    <View style={styles.row}>
      {ALL_MODES.map((m) => {
        const on = value.has(m);
        return (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => toggle(m)}
            style={[
              styles.chip,
              { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.accent : theme.card },
            ]}
          >
            <Text style={{ color: on ? theme.accentText : theme.text }}>
              {MODE_EMOJI[m]} {MODE_LABEL[m]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
