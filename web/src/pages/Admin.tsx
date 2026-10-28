// Admin panel (HANDOVER 4.8). The API enforces role = admin on every call.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MessageCircle, Pencil, Phone, Navigation, Plus, Store, Users } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { formatReviewDate, isNegativeTag } from "@shared/lib/reviewTags";
import { TYPE_LABELS } from "@shared/lib/storeUtils";
import type { AdminOverview, AdminStore, AdminSubmission } from "@shared/types/api";
import { StoreEditor } from "../components/StoreEditor";
import { UsersAdmin } from "../components/UsersAdmin";
import { Empty, ErrorBox, Spinner, Stars, VenueLogo } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { keys } from "../lib/queries";
import { useToast } from "../lib/toast";
import { STATUS_PILL } from "./Profile";

type Section = "queue" | "venues" | "reports" | "reviews" | "users";

export default function Admin() {
  const { user, loading } = useAuth();
  const q = useQuery({ queryKey: keys.admin, queryFn: api.adminOverview, enabled: user?.role === "admin" });
  const [section, setSection] = useState<Section | null>(null);
  const [venueFilter, setVenueFilter] = useState<"all" | "live" | "hidden">("all");

  if (loading) return <Spinner />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (q.isLoading) return <Spinner label="Loading admin…" />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  const d = q.data;

  const pending = d.submissions.filter((s) => s.status === "pending" || s.status === "needs_info");
  const openReports = d.reports.filter((r) => r.status === "open");
  const reported = d.reviews.filter((r) => r.reportCount > 0 && r.status === "visible");
  const active: Section = section ?? (pending.length ? "queue" : "venues");
  const wa30 = d.stores.reduce((n, s) => n + s.taps30.whatsapp, 0);

  const chips: [Section, string, number][] = [
    ["queue", "Queue", pending.length],
    ["venues", "Venues", 0],
    ["reports", "Reports", openReports.length],
    ["reviews", "Reviews", reported.length],
    ["users", "Users", 0],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <button className="card p-5 text-left hover:border-primary" onClick={() => { setSection("venues"); setVenueFilter("live"); }}>
          <Store className="text-primary" />
          <p className="mt-2 font-display text-3xl font-extrabold">{d.stores.filter((s) => s.status === "live").length}</p>
          <p className="text-sm text-muted-fg">Live venues</p>
        </button>
        <div className="card p-5">
          <MessageCircle className="text-whatsapp" />
          <p className="mt-2 font-display text-3xl font-extrabold">{wa30}</p>
          <p className="text-sm text-muted-fg">WhatsApp taps, last 30 days</p>
        </div>
        <button className="card p-5 text-left hover:border-primary" onClick={() => setSection("users")}>
          <Users className="text-accent" />
          <p className="mt-2 font-display text-3xl font-extrabold">{d.userCount}</p>
          <p className="text-sm text-muted-fg">Signed-up users</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map(([key, label, n]) => (
          <button key={key} className={`chip ${active === key ? "chip-on" : ""}`} onClick={() => setSection(key)}>
            {label}
            {n > 0 && <span className="pill bg-accent text-accent-fg">{n}</span>}
          </button>
        ))}
      </div>

      {active === "queue" && <Queue d={d} />}
      {active === "venues" && <Venues stores={d.stores} filter={venueFilter} setFilter={setVenueFilter} />}
      {active === "reports" && <Reports d={d} />}
      {active === "reviews" && <ReviewsAdmin d={d} />}
      {active === "users" && <UsersAdmin stores={d.stores} />}
    </div>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.admin });
    qc.invalidateQueries({ queryKey: keys.stores });
    qc.invalidateQueries({ queryKey: keys.allReviews });
  };
}

function useAct() {
  const toast = useToast();
  const refresh = useRefresh();
  return async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
}

function SubmissionCard({ s }: { s: AdminSubmission }) {
  const [note, setNote] = useState(s.decisionReason ?? "");
  const act = useAct();
  const [label, cls] = STATUS_PILL[s.status];
  const decide = (action: "approve" | "needs_info" | "reject", msg: string) =>
    act(() => api.adminDecideSubmission({ id: s.id, action, reason: note.trim() || null }), msg);

  return (
    <article className="card space-y-3 p-5">
      {s.isOwner && <div className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-soft-fg">Owner lead: the submitter owns or manages this venue.</div>}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{s.name}</h3>
          <p className="text-sm text-muted-fg">{TYPE_LABELS[s.type]} · {s.suburb} · by {s.submitterName} on {formatReviewDate(s.createdAt)}</p>
        </div>
        <span className={`pill ${cls}`}>{label}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-fg">Address</dt><dd>{s.address || "–"}</dd>
        <dt className="text-muted-fg">WhatsApp</dt><dd>{s.whatsapp || "–"}</dd>
        <dt className="text-muted-fg">Hours</dt><dd>{s.hoursNote || "–"}</dd>
        <dt className="text-muted-fg">Notes</dt><dd>{s.notes || "–"}</dd>
        <dt className="text-muted-fg">Email</dt><dd>{s.submitterEmail}</dd>
      </dl>
      <input className="input" placeholder="Note to the submitter (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => decide("approve", "Approved. Now set the pin and hours.")}>Approve</button>
        <button className="btn-secondary" onClick={() => decide("needs_info", "Marked as needs info.")}>Needs info</button>
        <button className="btn-ghost text-error" onClick={() => decide("reject", "Rejected.")}>Reject</button>
      </div>
    </article>
  );
}

function Queue({ d }: { d: AdminOverview }) {
  const pending = d.submissions.filter((s) => s.status === "pending" || s.status === "needs_info");
  const decided = d.submissions.filter((s) => s.status === "approved" || s.status === "rejected").slice(0, 10);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-fg">Call or visit a venue before approving it. Approving puts it on the map at the suburb centre; then edit its pin and hours.</p>
      {pending.length ? pending.map((s) => <SubmissionCard key={s.id} s={s} />) : <Empty>Nothing waiting. Nice.</Empty>}
      {decided.length > 0 && (
        <>
          <h2 className="pt-4 text-lg font-bold">Recently decided</h2>
          <ul className="card divide-y divide-border">
            {decided.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                <span><strong>{s.name}</strong> · {s.suburb}</span>
                <span className={`pill ${STATUS_PILL[s.status][1]}`}>{STATUS_PILL[s.status][0]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Venues({ stores, filter, setFilter }: { stores: AdminStore[]; filter: "all" | "live" | "hidden"; setFilter: (f: "all" | "live" | "hidden") => void }) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState<AdminStore | null | "new">(null);
  const shown = stores.filter((s) => filter === "all" || s.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["all", "live", "hidden"] as const).map((f) => (
            <button key={f} className={`chip ${filter === f ? "chip-on" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={18} /> Add venue</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((s) => {
          const all = s.tapsAll.whatsapp + s.tapsAll.call + s.tapsAll.directions;
          return (
            <article key={s.id} className="card p-4">
              <div className="flex gap-3">
                <VenueLogo name={s.name} type={s.type} logoUrl={s.logoUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <button className="truncate text-left font-bold hover:text-primary" onClick={() => setEditing(s)}>{s.name}</button>
                  <p className="text-sm text-muted-fg">
                    {TYPE_LABELS[s.type]} · {s.suburb}
                    {s.isPartner && " · Partner"}
                    {s.status === "hidden" && <span className="pill ml-1 bg-error/15 text-error">Hidden</span>}
                  </p>
                </div>
                <button className="btn-ghost px-2" onClick={() => setEditing(s)} aria-label="Edit"><Pencil size={16} /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-fg">Last 30 days:</span>
                <span className="inline-flex items-center gap-1"><MessageCircle size={14} /> {s.taps30.whatsapp}</span>
                <span className="inline-flex items-center gap-1"><Phone size={14} /> {s.taps30.call}</span>
                <span className="inline-flex items-center gap-1"><Navigation size={14} /> {s.taps30.directions}</span>
                <span className="text-muted-fg">All time: {all}</span>
              </div>
              {s.status === "live" && (
                <Link to={`/venue/${s.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Eye size={14} /> View public page</Link>
              )}
            </article>
          );
        })}
      </div>
      {editing && (
        <StoreEditor key={editing === "new" ? "new" : editing.id} store={editing === "new" ? null : editing} open onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function Reports({ d }: { d: AdminOverview }) {
  const act = useAct();
  const refresh = useRefresh();
  const [editing, setEditing] = useState<AdminStore | null>(null);
  const open = d.reports.filter((r) => r.status === "open");
  if (!open.length) return <Empty>No open reports.</Empty>;
  return (
    <div className="space-y-3">
      {open.map((r) => {
        const store = d.stores.find((s) => s.id === r.storeId);
        return (
          <article key={r.id} className="card space-y-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{r.storeName}</h3>
              <span className="pill bg-muted">{r.field}</span>
            </div>
            <p>{r.details}</p>
            <p className="text-sm text-muted-fg">by {r.reporterName} on {formatReviewDate(r.createdAt)}</p>
            <div className="flex flex-wrap gap-2">
              {store && <button className="btn-secondary" onClick={() => setEditing(store)}>Edit venue</button>}
              <button className="btn-primary" onClick={() => act(() => api.adminResolveReport({ id: r.id, status: "confirmed" }), "Marked as fixed.")}>Fixed</button>
              <button className="btn-ghost" onClick={() => act(() => api.adminResolveReport({ id: r.id, status: "dismissed" }), "Dismissed.")}>Dismiss</button>
            </div>
          </article>
        );
      })}
      {editing && <StoreEditor key={editing.id} store={editing} open onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function ReviewsAdmin({ d }: { d: AdminOverview }) {
  const act = useAct();
  if (!d.reviews.length) return <Empty>No reviews yet.</Empty>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-fg">Reported reviews come first. Act on reports within 24 hours: the Community Rules promise this.</p>
      {d.reviews.map((r) => (
        <article key={r.id} className={`card space-y-2 p-5 ${r.reportCount > 0 && r.status === "visible" ? "border-error/50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <strong>{r.storeName}</strong>
              <Stars value={r.stars} size={14} />
            </div>
            <div className="flex gap-1">
              {r.status === "hidden" && <span className="pill bg-muted">Hidden</span>}
              {r.reportCount > 0 && <span className="pill bg-error/15 text-error">Reported {r.reportCount}×</span>}
            </div>
          </div>
          <p className="text-sm text-muted-fg">{r.authorName} · {r.authorEmail} · {formatReviewDate(r.updatedAt)}</p>
          {r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.tags.map((t) => <span key={t} className={`pill ${isNegativeTag(t) ? "bg-muted" : "bg-secondary text-secondary-fg"}`}>{t}</span>)}
            </div>
          )}
          {r.comment && <p>{r.comment}</p>}
          <div className="flex flex-wrap gap-2">
            {r.status === "visible" ? (
              <>
                <button className="btn-danger" onClick={() => act(() => api.adminReviewStatus({ id: r.id, status: "hidden" }), "Review hidden.")}>Hide review</button>
                {r.reportCount > 0 && (
                  <button className="btn-ghost" onClick={() => act(() => api.adminReviewStatus({ id: r.id, status: "visible" }), "Reports cleared.")}>Keep, clear reports</button>
                )}
              </>
            ) : (
              <button className="btn-secondary" onClick={() => act(() => api.adminReviewStatus({ id: r.id, status: "visible" }), "Review is visible again.")}>Show again</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
