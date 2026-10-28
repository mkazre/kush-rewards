// Sign-in card and the Community Rules gate (HANDOVER 3.6 and 3.7).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useSiteConfig } from "../lib/queries";
import { useToast } from "../lib/toast";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gsiLoading: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  gsiLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google sign-in couldn't load"));
    document.head.appendChild(s);
  });
  return gsiLoading;
}

/** Google Identity Services button. Hidden until GOOGLE_WEB_CLIENT_ID is set on the server. */
export function GoogleButton() {
  const { data: cfg } = useSiteConfig();
  const { signedIn } = useAuth();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const clientId = cfg?.googleWebClientId;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              signedIn(await api.signInWithGoogle(credential));
            } catch (e) {
              toast((e as Error).message, "error");
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 300 });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, signedIn, toast]);

  if (!clientId) return null;
  return <div ref={ref} className="flex min-h-11 justify-center" />;
}

export function SmallPrint() {
  return (
    <p className="text-center text-xs text-muted-fg">
      By continuing you confirm you're 18 or older and agree to our{" "}
      <Link to="/terms" className="underline">Terms of Use</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
    </p>
  );
}

export function SignInCard({ title = "Sign in", reason }: { title?: string; reason: string }) {
  const loc = useLocation();
  return (
    <div className="card p-6 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-fg">{reason}</p>
      <div className="mx-auto mt-5 flex max-w-xs flex-col gap-3">
        <GoogleButton />
        <Link to="/login" state={{ from: loc.pathname }} className="btn-secondary w-full">
          Sign in with email
        </Link>
      </div>
      <div className="mt-4">
        <SmallPrint />
      </div>
    </div>
  );
}

const RULES = [
  "Be honest: only review venues you've actually visited.",
  "No offering, buying or selling of cannabis or anything else, and no prices or menus.",
  "No harassment, hate speech, threats or personal information about others.",
  "No sexual content, spam or advertising.",
  "Nothing involving anyone under 18.",
];

/** Shows the sign-in card, then the Community Rules, then the form (Google Play UGC policy, Apple 1.2). */
export function RequireTerms({ children, signInReason }: { children: ReactNode; signInReason: string }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!user) return <SignInCard reason={signInReason} />;
  if (user.termsAcceptedAt) return <>{children}</>;

  const agree = async () => {
    setBusy(true);
    try {
      const r = await api.acceptTerms();
      updateUser({ termsAcceptedAt: r.termsAcceptedAt });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold">Community rules</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        {RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-fg">
        Posts that break these rules are removed and repeat offenders are banned. Read the full{" "}
        <Link className="underline" to="/terms">Terms of Use</Link> and <Link className="underline" to="/community-rules">Community Rules</Link>.
      </p>
      <button className="btn-primary mt-5 w-full" onClick={agree} disabled={busy}>
        I agree
      </button>
    </div>
  );
}
