// Sign in / create account (HANDOVER 4.6).
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { GoogleButton, SmallPrint } from "../components/SignIn";
import { Field, Segmented } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function LoginForm() {
  const { signedIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      signedIn(mode === "signin" ? await api.signInWithPassword(email, password) : await api.register(email, password, name));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted-fg">
        <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex justify-center">
        <Segmented options={[{ value: "signin", label: "Sign in" }, { value: "register", label: "Create account" }]} value={mode} onChange={setMode} />
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <Field label="Your name" hint="Reviews show your first name only.">
            <input className="input" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint={mode === "register" ? "At least 8 characters." : undefined}>
          <input className="input" type="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <SmallPrint />
    </div>
  );
}

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || "/profile";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="mb-1 text-center text-2xl font-extrabold">Welcome to KushRewards</h1>
        <p className="mb-6 text-center text-sm text-muted-fg">Sign in to review venues, suggest new ones and report wrong info.</p>
        <LoginForm />
      </div>
    </div>
  );
}
