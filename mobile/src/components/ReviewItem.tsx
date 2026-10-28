// A single review card: stars + label, tags, optional comment, reviewer's first
// name and date, and Edit (own review) or Report / Block (someone else's, signed in).
// Report + Block are required for user-generated content by Apple 1.2 and Google Play.
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queries";
import { useNavigation } from "@react-navigation/native";
import { fonts, radius, useTheme } from "../theme/theme";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatReviewDate, isNegativeTag, STAR_LABELS, visibleTags } from "../lib/reviewTags";
import type { PublicReview } from "../types/api";
import { AppText } from "./ui/AppText";
import { useToast } from "./ui/Feedback";
import { StarRating } from "./StarRating";
import { LinkButton } from "./SignInCard";

type Props = {
  review: PublicReview;
  /** Show which venue the review is about (Reviews tab feed). */
  showStore?: boolean;
  onEdit?: (review: PublicReview) => void;
};

export const ReviewItem = ({ review, showStore = false, onEdit }: Props) => {
  const { colors } = useTheme();
  const { authState } = useAuth();
  const toast = useToast();
  const navigation = useNavigation();
  const report = useMutation({
    mutationFn: api.reportReview,
    onSuccess: () => toast.success("Thanks. We'll check this review against our Community Rules."),
    onError: (e: Error) => toast.error(e.message),
  });
  const queryClient = useQueryClient();
  const block = useMutation({
    mutationFn: api.blockReviewer,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      toast.success(`You won't see reviews from ${r.name || review.authorName} any more.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tags = visibleTags(review.tags);

  const confirmReport = () =>
    Alert.alert("Report this review?", "We'll check it against our Community Rules, usually within 24 hours.", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: () => report.mutate({ reviewId: review.id }) },
    ]);
  const confirmBlock = () =>
    Alert.alert(`Block ${review.authorName}?`, "You won't see their reviews any more. They won't be told.", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: () => block.mutate({ reviewId: review.id }) },
    ]);

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {showStore ? (
        <AppText
          variant="h3"
          style={{ fontSize: 16 }}
          onPress={() => navigation.navigate("Store", { storeId: review.storeId })}
          accessibilityRole="link"
        >
          {review.storeName}
        </AppText>
      ) : null}
      <View style={styles.head}>
        <StarRating value={review.stars} size={15} />
        <AppText variant="smallBold">{STAR_LABELS[review.stars]}</AppText>
        {review.isHidden ? (
          <View style={[styles.pill, { backgroundColor: colors.muted }]}>
            <AppText style={{ fontSize: 11.5, fontFamily: fonts.bodyBold, color: colors.mutedForeground }}>Hidden by admin</AppText>
          </View>
        ) : null}
      </View>
      {tags.length > 0 ? (
        <View style={styles.tags} accessibilityLabel="What stood out">
          {tags.map((t) => {
            const neg = isNegativeTag(t);
            return (
              <View key={t} style={[styles.pill, { backgroundColor: neg ? colors.muted : colors.secondary }]}>
                <AppText style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: neg ? colors.mutedForeground : colors.secondaryForeground }}>{t}</AppText>
              </View>
            );
          })}
        </View>
      ) : null}
      {review.comment ? <AppText style={{ fontSize: 14.5, lineHeight: 21 }}>{review.comment}</AppText> : null}
      <View style={styles.foot}>
        <AppText style={{ fontSize: 12.5, color: colors.mutedForeground, flexShrink: 1 }}>
          <AppText style={{ fontSize: 12.5, fontFamily: fonts.bodyBold }}>{review.authorName}</AppText>
          {review.isMine ? " (you)" : ""} · {formatReviewDate(review.updatedAt)}
        </AppText>
        {review.isMine ? (
          onEdit ? <LinkButton title="Edit" onPress={() => onEdit(review)} /> : null
        ) : authState.type === "authenticated" ? (
          <View style={styles.actions}>
            <LinkButton title={report.isSuccess ? "Reported" : "Report"} disabled={report.isPending || report.isSuccess} onPress={confirmReport} />
            <LinkButton title="Block" disabled={block.isPending || block.isSuccess} onPress={confirmBlock} />
          </View>
        ) : (
          // Signed-out readers can still flag a review: they're asked to sign in first.
          <LinkButton title="Report" onPress={() => navigation.navigate("Login")} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.full },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", gap: 14 },
});
