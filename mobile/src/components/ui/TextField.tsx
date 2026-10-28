import React from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  /** Optional icon shown inside the field on the left (e.g. a search glass). */
  leftIcon?: React.ComponentType<{ size?: number; color?: string }>;
};

export const TextField = ({ label, hint, leftIcon: Icon, multiline, style, ...rest }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View>
        {Icon ? (
          <View style={styles.icon} pointerEvents="none">
            <Icon size={18} color={colors.mutedForeground} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          {...rest}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.foreground,
              minHeight: multiline ? 88 : 44,
              paddingLeft: Icon ? 38 : 12,
              paddingTop: multiline ? 10 : 0,
            },
            style,
          ]}
        />
      </View>
      {hint ? <AppText variant="small" color="mutedForeground">{hint}</AppText> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { borderWidth: 1, borderRadius: radius.base, paddingRight: 12, fontFamily: fonts.body, fontSize: 15 },
  icon: { position: "absolute", left: 12, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
});
