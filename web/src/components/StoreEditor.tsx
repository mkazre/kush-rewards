// Admin venue editor (HANDOVER 4.8). No price level or products in v2.
import { useState, type FormEvent } from "react";
import { DAYS, FEATURE_OPTIONS, parseLocation, SUBURBS, TYPE_LABELS } from "@shared/lib/storeUtils";
import type { AdminStore, DayKey, StoreSaveInput, StoreStatus, StoreType, WeekHours } from "@shared/types/api";
import { api } from "../lib/api";
import { LISTED_TYPES } from "../lib/site";
import { Field, Modal, Segmented, VenueLogo } from "./ui";

function blank(): StoreSaveInput {
  const [lat, lng] = SUBURBS.Roodepoort;
  return {
    id: null, name: "", type: LISTED_TYPES[0], suburb: "Roodepoort", address: "", latitude: lat, longitude: lng,
    whatsapp: null, phone: null, hours: {}, hoursNote: null, features: [], isPartner: false, status: "live", logoUrl: null,
  };
}

function fromStore(s: AdminStore): StoreSaveInput {
  return {
    id: s.id, name: s.name, type: s.type, suburb: s.suburb, address: s.address, latitude: s.latitude, longitude: s.longitude,
    whatsapp: s.whatsapp, phone: s.phone, hours: s.hours ?? {}, hoursNote: s.hoursNote, features: s.features,
    isPartner: s.isPartner, status: s.status, logoUrl: s.logoUrl,
  };
}

export function StoreEditor({ store, open, onClose, onSaved }: { store: AdminStore | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<StoreSaveInput>(() => (store ? fromStore(store) : blank()));
  const [pinText, setPinText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof StoreSaveInput>(k: K, v: StoreSaveInput[K]) => setF((c) => ({ ...c, [k]: v }));

  const setDay = (day: DayKey, h: WeekHours[DayKey]) => set("hours", { ...f.hours, [day]: h });
  const copyMonday = () => set("hours", Object.fromEntries(DAYS.map((d) => [d.key, f.hours.mon ?? null])));

  const applyPin = () => {
    const p = parseLocation(pinText);
    if (!p) return setError("Couldn't read that. Paste a Google Maps link or \"-26.16, 27.87\" (inside South Africa).");
    setError(null);
    setF((c) => ({ ...c, latitude: p.lat, longitude: p.lng }));
    setPinText("");
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      set("logoUrl", await api.uploadLogo(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminSaveStore({ ...f, whatsapp: f.whatsapp?.trim() || null, phone: f.phone?.trim() || null, hoursNote: f.hoursNote?.trim() || null });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={f.id ? `Edit ${store?.name}` : "Add venue"}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-4">
          <VenueLogo name={f.name || "?"} type={f.type} logoUrl={f.logoUrl} size={64} />
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading…" : f.logoUrl ? "Change logo" : "Upload logo"}
              <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {f.logoUrl && <button type="button" className="btn-ghost" onClick={() => set("logoUrl", null)}>Remove</button>}
          </div>
        </div>
        <p className="-mt-3 text-xs text-muted-fg">PNG, JPG, WEBP, GIF or SVG up to 5 MB. Save to apply it.</p>

        <Field label="Name"><input className="input" required maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="label">Type</span>
            <Segmented<StoreType> options={(["dispensary", "club", "lounge"] as StoreType[]).map((t) => ({ value: t, label: TYPE_LABELS[t] }))} value={f.type} onChange={(v) => set("type", v)} />
          </div>
          <div>
            <span className="label">Visibility</span>
            <Segmented<StoreStatus> options={[{ value: "live", label: "Live" }, { value: "hidden", label: "Hidden" }]} value={f.status} onChange={(v) => set("status", v)} />
          </div>
        </div>
        <Field label="Suburb">
          <select className="input" value={f.suburb} onChange={(e) => set("suburb", e.target.value)}>
            {Object.keys(SUBURBS).sort().map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Street address"><input className="input" maxLength={200} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>

        <div>
          <span className="label">Map pin</span>
          <p className="mb-2 text-sm text-muted-fg">{f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}</p>
          <div className="flex gap-2">
            <input className="input" placeholder="Paste a Google Maps link or -26.16, 27.87" value={pinText} onChange={(e) => setPinText(e.target.value)} />
            <button type="button" className="btn-secondary" onClick={applyPin}>Set</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <button type="button" className="btn-ghost py-1" onClick={() => { const [lat, lng] = SUBURBS[f.suburb]; setF((c) => ({ ...c, latitude: lat, longitude: lng })); }}>Use suburb centre</button>
            <a className="btn-ghost py-1" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${f.latitude},${f.longitude}`}>Check on Google Maps</a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp"><input className="input" maxLength={30} value={f.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="Phone (if different)"><input className="input" maxLength={30} value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Opening hours</span>
            <button type="button" className="btn-ghost py-1 text-sm" onClick={copyMonday}>Copy Monday to every day</button>
          </div>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const h = f.hours[d.key] ?? null;
              return (
                <div key={d.key} className="flex items-center gap-2 text-sm">
                  <label className="flex w-20 items-center gap-2 font-semibold">
                    <input type="checkbox" checked={!!h} onChange={(e) => setDay(d.key, e.target.checked ? { open: "10:00", close: "20:00" } : null)} />
                    {d.label}
                  </label>
                  {h ? (
                    <>
                      <input type="time" className="input py-1.5" value={h.open} onChange={(e) => setDay(d.key, { ...h, open: e.target.value })} />
                      <span>–</span>
                      <input type="time" className="input py-1.5" value={h.close} onChange={(e) => setDay(d.key, { ...h, close: e.target.value })} />
                    </>
                  ) : (
                    <span className="text-muted-fg">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
          <input className="input mt-2" maxLength={200} placeholder="Note, e.g. Public holidays 12:00 to 18:00" value={f.hoursNote ?? ""} onChange={(e) => set("hoursNote", e.target.value)} />
        </div>

        <div>
          <span className="label">Features</span>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((t) => {
              const on = f.features.includes(t);
              return (
                <button type="button" key={t} className={`chip ${on ? "chip-on" : ""}`} onClick={() => set("features", on ? f.features.filter((x) => x !== t) : [...f.features, t])}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={f.isPartner} onChange={(e) => set("isPartner", e.target.checked)} />
          Partner venue (badge and green pin)
        </label>

        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy || uploading}>{busy ? "Saving…" : "Save venue"}</button>
      </form>
    </Modal>
  );
}
