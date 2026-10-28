// Venue page: identity and status, Contact (WhatsApp / Call / Directions),
// reviews, opening hours, details, features and "Report wrong info".
// Store-compliant build: no prices, product menus or stock information, and a
// clear "information only, no sales" notice (Google Play marijuana policy, Apple 1.4.3).
// Every contact tap is counted (POST /stores/tap).
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, BadgeCheck, Clock, Flag, Info, MapPin, MessageCircle, Navigation, Phone, Star } from "lucide-react-native";
import { api } from "../api/endpoints";
import { useReviews, useStores } from "../hooks/queries";
import { useUserLocation } from "../hooks/useUserLocation";
import { DAYS, directionsLink, distanceKm, formatDistance, hasAnyHours, openState, telLink, todayKey, TYPE_LABELS, whatsappLink } from "../lib/storeUtils";
import { fonts, radius, useTheme } from "../theme/theme";
import type { ContactKind } from "../types/api";
import type { RootStackParamList } from "../navigation/types";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Feedback";
import { ReportSheet } from "../components/ReportSheet";
import { ReviewItem } from "../components/ReviewItem";
import { ReviewSheet } from "../components/ReviewSheet";
import { StarRating } from "../components/StarRating";
import { StoreMonogram } from "../components/StoreCard";

type Props = NativeStackScreenProps<RootStackParamList, "Store">;

function track(storeId: number, kind: ContactKind) {
  api.trackTap({ storeId, kind }).catch(() => undefined); // fire-and-forget; never blocks the tap
}

export default function StoreScreen({ route, navigation }: Props) {
  const { storeId: id } = route.params;
  const { colors } = useTheme();
  const { data, isFetching, error } = useStores();
  const { location } = useUserLocation();
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const reviews = useReviews({ storeId: id, limit: 50 });
  const storeReviews = reviews.data?.reviews ?? [];
  const myReview = storeReviews.find((r) => r.isMine);

  const store = data?.stores.find((s) => s.id === id);

  if (!data && isFetching) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background, padding: 16, gap: 12 }]}>
        <Skeleton height={220} />
        <Skeleton height={180} />
      </SafeAreaView>
    );
  }
  if (error || !store) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background, padding: 16, gap: 12 }]}>
        <AppText variant="h1">Venue not found</AppText>
        <AppText>{error ? error.message : "This venue may have closed or been removed."}</AppText>
        <Button title="Back to venues" variant="outline" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const open = openState(store.hours);
  const km = distanceKm(location, { lat: store.latitude, lng: store.longitude });
  const waText = `Hi ${store.name}, I found you on KushRewards SA. I have a question: `;
  const today = todayKey();
  const callNumber = store.phone || store.whatsapp;

  const Section = ({ icon: Icon, title, right, children }: { icon: typeof Phone; title: string; right?: React.ReactNode; children: React.ReactNode }) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.h2Row}>
          <Icon size={18} color={colors.foreground} />
          <AppText variant="h2" accessibilityRole="header">{title}</AppText>
        </View>
        {right}
      </View>
      {children}
    </View>
  );

  const Action = ({ icon: Icon, label, onPress, primary, disabled }: { icon: typeof Phone; label: string; onPress?: () => void; primary?: boolean; disabled?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.action,
        { backgroundColor: primary ? colors.primary : colors.card, borderColor: primary ? colors.primary : colors.border, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Icon size={22} color={primary ? colors.primaryForeground : colors.foreground} />
      <AppText style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: primary ? colors.primaryForeground : colors.foreground }}>{label}</AppText>
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.fill, { backgroundColor: colors.secondary }]}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32, gap: 8 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={[styles.back, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Back to venues">
              <ArrowLeft size={22} color={colors.foreground} />
            </Pressable>
            {store.isPartner ? (
              <View style={[styles.partner, { backgroundColor: colors.accentSoft }]}>
                <BadgeCheck size={14} color={colors.accentSoftForeground} />
                <AppText style={{ fontSize: 12.5, fontFamily: fonts.bodyBold, color: colors.accentSoftForeground }}>Partner venue</AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.identity}>
            <StoreMonogram store={store} size={60} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="h1" style={{ fontSize: 26 }}>{store.name}</AppText>
              <AppText variant="small" color="secondaryForeground">
                {TYPE_LABELS[store.type]} · {store.suburb} · {formatDistance(km)}
              </AppText>
              <AppText variant="smallBold" color={open.isOpen ? "success" : open.isOpen === false ? "error" : "secondaryForeground"}>{open.text}</AppText>
              {store.rating ? (
                <View style={styles.inline}>
                  <StarRating value={store.rating.average} size={14} />
                  <AppText variant="smallBold">{store.rating.average.toFixed(1)}</AppText>
                  <AppText variant="small" color="secondaryForeground">({store.rating.count})</AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Contact actions */}
        <Section icon={Phone} title="Contact">
          <View style={styles.actions}>
            <Action
              icon={MessageCircle}
              label={store.whatsapp ? "WhatsApp" : "No WhatsApp"}
              primary={!!store.whatsapp}
              disabled={!store.whatsapp}
              onPress={() => {
                if (!store.whatsapp) return;
                track(store.id, "whatsapp");
                Linking.openURL(whatsappLink(store.whatsapp, waText));
              }}
            />
            <Action
              icon={Phone}
              label={callNumber ? "Call" : "No phone"}
              disabled={!callNumber}
              onPress={() => {
                if (!callNumber) return;
                track(store.id, "call");
                Linking.openURL(telLink(callNumber));
              }}
            />
            <Action
              icon={Navigation}
              label="Directions"
              onPress={() => {
                track(store.id, "directions");
                Linking.openURL(directionsLink(store.latitude, store.longitude));
              }}
            />
          </View>
          <AppText style={{ fontSize: 12, color: colors.secondaryForeground }}>WhatsApp opens your own chat with the venue. KushRewards never sees your messages.</AppText>
          <View style={[styles.notice, { backgroundColor: colors.surface }]}>
            <Info size={16} color={colors.mutedForeground} />
            <AppText variant="small" color="mutedForeground" style={{ flex: 1 }}>
              KushRewards is an information guide for adults 18+. We don't sell cannabis, take orders or arrange deliveries. Follow South African law: cannabis is for private use only, and never drive under the influence.
            </AppText>
          </View>
        </Section>

        {/* Reviews */}
        <Section icon={Star} title="Reviews" right={<Button title={myReview ? "Edit your review" : "Write a review"} size="sm" variant={myReview ? "outline" : "primary"} onPress={() => setReviewOpen(true)} />}>
          {store.rating ? (
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppText tabular style={{ fontFamily: fonts.displayExtraBold, fontSize: 32, lineHeight: 34 }}>{store.rating.average.toFixed(1)}</AppText>
              <View style={{ flex: 1, gap: 4 }}>
                <StarRating value={store.rating.average} size={16} />
                <AppText variant="small" color="mutedForeground">{store.rating.count} {store.rating.count === 1 ? "review" : "reviews"}</AppText>
                {store.rating.topTags.length > 0 ? (
                  <View style={styles.wrapRow} accessibilityLabel="Most mentioned">
                    {store.rating.topTags.map((t) => (
                      <View key={t} style={[styles.pill, { backgroundColor: colors.secondary }]}>
                        <AppText style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: colors.secondaryForeground }}>{t}</AppText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <AppText variant="small" color="mutedForeground">No reviews yet. Been here? Be the first to rate it.</AppText>
          )}
          {reviews.isFetching && !reviews.data ? (
            <Skeleton height={120} />
          ) : storeReviews.length > 0 ? (
            <View style={{ gap: 8 }}>
              {(showAllReviews ? storeReviews : storeReviews.slice(0, 3)).map((r) => (
                <ReviewItem key={r.id} review={r} onEdit={() => setReviewOpen(true)} />
              ))}
              {storeReviews.length > 3 && !showAllReviews ? <Button title={`Show all ${storeReviews.length} reviews`} variant="ghost" onPress={() => setShowAllReviews(true)} /> : null}
            </View>
          ) : null}
        </Section>

        {/* Opening hours */}
        <Section icon={Clock} title="Opening hours">
          {hasAnyHours(store.hours) ? (
            <View style={[styles.hours, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {DAYS.map((d, i) => {
                const h = store.hours[d.key];
                const isToday = d.key === today;
                return (
                  <View key={d.key} style={[styles.hourRow, { borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }, isToday && { backgroundColor: colors.secondary }]}>
                    <AppText variant={isToday ? "bodyBold" : "body"}>{d.label}</AppText>
                    <AppText variant={isToday ? "bodyBold" : "body"} tabular>{h ? `${h.open}–${h.close === "00:00" ? "midnight" : h.close}` : "Closed"}</AppText>
                  </View>
                );
              })}
            </View>
          ) : (
            <AppText variant="small" color="mutedForeground">Hours not listed yet. Message the venue to check.</AppText>
          )}
          {store.hoursNote ? <AppText variant="small" color="mutedForeground">{store.hoursNote}</AppText> : null}
        </Section>

        {/* Details */}
        <Section icon={MapPin} title="Details">
          <View style={{ gap: 8 }}>
            <View style={styles.kv}>
              <AppText color="mutedForeground" style={styles.k}>Address</AppText>
              <AppText style={styles.v}>{store.address || store.suburb}</AppText>
            </View>
            {store.whatsapp ? (
              <View style={styles.kv}>
                <AppText color="mutedForeground" style={styles.k}>WhatsApp</AppText>
                <AppText style={styles.v} tabular>{store.whatsapp}</AppText>
              </View>
            ) : null}
          </View>
          {store.features.length > 0 ? (
            <View style={{ gap: 8 }}>
              <AppText color="mutedForeground" accessibilityRole="header">Features</AppText>
              <View style={styles.wrapRow}>
                {store.features.map((ft) => (
                  <View key={ft} style={[styles.tag, { backgroundColor: colors.muted }]}>
                    <AppText style={{ fontSize: 12.5, fontFamily: fonts.bodySemiBold, color: colors.mutedForeground }}>{ft}</AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {store.isCommunity ? <AppText variant="small" color="mutedForeground">Added by the KushRewards community.</AppText> : null}
        </Section>

        <View style={styles.section}>
          <Pressable onPress={() => setReportOpen(true)} style={styles.inline} accessibilityRole="button" hitSlop={8}>
            <Flag size={16} color={colors.mutedForeground} />
            <AppText color="mutedForeground" style={{ fontFamily: fonts.bodySemiBold }}>Report wrong info about this venue</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} storeId={store.id} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} storeId={store.id} storeName={store.name} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 16 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  partner: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  identity: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  section: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  h2Row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  notice: { flexDirection: "row", gap: 8, padding: 12, borderRadius: radius.md },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.full },
  hours: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  hourRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16 },
  kv: { flexDirection: "row", gap: 12 },
  k: { width: 90 },
  v: { flex: 1 },
  tag: { height: 26, paddingHorizontal: 10, borderRadius: radius.sm, justifyContent: "center" },
});
