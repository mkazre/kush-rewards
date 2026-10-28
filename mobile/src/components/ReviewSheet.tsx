// The 10-second review: pick a store (if not on a store page), tap stars, tap
// what stood out, optionally add a line. Saving again edits the same review.
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { queryKeys, useReviews, useStores } from "../hooks/queries";
import { useUserLocation } from "../hooks/useUserLocation";
import { distanceKm } from "../lib/storeUtils";
import { REVIEW_TAGS, STAR_LABELS, tagsForStars } from "../lib/reviewTags";
import { contentProblem } from "../lib/contentFilter";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { ErrorText, useToast } from "./ui/Feedback";
import { SelectSheet } from "./ui/SelectSheet";
import { Sheet } from "./ui/Sheet";
import { TextField } from "./ui/TextField";
import { StarRating } from "./StarRating";
import { SignInCard } from "./SignInCard";
import { RequireTerms } from "./RequireTerms";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Review this store only (from a store page). Leave empty to let people pick a store. */
  storeId?: number;
};

export const ReviewSheet = ({ open, onClose, storeId: fixedStoreId }: Props) => {
  const { authState } = useAuth();
  const signedIn = authState.type === "authenticated";
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: storesData } = useStores();
  const { location } = useUserLocation();
  const mine = useReviews({ mine: true, limit: 100 }, signedIn && open);

  const [storeId, setStoreId] = useState<number | null>(fixedStoreId ?? null);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stores = useMemo(
    () =>
      [...(storesData?.stores ?? [])].sort(
        (a, b) =>
          distanceKm(location, { lat: a.latitude, lng: a.longitude }) - distanceKm(location, { lat: b.latitude, lng: b.longitude })
      ),
    [storesData, location]
  );
  const existing = storeId ? mine.data?.reviews.find((r) => r.storeId === storeId) : undefined;
  const storeName = stores.find((s) => s.id === storeId)?.name;

  // Start fresh each time the sheet opens.
  useEffect(() => {
    if (open) {
      setStoreId(fixedStoreId ?? null);
      setError(null);
    }
  }, [open, fixedStoreId]);

  // Prefill with the person's earlier review of this store, so saving edits it.
  useEffect(() => {
    if (!open) return;
    setStars(existing?.stars ?? 0);
    setTags((existing?.tags ?? []).filter((t) => REVIEW_TAGS.includes(t)));
    setComment(existing?.comment ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storeId, existing?.id]);

  const save = useMutation({
    mutationFn: api.saveReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      toast.success(existing ? "Your review is updated" : "Thanks for your review!");
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const pickStars = (n: number) => {
    setStars(n);
    const allowed = tagsForStars(n);
    setTags((prev) => prev.filter((t) => allowed.includes(t)));
  };
  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 6 ? prev : [...prev, t]));

  const submit = () => {
    setError(null);
    if (!storeId) return setError("Choose the venue you visited.");
    if (stars < 1) return setError("Tap a star rating.");
    const problem = contentProblem(comment);
    if (problem) return setError(problem);
    save.mutate({ storeId, stars, tags, comment: comment.trim() || null });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? "Edit your review" : "Write a review"}
      description={fixedStoreId && storeName ? storeName : "Rate a venue you've visited. It takes about 10 seconds."}
    >
      {!signedIn ? (
        <SignInCard title="Sign in to review" text="One review per person keeps ratings honest. We only show your first name." />
      ) : (
        <RequireTerms>
          {!fixedStoreId ? (
            <SelectSheet
              label="Venue"
              placeholder="Choose a venue"
              value={storeId ? String(storeId) : null}
              onChange={(v) => setStoreId(Number(v))}
              options={stores.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.suburb}` }))}
            />
          ) : null}

          <View style={styles.field}>
            <AppText variant="label">Your rating</AppText>
            <View style={styles.starsRow}>
              <StarRating value={stars} size={32} onChange={pickStars} />
              {stars > 0 ? <AppText variant="bodyBold" color="mutedForeground">{STAR_LABELS[stars]}</AppText> : null}
            </View>
          </View>

          {stars > 0 ? (
            <View style={styles.field}>
              <AppText variant="label">{stars >= 4 ? "What did you like?" : stars <= 2 ? "What went wrong?" : "What stood out?"}</AppText>
              <View style={styles.tags}>
                {tagsForStars(stars).map((t) => (
                  <Chip key={t} label={t} tone="pick" selected={tags.includes(t)} onPress={() => toggleTag(t)} />
                ))}
              </View>
            </View>
          ) : null}

          <TextField
            label="Anything to add? (optional)"
            value={comment}
            onChangeText={setComment}
            placeholder="e.g. Relaxed lounge, friendly staff and easy parking"
            multiline
            maxLength={500}
            hint="Shown with your first name only. Reviews that mention prices or offers to buy or sell are removed."
          />

          {error ? <ErrorText text={error} /> : null}
          <Button title={existing ? "Update review" : "Post review"} size="lg" onPress={submit} loading={save.isPending} />
        </RequireTerms>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  field: { gap: 8 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
