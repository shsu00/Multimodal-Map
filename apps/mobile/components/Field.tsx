import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { caps, LABEL_COL, space, useTheme } from "../lib/theme";

// Label column + content column, the grid every form row sits on.
export default function Field({ label, nativeID, children }: { label: string; nativeID?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text nativeID={nativeID} style={[caps, styles.label, { color: theme.muted }]}>
        {label}
      </Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.s4 },
  label: { width: LABEL_COL, paddingTop: space.s3 },
  body: { flex: 1, minWidth: 0 },
});
