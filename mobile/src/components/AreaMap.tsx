// Light schematic map of the listed stores and the person's position. No map
// tiles or API key needed; it fits every pin into the box. Tapping a pin opens
// the store. Partner stores get a green pin, others grey; "you" is a blue dot.

import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { fonts, radius, useTheme } from "../theme/theme";
import { AppText } from "./ui/AppText";

export type MapPin = { id: number; name: string; lat: number; lng: number; partner: boolean };

type Props = {
  pins: MapPin[];
  me: { lat: number; lng: number };
  onPinPress: (id: number) => void;
};

const W = 400;
const H = 220;
const PAD = 28;

export const AreaMap = ({ pins, me, onPinPress }: Props) => {
  const { colors } = useTheme();
  const pts = [...pins.map((p) => ({ lat: p.lat, lng: p.lng })), me];
  let minLat = Math.min(...pts.map((p) => p.lat));
  let maxLat = Math.max(...pts.map((p) => p.lat));
  let minLng = Math.min(...pts.map((p) => p.lng));
  let maxLng = Math.max(...pts.map((p) => p.lng));
  const minSpan = 0.03;
  if (maxLat - minLat < minSpan) {
    const c = (maxLat + minLat) / 2;
    minLat = c - minSpan / 2;
    maxLat = c + minSpan / 2;
  }
  if (maxLng - minLng < minSpan) {
    const c = (maxLng + minLng) / 2;
    minLng = c - minSpan / 2;
    maxLng = c + minSpan / 2;
  }
  const x = (lng: number) => PAD + ((lng - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const y = (lat: number) => PAD + 12 + ((maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2 - 12);

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.mapLand }]}>
      <Svg width="100%" style={{ aspectRatio: W / H }} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Map of venues near you">
        <Rect x="0" y="0" width={W} height={H} fill={colors.mapLand} />
        {[1, 2, 3].map((i) => (
          <Line key={`h${i}`} x1="0" x2={W} y1={(H / 4) * i} y2={(H / 4) * i} stroke={colors.background} strokeWidth={2} />
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <Line key={`v${i}`} y1="0" y2={H} x1={(W / 6) * i} x2={(W / 6) * i} stroke={colors.background} strokeWidth={2} />
        ))}
        <Circle cx={x(me.lng)} cy={y(me.lat)} r={14} fill={colors.info} opacity={0.18} />
        <Circle cx={x(me.lng)} cy={y(me.lat)} r={5.5} fill={colors.info} stroke={colors.card} strokeWidth={2} />
        {pins.map((p) => (
          <G key={p.id} transform={`translate(${x(p.lng)} ${y(p.lat)})`} onPress={() => onPinPress(p.id)}>
            {/* larger invisible hit area for fingers */}
            <Circle cx={0} cy={-15} r={16} fill="transparent" />
            <Path
              d="M0 0 C -6 -8 -9 -12 -9 -17 A9 9 0 1 1 9 -17 C 9 -12 6 -8 0 0Z"
              fill={p.partner ? colors.primary : colors.mutedForeground}
              stroke={colors.card}
              strokeWidth={2}
            />
            <Circle cx={0} cy={-17} r={3.5} fill={colors.card} />
          </G>
        ))}
      </Svg>
      <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText style={{ fontSize: 11, fontFamily: fonts.bodySemiBold, color: colors.mutedForeground }}>Not to scale · tap a pin</AppText>
      </View>
      {/* Screen-reader shortcut: list the pins as buttons */}
      <View style={styles.srOnly}>
        {pins.map((p) => (
          <Pressable key={p.id} onPress={() => onPinPress(p.id)} accessibilityRole="link" accessibilityLabel={p.name} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  note: { position: "absolute", left: 8, bottom: 8, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
});
