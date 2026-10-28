// Reviews tab (HANDOVER 4.3).
import { useState } from "react";
import { ReviewDialog, ReviewItem } from "../components/Reviews";
import { SignInCard } from "../components/SignIn";
import { Empty, ErrorBox, Segmented, Spinner } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useReviews, useStores } from "../lib/queries";

export default function ReviewsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"latest" | "mine">("latest");
  const [open, setOpen] = useState(false);
  const [editStoreId, setEditStoreId] = useState<number | undefined>();
  const write = (storeId?: number) => {
    setEditStoreId(storeId);
    setOpen(true);
  };
  const { data: stores } = useStores();
  const latest = useReviews({ limit: 50 }, tab === "latest");
  const mine = useReviews({ mine: true, limit: 100 }, tab === "mine" && !!user);
  const q = tab === "latest" ? latest : mine;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Reviews</h1>
          <p className="mt-1 text-muted-fg">What locals say about venues on the West Rand. Been somewhere lately? Rate it in 10 seconds.</p>
        </div>
        <button className="btn-primary" onClick={() => write()}>Write a review</button>
      </div>
      <Segmented options={[{ value: "latest", label: "Latest" }, { value: "mine", label: "My reviews" }]} value={tab} onChange={setTab} />

      {tab === "mine" && !user ? (
        <SignInCard reason="Sign in to see and edit your reviews." />
      ) : q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !q.data?.length ? (
        <Empty>{tab === "latest" ? "No reviews yet. Be the first: tap Write a review." : "You haven't reviewed a venue yet."}</Empty>
      ) : (
        <div className="space-y-3">
          {q.data.map((r) => (
            <ReviewItem key={r.id} review={r} showStore onEdit={() => write(r.storeId)} />
          ))}
        </div>
      )}
      <ReviewDialog open={open} onClose={() => setOpen(false)} stores={stores} initialStoreId={editStoreId} />
    </div>
  );
}
