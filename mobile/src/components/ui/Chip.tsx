
import { Pressable, StyleSheet } from "react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** "filter": selected turns dark ink (Discover filters). "pick": selected turns brand green (forms). */
  tone?: "filter" | "pick";
};

/** Rounded toggle used for filters, review tags, features and report reasons. */
export const Chip = ({ label, selected = false, onPress, tone = "filter" }: Props) => {
  const { colors } = useTheme();
  const on = tone === "filter" ? { bg: colors.foreground, fg: colors.background } : { bg: colors.primary, fg: colors.primaryForeground };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? on.bg : colors.border, backgroundColor: selected ? on.bg : colors.card },
      ]}
    >
      <AppText style={{ fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: selected ? on.fg : colors.foreground }}>{label}</AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: { height: 34, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, justifyContent: "center" },
});
