import type { GeocodeResult, Place } from "@mmr/shared";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { font, space, type, useTheme } from "../lib/theme";
import Field from "./Field";

interface Props {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  accessory?: React.ReactNode;
}

export default function PlaceInput({ label, value, onChange, accessory }: Props) {
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
    <Field label={label}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          style={[
            styles.input,
            { color: theme.fg, borderBottomColor: focused ? theme.accent : theme.fg, borderBottomWidth: focused ? 2 : 1 },
          ]}
          value={text}
          placeholder="Address or place"
          placeholderTextColor={theme.muted}
          selectionColor={theme.accent}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(t) => {
            setText(t);
            if (value) onChange(null);
          }}
        />
        {accessory}
      </View>
      {suggestions.length > 0 && (
        <View accessibilityRole="list" style={[styles.list, { borderBottomColor: theme.fg }]}>
          {suggestions.map((s) => (
            <Pressable
              key={`${s.lat},${s.lon}`}
              accessibilityRole="button"
              accessibilityLabel={s.name}
              style={styles.item}
              onPress={() => {
                onChange(s);
                setSuggestions([]);
                setFocused(false);
              }}
            >
              {({ pressed }) => <Text style={[styles.itemText, { color: pressed ? theme.accent : theme.fg }]}>{s.name}</Text>}
            </Pressable>
          ))}
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: space.s3 },
  input: { flex: 1, fontFamily: font.text, fontSize: type.m, paddingVertical: space.s2 },
  list: { borderBottomWidth: 2, paddingVertical: space.s1 },
  item: { paddingVertical: space.s3 },
  itemText: { fontFamily: font.text, fontSize: type.m, lineHeight: 24 },
});
