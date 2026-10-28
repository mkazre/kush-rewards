
import { Pressable, StyleSheet, View } from "react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Option<T extends string | number> = { value: T; label: string; sub?: string };

type Props<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
};

/** Pill switcher, e.g. Latest / My reviews, Dispensary / Private club / Lounge, R / RR / RRR. */
export function Segmented<T extends string | number>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.muted }]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.item, on && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}
          >
            <AppText style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: on ? colors.foreground : colors.mutedForeground }}>{o.label}</AppText>
            {o.sub ? <AppText style={{ fontSize: 11.5, color: on ? colors.foreground : colors.mutedForeground }}>{o.sub}</AppText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 4, gap: 4, borderRadius: radius.md },
  item: { flex: 1, minHeight: 38, borderRadius: radius.base, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
});
