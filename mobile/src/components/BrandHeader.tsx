// Top-of-screen wordmark: "Kush" + leaf + "Rewards" + South African flag.
// Tapping it goes to Discover. The web app uses a realistic leaf photo (see
// HANDOVER.md 3.1 to swap it in); this vector leaf works in light and dark mode.

import { Pressable, StyleSheet, View } from "react-native";
import Svg, { ClipPath, Defs, G, Line, Path } from "react-native-svg";
import { fonts, useTheme } from "../theme/theme";
import { AppText } from "./ui/AppText";

const LEAFLETS: { angle: number; length: number }[] = [
  { angle: 0, length: 44 },
  { angle: -34, length: 37 },
  { angle: 34, length: 37 },
  { angle: -66, length: 29 },
  { angle: 66, length: 29 },
  { angle: -100, length: 17 },
  { angle: 100, length: 17 },
];

/** Seven-leaflet cannabis leaf drawn with SVG paths. */
export const LeafMark = ({ size = 32 }: { size?: number }) => {
  const { isDark } = useTheme();
  const fill = isDark ? "#5fb24f" : "#3d8b35";
  const vein = isDark ? "#9ad98a" : "#2a6624";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      <Line x1="50" y1="80" x2="50" y2="97" stroke={vein} strokeWidth="3" strokeLinecap="round" />
      {LEAFLETS.map(({ angle, length: L }, i) => {
        const w = L * 0.2;
        const d = `M0,0 C${w},${-L * 0.28} ${w * 0.9},${-L * 0.72} 0,${-L} C${-w * 0.9},${-L * 0.72} ${-w},${-L * 0.28} 0,0 Z`;
        return (
          <G key={i} transform={`translate(50 80) rotate(${angle})`}>
            <Path d={d} fill={fill} />
            <Line x1="0" y1="0" x2="0" y2={-L * 0.92} stroke={vein} strokeWidth="1.4" />
          </G>
        );
      })}
    </Svg>
  );
};

/** Official South African flag proportions and colours. */
export const SouthAfricaFlag = ({ width = 24 }: { width?: number }) => (
  <View style={[styles.flagFrame, { width, height: (width * 2) / 3 }]}>
    <Svg width={width} height={(width * 2) / 3} viewBox="0 0 900 600" accessibilityLabel="South Africa">
      <Defs>
        <ClipPath id="zaTriangle">
          <Path d="M0,0 L450,300 L0,600 Z" />
        </ClipPath>
        <ClipPath id="zaFrame">
          <Path d="M0,0 V600 H900 V0 Z" />
        </ClipPath>
      </Defs>
      <Path fill="#E03C31" d="M0,0 H900 V300 H0 Z" />
      <Path fill="#001489" d="M0,300 H900 V600 H0 Z" />
      <G clipPath="url(#zaFrame)">
        <Path fill="none" stroke="#FFFFFF" strokeWidth={200} d="M0,0 L450,300 L0,600 M450,300 H900" />
        <Path fill="#000000" stroke="#FFB81C" strokeWidth={100} clipPath="url(#zaTriangle)" d="M0,0 L450,300 L0,600 Z" />
        <Path fill="none" stroke="#007749" strokeWidth={120} d="M0,0 L450,300 L0,600 M450,300 H900" />
      </G>
    </Svg>
  </View>
);

export const BrandHeader = ({ onPress }: { onPress?: () => void }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel="KushRewards SA home" style={styles.row}>
      <AppText style={[styles.word, { color: colors.foreground }]}>Kush</AppText>
      <View style={styles.leaf}>
        <LeafMark size={36} />
      </View>
      <AppText style={[styles.word, { color: colors.primary }]}>Rewards</AppText>
      <View style={{ marginLeft: 7 }}>
        <SouthAfricaFlag width={26} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  word: { fontFamily: fonts.brand, fontSize: 25, lineHeight: 30, letterSpacing: 0.2 },
  leaf: { marginHorizontal: -2, marginTop: -4 },
  flagFrame: { borderRadius: 3, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.15)" },
});
