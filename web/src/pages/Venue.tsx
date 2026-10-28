// Venue page (HANDOVER 4.2).
import { ArrowLeft, BadgeCheck, Info, MessageCircle, Navigation, Phone, Star } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { DAYS, directionsLink, distanceKm, formatDistance, hasAnyHours, telLink, todayKey, TYPE_LABELS, whatsappLink } from "@shared/lib/storeUtils";
import type { ContactKind } from "@shared/types/api";
import { ReportDialog, ReviewDialog, ReviewItem } from "../components/Reviews";
import { OpenLine } from "../components/StoreCard";
import { Empty, Spinner, Stars, VenueLogo } from "../components/ui";
import { VenueMap } from "../components/VenueMap";
import { api } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import { useReviews, useStores } from "../lib/queries";

export default function Venue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: stores, isLoading } = useStores();
  const { location } = usePrefs();
  const store = stores?.find((s) => s.id === Number(id));
  const { data: reviews } = useReviews({ storeId: Number(id), limit: 100 }, !!store);
  const [showAll, setShowAll] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (!store) {
    return (
      <Empty>
        This venue isn't listed any more. <Link className="font-semibold text-primary underline" to="/">Back to Discover</Link>
      </Empty>
    );
  }

  // Fire-and-forget: the link opens right away and tap errors are never shown.
  const tap = (kind: ContactKind) => void api.trackTap({ storeId: store.id, kind }).catch(() => undefined);
  const callNumber = store.phone || store.whatsapp;
  const mine = reviews?.find((r) => r.isMine);
  const shown = showAll ? reviews ?? [] : (reviews ?? []).slice(0, 3);
  const today = todayKey();
  const km = distanceKm(location, { lat: store.latitude, lng: store.longitude });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button className="btn-ghost -ml-3" onClick={() => (history.length > 1 ? navigate(-1) : navigate("/"))}>
        <ArrowLeft size={18} /> Back
      </button>

      <header className="flex gap-4">
        <VenueLogo name={store.name} type={store.type} logoUrl={store.logoUrl} size={80} />
        <div className="min-w-0">
          {store.isPartner && (
            <span className="pill mb-1 bg-accent-soft text-accent-soft-fg">
              <BadgeCheck size={12} className="mr-1" /> Partner venue
            </span>
          )}
          <h1 className="text-3xl font-extrabold">{store.name}</h1>
          <p className="text-muted-fg">
            {TYPE_LABELS[store.type]} · {store.suburb} · {formatDistance(km)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <OpenLine hours={store.hours} />
            {store.rating && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star size={14} className="fill-accent text-accent" /> {store.rating.average.toFixed(1)}
                <span className="font-normal text-muted-fg">({store.rating.count})</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Contact</h2>
            <div className="grid grid-cols-3 gap-2">
              {store.whatsapp ? (
                <a className="btn bg-whatsapp text-white hover:brightness-110" target="_blank" rel="noopener"
                  href={whatsappLink(store.whatsapp, `Hi ${store.name}, I found you on KushRewards SA. I have a question: `)} onClick={() => tap("whatsapp")}>
                  <MessageCircle size={18} /> WhatsApp
                </a>
              ) : (
                <span className="btn bg-muted text-muted-fg opacity-60">No WhatsApp</span>
              )}
              {callNumber ? (
                <a className="btn-secondary" href={telLink(callNumber)} onClick={() => tap("call")}>
                  <Phone size={18} /> Call
                </a>
              ) : (
                <span className="btn bg-muted text-muted-fg opacity-60">No phone</span>
              )}
              <a className="btn-secondary" target="_blank" rel="noopener" href={directionsLink(store.latitude, store.longitude)} onClick={() => tap("directions")}>
                <Navigation size={18} /> Directions
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-fg">WhatsApp opens your own chat with the venue. KushRewards never sees your messages.</p>
            <div className="mt-4 flex gap-3 rounded-xl bg-muted p-3.5 text-sm text-muted-fg">
              <Info size={18} className="mt-0.5 shrink-0" />
              <p>
                KushRewards is an information guide for adults 18+. We don't sell cannabis, take orders or arrange deliveries. Follow South African law:
                cannabis is for private use only, and never drive under the influence.
              </p>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Reviews</h2>
              <button className="btn-primary py-2" onClick={() => setReviewOpen(true)}>
                {mine ? "Edit your review" : "Write a review"}
              </button>
            </div>
            {store.rating && (
              <div className="card mb-3 flex items-center gap-5 p-4">
                <div className="text-center">
                  <div className="font-display text-4xl font-extrabold">{store.rating.average.toFixed(1)}</div>
                  <Stars value={store.rating.average} size={14} />
                  <div className="text-xs text-muted-fg">{store.rating.count} review{store.rating.count === 1 ? "" : "s"}</div>
                </div>
                {store.rating.topTags.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-fg">Most mentioned</p>
                    <div className="flex flex-wrap gap-1.5">
                      {store.rating.topTags.map((t) => (
                        <span key={t} className="pill bg-secondary text-secondary-fg">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              {shown.length === 0 ? (
                <Empty>No reviews yet. Be the first to review {store.name}.</Empty>
              ) : (
                shown.map((r) => <ReviewItem key={r.id} review={r} onEdit={() => setReviewOpen(true)} />)
              )}
              {!showAll && (reviews?.length ?? 0) > 3 && (
                <button className="btn-ghost w-full" onClick={() => setShowAll(true)}>
                  Show all {reviews!.length} reviews
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <VenueMap stores={[store]} height={220} />
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Opening hours</h2>
            {hasAnyHours(store.hours) ? (
              <table className="w-full text-sm">
                <tbody>
                  {DAYS.map((d) => {
                    const h = store.hours[d.key];
                    return (
                      <tr key={d.key} className={d.key === today ? "font-bold text-primary" : ""}>
                        <td className="py-1">{d.label}</td>
                        <td className="py-1 text-right">{h ? `${h.open} – ${h.close === "00:00" ? "midnight" : h.close}` : "Closed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-fg">Hours not listed yet. Message the venue to check.</p>
            )}
            {store.hoursNote && <p className="mt-2 text-sm text-muted-fg">{store.hoursNote}</p>}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-3 text-lg font-bold">Details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-muted-fg">Address</dt>
                <dd className="font-medium">{store.address || store.suburb}</dd>
              </div>
              {store.whatsapp && (
                <div>
                  <dt className="text-muted-fg">WhatsApp</dt>
                  <dd className="font-medium">{store.whatsapp}</dd>
                </div>
              )}
            </dl>
            {store.features.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 font-bold">Features</h3>
                <div className="flex flex-wrap gap-1.5">
                  {store.features.map((f) => (
                    <span key={f} className="pill bg-muted text-fg">{f}</span>
                  ))}
                </div>
              </>
            )}
            {store.isCommunity && <p className="mt-4 text-xs text-muted-fg">Added by the KushRewards community.</p>}
          </section>
          <button className="btn-ghost w-full text-muted-fg" onClick={() => setReportOpen(true)}>
            Report wrong info about this venue
          </button>
        </aside>
      </div>

      <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} store={store} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} store={store} />
    </div>
  );
}
