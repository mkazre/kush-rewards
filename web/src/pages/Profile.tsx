// Profile (HANDOVER 4.5).
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Mail, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router";
import { formatReviewDate } from "@shared/lib/reviewTags";
import type { SubmissionStatus } from "@shared/types/api";
import { SignInCard } from "../components/SignIn";
import { Segmented, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePrefs, type ThemeMode } from "../lib/prefs";
import { keys, useSiteConfig } from "../lib/queries";
import { SUPPORT_EMAIL_FALLBACK } from "../lib/site";
import { useToast } from "../lib/toast";

export const STATUS_PILL: Record<SubmissionStatus, [string, string]> = {
  pending: ["Pending", "bg-accent-soft text-accent-soft-fg"],
  needs_info: ["Needs info", "bg-accent-soft text-accent-soft-fg"],
  approved: ["Approved", "bg-secondary text-secondary-fg"],
  rejected: ["Not approved", "bg-error/15 text-error"],
};

export function AboutLegal() {
  const { user, deleteAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const support = useSiteConfig().data?.supportEmail || SUPPORT_EMAIL_FALLBACK;

  const del = async () => {
    if (!confirm("Delete your account? This permanently deletes your account, your reviews, venue suggestions and reports. It can't be undone.")) return;
    try {
      await deleteAccount();
      toast("Your account has been deleted.");
      navigate("/");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const row = "flex items-center justify-between px-5 py-3.5 hover:bg-muted";
  return (
    <section className="card overflow-hidden">
      <div className="p-5">
        <h2 className="text-lg font-bold">About & legal</h2>
        <p className="mt-2 text-sm text-muted-fg">
          KushRewards SA is an information guide to cannabis clubs and venues for adults 18+ in South Africa. We don't sell cannabis, take orders, handle
          payments or arrange deliveries, and we never share your details with venues. Cannabis is legal in South Africa for private use by adults only;
          trading in it is not. Never drive under the influence.
        </p>
      </div>
      <nav className="divide-y divide-border border-t border-border text-sm font-semibold">
        <Link className={row} to="/privacy">Privacy Policy <ChevronRight size={16} /></Link>
        <Link className={row} to="/terms">Terms of Use <ChevronRight size={16} /></Link>
        <Link className={row} to="/community-rules">Community Rules <ChevronRight size={16} /></Link>
        <a className={row} href={`mailto:${support}`}>Contact support ({support}) <Mail size={16} /></a>
        <Link className={row} to="/support">Help & FAQ <ChevronRight size={16} /></Link>
        {user && <button className={`${row} w-full text-left text-error`} onClick={del}>Delete my account</button>}
      </nav>
    </section>
  );
}

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = usePrefs();
  const subs = useQuery({ queryKey: keys.mySubmissions, queryFn: api.mySubmissions, enabled: !!user, select: (d) => d.submissions });

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold">Profile</h1>
      {!user ? (
        <SignInCard reason="Sign in to write reviews, suggest venues and report wrong info. Browsing venues needs no account." />
      ) : (
        <>
          <section className="card flex items-center gap-4 p-5">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary font-display text-xl font-bold text-secondary-fg">
                {user.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{user.displayName}</p>
              <p className="truncate text-sm text-muted-fg">{user.email}</p>
            </div>
            {user.role === "admin" && (
              <Link to="/admin" className="btn-secondary"><Shield size={16} /> Admin</Link>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">My venue suggestions</h2>
              <Link to="/suggest" className="btn-ghost py-1 text-primary">Suggest</Link>
            </div>
            {subs.isLoading ? (
              <Spinner />
            ) : !subs.data?.length ? (
              <p className="text-sm text-muted-fg">You haven't suggested a venue yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {subs.data.map((s) => {
                  const [label, cls] = STATUS_PILL[s.status];
                  const body = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className={`pill ${cls}`}>{label}</span>
                      </div>
                      <p className="text-sm text-muted-fg">{s.suburb} · {formatReviewDate(s.createdAt)}</p>
                      {s.decisionReason && <p className="mt-1 text-sm">Note from us: {s.decisionReason}</p>}
                    </>
                  );
                  return (
                    <li key={s.id} className="py-3">
                      {s.status === "approved" && s.storeId ? <Link to={`/venue/${s.storeId}`} className="block hover:text-primary">{body}</Link> : body}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Settings</h2>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">Theme</span>
          <Segmented<ThemeMode> options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "auto", label: "Auto" }]} value={theme} onChange={setTheme} />
        </div>
        {user && <button className="btn-secondary w-full" onClick={signOut}>Sign out</button>}
      </section>

      <AboutLegal />
    </div>
  );
}
