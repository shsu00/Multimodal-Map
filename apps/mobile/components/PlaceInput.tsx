import type { GeocodeResult, Place } from "@mmr/shared";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useTheme } from "../lib/theme";

interface Props {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
}

export default function PlaceInput({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(value?.name ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value) setText(value.name);
  }, [value]);

  useEffect(() => {
    if (!focused || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      api.geocode(text).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [text, focused]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
        value={text}
        placeholder="Search address"
        placeholderTextColor={theme.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(t) => {
          setText(t);
          if (value) onChange(null);
        }}
      />
      {suggestions.length > 0 && (
        <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              style={styles.item}
              onPress={() => {
                onChange(s);
                setSuggestions([]);
                setFocused(false);
              }}
            >
              <Text style={{ color: theme.text }}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  list: { borderWidth: 1, borderRadius: 10 },
  item: { paddingHorizontal: 12, paddingVertical: 10 },
});
