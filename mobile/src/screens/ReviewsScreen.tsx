// Reviews tab: latest reviews across all stores, "My reviews", and the entry
// point for writing a review.
import { useState } from "react";
import { View } from "react-native";
import { PenLine } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { useReviews } from "../hooks/queries";
import type { PublicReview } from "../types/api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { EmptyBox, ErrorText, Skeleton } from "../components/ui/Feedback";
import { Segmented } from "../components/ui/Segmented";
import { ReviewItem } from "../components/ReviewItem";
import { ReviewSheet } from "../components/ReviewSheet";
import { Screen } from "../components/Screen";
import { SignInCard } from "../components/SignInCard";

type View_ = "latest" | "mine";

export default function ReviewsScreen() {
  const { authState } = useAuth();
  const signedIn = authState.type === "authenticated";
  const [view, setView] = useState<View_>("latest");
  const [sheet, setSheet] = useState<{ open: boolean; storeId?: number }>({ open: false });

  const latest = useReviews({ limit: 50 }, view === "latest");
  const mine = useReviews({ mine: true, limit: 100 }, view === "mine" && signedIn);
  const q = view === "latest" ? latest : mine;
  const edit = (r: PublicReview) => setSheet({ open: true, storeId: r.storeId });

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isFetching && !!q.data}>
      <View style={{ gap: 8 }}>
        <AppText variant="h1" accessibilityRole="header">Reviews</AppText>
        <AppText color="mutedForeground">What locals say about venues on the West Rand. Been somewhere lately? Rate it in 10 seconds.</AppText>
      </View>

      <Button title="Write a review" icon={PenLine} size="lg" onPress={() => setSheet({ open: true })} />

      <Segmented<View_>
        accessibilityLabel="Which reviews"
        value={view}
        onChange={setView}
        options={[
          { value: "latest", label: "Latest" },
          { value: "mine", label: "My reviews" },
        ]}
      />

      {view === "mine" && !signedIn ? (
        authState.type === "loading" ? (
          <Skeleton height={120} />
        ) : (
          <SignInCard title="Your reviews" text="Sign in to see and edit the reviews you've written." />
        )
      ) : q.error ? (
        <ErrorText text={`We couldn't load reviews: ${q.error.message}`} />
      ) : q.isFetching && !q.data ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      ) : q.data && q.data.reviews.length > 0 ? (
        <View style={{ gap: 12 }}>
          {q.data.reviews.map((r) => (
            <ReviewItem key={r.id} review={r} showStore onEdit={edit} />
          ))}
        </View>
      ) : (
        <EmptyBox dashed text={view === "mine" ? "You haven't reviewed a venue yet." : "No reviews yet. Be the first: tap Write a review."} />
      )}

      <ReviewSheet open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} storeId={sheet.storeId} />
    </Screen>
  );
}
