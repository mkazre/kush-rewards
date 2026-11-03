// Dark fade from top to bottom over a full-screen splash image, so text at the bottom stays
// readable. Drawn with react-native-svg (already installed) instead of adding a gradient library.
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export const LinearGradientLike = ({ overlay }: { overlay: number }) => {
  const max = Math.max(0, Math.min(80, overlay)) / 100;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={max * 0.4} />
          <Stop offset="0.7" stopColor="#000" stopOpacity={max} />
          <Stop offset="1" stopColor="#000" stopOpacity={Math.min(1, max + 0.1)} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
    </Svg>
  );
};
