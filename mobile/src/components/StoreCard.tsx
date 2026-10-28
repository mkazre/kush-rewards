// One row in the Discover list. Tapping it opens the venue page.
// Store-compliant build: no product tags or prices on the card.

import { Image, Pressable, StyleSheet, View } from "react-native";
import { BadgeCheck, Star } from "lucide-react-native";
import { fonts, radius, useTheme } from "../theme/theme";
import { formatDistance, openState, storeInitials, TYPE_LABELS } from "../lib/storeUtils";
import type { PublicStore } from "../types/api";
import { AppText } from "./ui/AppText";

type Props = {
  store: PublicStore;
  distanceKm: number;
  onPress: () => void;
};

/** Logo, or a tinted square with the store's initials (tint depends on store type). */
export const StoreMonogram = ({ store, size = 48 }: { store: Pick<PublicStore, "name" | "type" | "logoUrl">; size?: number }) => {
  const { colors } = useTheme();
  if (store.logoUrl) {
    return <Image source={{ uri: store.logoUrl }} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.logoBackground }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  }
  const tint =
    store.type === "club"
      ? { bg: colors.accentSoft, fg: colors.accentSoftForeground }
      : store.type === "lounge"
        ? { bg: colors.muted, fg: colors.foreground }
        : { bg: colors.secondary, fg: colors.secondaryForeground };
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: tint.bg, alignItems: "center", justifyContent: "center" }}>
      <AppText style={{ fontFamily: fonts.displayExtraBold, fontSize: size * 0.36, color: tint.fg }}>{storeInitials(store.name)}</AppText>
    </View>
  );
};

export const StoreCard = ({ store, distanceKm, onPress }: Props) => {
  const { colors } = useTheme();
  const open = openState(store.hours);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${store.name}, ${TYPE_LABELS[store.type]} in ${store.suburb}, ${formatDistance(distanceKm)}`}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: pressed ? colors.primary : colors.border }]}
    >
      <StoreMonogram store={store} />
      <View style={styles.body}>
        <View style={styles.top}>
          <AppText style={styles.name} numberOfLines={2}>{store.name}</AppText>
          {store.isPartner ? (
            <View style={[styles.partner, { backgroundColor: colors.accentSoft }]}>
              <BadgeCheck size={13} color={colors.accentSoftForeground} />
              <AppText style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: colors.accentSoftForeground }}>Partner</AppText>
            </View>
          ) : null}
          <AppText variant="small" color="mutedForeground" tabular>{formatDistance(distanceKm)}</AppText>
        </View>

        <View style={styles.meta}>
          <AppText variant="small" color="mutedForeground">{TYPE_LABELS[store.type]} · {store.suburb}</AppText>
          {store.rating ? (
            <>
              <AppText variant="small" color="mutedForeground">·</AppText>
              <View style={styles.rating} accessibilityLabel={`Rated ${store.rating.average} out of 5 from ${store.rating.count} reviews`}>
                <Star size={13} color={colors.accent} fill={colors.accent} />
                <AppText variant="smallBold" tabular>{store.rating.average.toFixed(1)}</AppText>
                <AppText variant="small" color="mutedForeground">({store.rating.count})</AppText>
              </View>
            </>
          ) : null}
        </View>

        <AppText variant="smallBold" color={open.isOpen ? "success" : open.isOpen === false ? "error" : "mutedForeground"}>
          {open.text}
        </AppText>

        {store.features.length > 0 ? (
          <AppText style={{ fontSize: 12.5, color: colors.mutedForeground }}>
            <AppText style={{ fontSize: 12.5, fontFamily: fonts.bodyBold }}>Features:</AppText> {store.features.slice(0, 3).join(" · ")}
            {store.features.length > 3 ? <AppText style={{ fontSize: 12.5, fontStyle: "italic", color: colors.mutedForeground }}> and more</AppText> : null}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 16, borderWidth: 1, borderRadius: radius.lg },
  body: { flex: 1, gap: 4, minWidth: 0 },
  top: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  partner: { flexDirection: "row", alignItems: "center", gap: 4, height: 22, paddingHorizontal: 8, borderRadius: radius.full },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
});
