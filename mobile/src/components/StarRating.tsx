// Five stars: read-only display (rounded to the nearest half) or tap-to-rate input.

import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { useTheme } from "../theme/theme";

type Props = {
  value: number;
  size?: number;
  /** When set, the stars become buttons for picking a rating. */
  onChange?: (stars: number) => void;
};

export const StarRating = ({ value, size = 16, onChange }: Props) => {
  const { colors } = useTheme();
  const on = { color: colors.accent, fill: colors.accent };
  const off = { color: colors.border, fill: colors.muted };

  if (onChange) {
    return (
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star size={size} {...(n <= value ? on : off)} />
          </Pressable>
        ))}
      </View>
    );
  }

  const rounded = Math.round(value * 2) / 2;
  return (
    <View style={{ flexDirection: "row", gap: 1 }} accessibilityRole="image" accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={{ width: size, height: size }}>
          <Star size={size} {...off} />
          {n <= rounded ? (
            <View style={{ position: "absolute", inset: 0 }}>
              <Star size={size} {...on} />
            </View>
          ) : n - 0.5 === rounded ? (
            <View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: size / 2, overflow: "hidden" }}>
              <Star size={size} {...on} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};
