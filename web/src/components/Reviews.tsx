// Review card, review dialog and wrong-info report dialog (HANDOVER 4.3.1, 4.3.2, 4.2.1).
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Ban, Pencil } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { contentProblem, offensiveProblem } from "@shared/lib/contentFilter";
import { formatReviewDate, isNegativeTag, STAR_LABELS, tagsForStars, visibleTags } from "@shared/lib/reviewTags";
import { distanceKm } from "@shared/lib/storeUtils";
import { REPORT_FIELDS, type PublicReview, type PublicStore, type ReportField } from "@shared/types/api";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePrefs } from "../lib/prefs";
import { keys } from "../lib/queries";
import { useToast } from "../lib/toast";
import { RequireTerms } from "./SignIn";
import { Field, Modal, StarPicker, Stars } from "./ui";

export function ReviewItem({ review, showStore, onEdit }: { review: PublicReview; showStore?: boolean; onEdit?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [reported, setReported] = useState(false);

  const report = async () => {
    if (!user) return navigate("/login");
    if (!confirm("Report this review? We'll check it against our Community Rules, usually within 24 hours.")) return;
    try {
      await api.reportReview(review.id);
      setReported(true);
      toast("Reported. Thanks for letting us know.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const block = async () => {
    if (!confirm(`Block ${review.authorName}? You won't see their reviews any more. They won't be told.`)) return;
    try {
      const r = await api.blockReviewer(review.id);
      toast(`You won't see reviews from ${r.name} any more.`);
      qc.invalidateQueries({ queryKey: keys.allReviews });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const tags = visibleTags(review.tags);
  return (
    <article className="card p-4">
      {showStore && (
        <Link to={`/venue/${review.storeId}`} className="mb-1 block font-bold hover:text-primary">
          {review.storeName}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.stars} />
        <span className="text-sm font-semibold">{STAR_LABELS[review.stars]}</span>
        {review.isHidden && <span className="pill bg-error/15 text-error">Hidden by admin</span>}
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className={`pill ${isNegativeTag(t) ? "bg-muted text-muted-fg" : "bg-secondary text-secondary-fg"}`}>
              {t}
            </span>
          ))}
        </div>
      )}
      {review.comment && <p className="mt-2 whitespace-pre-line text-[15px]">{review.comment}</p>}
      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-fg">
        <span>
          {review.authorName}
          {review.isMine && " (you)"} · {formatReviewDate(review.updatedAt)}
        </span>
        <div className="flex gap-1">
          {review.isMine ? (
            onEdit && (
              <button className="btn-ghost px-2 py-1" onClick={onEdit}>
                <Pencil size={14} /> Edit
              </button>
            )
          ) : (
            <>
              <button className="btn-ghost px-2 py-1" onClick={report} disabled={reported}>
                <Flag size={14} /> {reported ? "Reported" : "Report"}
              </button>
              {user && (
                <button className="btn-ghost px-2 py-1" onClick={block}>
                  <Ban size={14} /> Block
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ReviewDialog({
  open,
  onClose,
  store,
  stores,
  initialStoreId,
}: {
  open: boolean;
  onClose: () => void;
  /** Fixed venue (venue page); otherwise a picker over `stores` is shown. */
  store?: PublicStore;
  stores?: PublicStore[];
  /** Pre-selects the picker, e.g. when editing a review from the Reviews tab. */
  initialStoreId?: number;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { location } = usePrefs();
  const [storeId, setStoreId] = useState<number | "">(store?.id ?? "");
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...(stores ?? [])].sort((a, b) => distanceKm(location, { lat: a.latitude, lng: a.longitude }) - distanceKm(location, { lat: b.latitude, lng: b.longitude })),
    [stores, location]
  );

  useEffect(() => {
    if (open && !store) setStoreId(initialStoreId ?? "");
  }, [open, store, initialStoreId]);

  // Load the existing review so re-reviewing edits it (one per person per venue).
  useEffect(() => {
    if (!open) return;
    setError(null);
    const id = store?.id ?? storeId;
    if (!id || !user) {
      setStars(0);
      setTags([]);
      setComment("");
      return;
    }
    api.listReviews({ mine: true, limit: 100 }).then((r) => {
      const mine = r.reviews.find((x) => x.storeId === id);
      setStars(mine?.stars ?? 0);
      setTags(mine ? visibleTags(mine.tags) : []);
      setComment(mine?.comment ?? "");
    }).catch(() => undefined);
  }, [open, store?.id, storeId, user]);

  const offered = tagsForStars(stars);
  const pickStars = (n: number) => {
    setStars(n);
    setTags((t) => t.filter((x) => tagsForStars(n).includes(x)));
  };
  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < 6 ? [...cur, t] : cur));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const id = store?.id ?? storeId;
    if (!id) return setError("Pick a venue.");
    if (!stars) return setError("Tap the stars to rate the venue.");
    const problem = contentProblem(comment);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await api.saveReview({ storeId: Number(id), stars, tags, comment: comment.trim() || null });
      toast("Thanks for your review!");
      qc.invalidateQueries({ queryKey: keys.allReviews });
      qc.invalidateQueries({ queryKey: keys.stores });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const heading = stars >= 4 ? "What did you like?" : stars > 0 && stars <= 2 ? "What went wrong?" : "What stood out?";

  return (
    <Modal open={open} onClose={onClose} title={store ? `Review ${store.name}` : "Write a review"}>
      <RequireTerms signInReason="Sign in to write a review. It only takes a few seconds.">
        <form onSubmit={submit} className="space-y-5">
          {!store && (
            <Field label="Venue">
              <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Pick a venue…</option>
                {sorted.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.suburb}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div>
            <span className="label">Your rating</span>
            <StarPicker value={stars} onChange={pickStars} />
          </div>
          {offered.length > 0 && (
            <div>
              <span className="label">{heading}</span>
              <div className="flex flex-wrap gap-2">
                {offered.map((t) => (
                  <button type="button" key={t} onClick={() => toggleTag(t)} className={`chip ${tags.includes(t) ? "chip-on" : ""}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field label="Anything to add? (optional)" hint="Shown with your first name only. Reviews that mention prices or offers to buy or sell are removed.">
            <textarea className="input min-h-24" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Relaxed lounge, friendly staff and easy parking" />
          </Field>
          {error && <p className="text-sm font-medium text-error">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? "Saving…" : "Post review"}
          </button>
        </form>
      </RequireTerms>
    </Modal>
  );
}

export function ReportDialog({ open, onClose, store }: { open: boolean; onClose: () => void; store: PublicStore }) {
  const toast = useToast();
  const [field, setField] = useState<ReportField>("Hours");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 3) return setError("Tell us what's wrong in a few words");
    const problem = offensiveProblem(details);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await api.createReport({ storeId: store.id, field, details: details.trim() });
      toast("Thanks! We'll check it and fix the listing.");
      setDetails("");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report wrong info">
      <RequireTerms signInReason="Sign in to report wrong information about a venue.">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <span className="label">What's wrong?</span>
            <div className="flex flex-wrap gap-2">
              {REPORT_FIELDS.map((f) => (
                <button type="button" key={f} onClick={() => setField(f)} className={`chip ${field === f ? "chip-on" : ""}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Field label="Tell us more">
            <textarea className="input min-h-24" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Closes at 20:00 on Sundays" />
          </Field>
          {error && <p className="text-sm font-medium text-error">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            Send report
          </button>
        </form>
      </RequireTerms>
    </Modal>
  );
}
