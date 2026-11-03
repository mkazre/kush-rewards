// Admin → Settings: legal details, support email, Google sign-in, demo data.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LEGAL_FIELDS } from "@shared/lib/legalContent";
import { api } from "../lib/api";
import { keys } from "../lib/queries";
import { useToast } from "../lib/toast";
import { ErrorBox, Field, Spinner } from "./ui";

function Section({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-fg">{intro}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: api.adminSettings });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data) setValues(q.data.values);
  }, [q.data]);

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  const { defaults, demo } = q.data;
  const set = (k: string, v: string) => setValues((c) => ({ ...c, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminSaveSettings(values);
      toast("Settings saved.");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      // Refresh the cached public config now, so legal pages show the new values without a reload.
      qc.setQueryData(keys.config, await api.config());
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const removeDemo = async () => {
    if (!confirm(`Remove all demo data? This deletes ${demo.venues} demo venues and ${demo.users} demo reviewers with their ${demo.reviews} reviews and contact taps. Venues and accounts you added are kept. This can't be undone.`)) return;
    try {
      await api.adminRemoveDemo();
      toast("Demo data removed.");
      qc.invalidateQueries();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const filled = LEGAL_FIELDS.filter((f) => values[f.key]?.trim()).length;

  return (
    <form className="space-y-5" onSubmit={save}>
      <Section
        title="Legal details"
        intro={
          <>
            These fill the highlighted blanks in the Privacy Policy and Terms on the website and in the apps (POPIA). {filled} of {LEGAL_FIELDS.length} filled in.
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {LEGAL_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input className="input" maxLength={1000} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Support" intro="Shown on the Support page, in About & legal, and in the legal pages.">
        <Field label="Support email" hint={defaults.support_email ? `Leave empty to use ${defaults.support_email}.` : undefined}>
          <input className="input" type="email" value={values.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} placeholder={defaults.support_email} />
        </Field>
      </Section>

      <Section
        title="Google sign-in"
        intro={
          <>
            From Google Cloud Console → APIs & Services → Credentials (step-by-step in docs/PLAY-STORE.md). Until the web client ID is set, the "Continue with
            Google" button is hidden on the website and in the apps, and people sign in with email. These IDs are public, not passwords. Changes apply without a
            new app release.
          </>
        }
      >
        <Field label="Web client ID (required for website and apps)" hint="Type: Web application. Authorised JavaScript origin: https://kushrewards.online. The Android app also uses this ID to sign in.">
          <input className="input font-mono text-xs" value={values.google_web_client_id ?? ""} onChange={(e) => set("google_web_client_id", e.target.value)} placeholder={defaults.google_web_client_id || "1234-abc.apps.googleusercontent.com"} />
        </Field>
        <Field label="Android client ID" hint="Type: Android. Package za.co.kushrewards.app plus the SHA-1 fingerprints from EAS and from Play Console → App signing.">
          <input className="input font-mono text-xs" value={values.google_android_client_id ?? ""} onChange={(e) => set("google_android_client_id", e.target.value)} placeholder="5678-android.apps.googleusercontent.com" />
        </Field>
        <Field label="iOS client ID" hint="Type: iOS. Bundle ID za.co.kushrewards.app. Only needed when you release on the App Store.">
          <input className="input font-mono text-xs" value={values.google_ios_client_id ?? ""} onChange={(e) => set("google_ios_client_id", e.target.value)} placeholder="9012-ios.apps.googleusercontent.com" />
        </Field>
        <Field label="Other accepted client IDs (optional)" hint="Comma-separated. Only if you use extra OAuth clients.">
          <input className="input font-mono text-xs" value={values.google_client_ids ?? ""} onChange={(e) => set("google_client_ids", e.target.value)} />
        </Field>
      </Section>

      <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>

      <Section
        title="Demo data"
        intro="The site started with made-up venues and reviewers so you could try it out. Remove them before launch. Once removed, demo data is never added again."
      >
        {demo.venues + demo.users === 0 ? (
          <p className="text-sm font-semibold text-success">No demo data left.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {demo.venues} demo venues · {demo.users} demo reviewers · {demo.reviews} reviews
            </p>
            <button type="button" className="btn-danger" onClick={removeDemo}>Remove demo data</button>
          </div>
        )}
      </Section>
    </form>
  );
}
