
import { Text, type TextProps, type TextStyle } from "react-native";
import { fonts, useTheme, type Colors } from "../../theme/theme";

type Variant = "h1" | "h2" | "h3" | "body" | "bodyBold" | "small" | "smallBold" | "eyebrow" | "label";

const VARIANTS: Record<Variant, TextStyle> = {
  h1: { fontFamily: fonts.displayExtraBold, fontSize: 27, lineHeight: 31 },
  h2: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  h3: { fontFamily: fonts.display, fontSize: 16.5, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19 },
  smallBold: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.7, textTransform: "uppercase" },
  label: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
};

type Props = TextProps & { variant?: Variant; color?: keyof Colors; tabular?: boolean };

/** All text in the app goes through this so fonts and colours follow the theme. */
export const AppText = ({ variant = "body", color = "foreground", tabular, style, ...rest }: Props) => {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[VARIANTS[variant], { color: colors[color] }, tabular && { fontVariant: ["tabular-nums"] }, style]}
    />
  );
};
