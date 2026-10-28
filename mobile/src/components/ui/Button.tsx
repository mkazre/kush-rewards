import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Variant = "primary" | "outline" | "ghost" | "secondary" | "destructive";
type Size = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Optional icon component (e.g. a lucide icon) shown before the title. */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const HEIGHT: Record<Size, number> = { sm: 36, md: 44, lg: 50 };

export const Button = ({ title, onPress, variant = "primary", size = "md", disabled, loading, icon: Icon, style, accessibilityLabel }: Props) => {
  const { colors } = useTheme();
  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: colors.secondary },
    outline: { bg: colors.card, fg: colors.foreground, border: colors.border },
    ghost: { bg: "transparent", fg: colors.foreground, border: "transparent" },
    destructive: { bg: colors.error, fg: "#ffffff", border: colors.error },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isDisabled }}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], backgroundColor: p.bg, borderColor: p.border, paddingHorizontal: size === "sm" ? 12 : 16 },
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={p.fg} /> : Icon ? <Icon size={size === "sm" ? 16 : 18} color={p.fg} /> : null}
        <AppText style={{ color: p.fg, fontFamily: fonts.bodyBold, fontSize: size === "sm" ? 13.5 : 15 }}>{title}</AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.base, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
