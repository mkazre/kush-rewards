// Suggest a venue (HANDOVER 4.4).
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { contentProblem } from "@shared/lib/contentFilter";
import { SUBURBS, TYPE_LABELS } from "@shared/lib/storeUtils";
import type { StoreType } from "@shared/types/api";
import { RequireTerms } from "../components/SignIn";
import { Field, Segmented } from "../components/ui";
import { api } from "../lib/api";
import { keys, useStores } from "../lib/queries";
import { LISTED_TYPES } from "../lib/site";

const STOP_WORDS = new Set(["the", "and", "club", "lounge", "dispensary", "social", "cafe", "bar"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

export default function Suggest() {
  const qc = useQueryClient();
  const { data: stores } = useStores();
  const empty = { name: "", type: LISTED_TYPES[0] as StoreType, suburb: "Roodepoort", address: "", whatsapp: "", hoursNote: "", notes: "", isOwner: false };
  const [f, setF] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  // "This might already be listed" hint (client-side only).
  const duplicate = useMemo(() => {
    const mine = words(f.name);
    if (!mine.length) return null;
    return stores?.find((s) => words(s.name).some((w) => mine.includes(w))) ?? null;
  }, [f.name, stores]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (f.name.trim().length < 2) return setError("Enter the venue's name");
    if (!f.address.trim() && !f.whatsapp.trim()) return setError("Add a street address or a WhatsApp number so we can check the venue.");
    const problem = contentProblem(f.notes) || contentProblem(f.hoursNote);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await api.createSubmission({
        name: f.name.trim(), type: f.type, suburb: f.suburb, address: f.address.trim(),
        whatsapp: f.whatsapp.trim() || null, hoursNote: f.hoursNote.trim() || null, notes: f.notes.trim() || null, isOwner: f.isOwner,
      });
      qc.invalidateQueries({ queryKey: keys.mySubmissions });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Suggest a venue</h1>
        <p className="mt-1 text-muted-fg">
          Know a cannabis club or venue that isn't listed? Tell us about it. We check every venue before it goes on the map, usually within 72 hours.
        </p>
      </div>
      <RequireTerms signInReason="Sign in to suggest a venue. We'll let you know when it's approved.">
        {done ? (
          <div className="card p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto text-success" />
            <h2 className="mt-3 text-2xl font-bold">Thanks, we've got it</h2>
            <p className="mt-1 text-muted-fg">We'll check the venue and add it to the map.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button className="btn-secondary" onClick={() => { setF(empty); setDone(false); }}>Add another</button>
              <Link className="btn-primary" to="/profile">See my submissions</Link>
            </div>
          </div>
        ) : (
          <form className="card space-y-5 p-6" onSubmit={submit}>
            <Field label="Venue name">
              <input className="input" maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            {duplicate && (
              <p className="-mt-3 text-sm text-accent-soft-fg">
                This might already be listed as{" "}
                <Link className="font-semibold underline" to={`/venue/${duplicate.id}`}>{duplicate.name}</Link> in {duplicate.suburb}.
              </p>
            )}
            <div>
              <span className="label">Type</span>
              <Segmented options={LISTED_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} value={f.type} onChange={(v) => set("type", v)} />
            </div>
            <Field label="Suburb">
              <select className="input" value={f.suburb} onChange={(e) => set("suburb", e.target.value)}>
                {Object.keys(SUBURBS).sort().map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Street address or landmark">
                <input className="input" maxLength={200} value={f.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="WhatsApp or phone number">
                <input className="input" maxLength={30} inputMode="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
            </div>
            <Field label="Opening hours (optional)">
              <input className="input" maxLength={200} value={f.hoursNote} onChange={(e) => set("hoursNote", e.target.value)} placeholder="e.g. Mon to Sat, 10:00 to 20:00" />
            </Field>
            <Field label="Anything else? (optional)">
              <textarea className="input min-h-24" maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="h-5 w-5 accent-[var(--c-primary)]" checked={f.isOwner} onChange={(e) => set("isOwner", e.target.checked)} />
              I own or manage this venue
            </label>
            {error && <p className="text-sm font-medium text-error">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Sending…" : "Send for approval"}</button>
          </form>
        )}
      </RequireTerms>
    </div>
  );
}
