// Admin → Splash screens: four welcome screens for the apps and website, with a live preview.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SplashLayout, SplashMode, SplashScreen } from "@shared/types/api";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { SPLASH_ICON_COMPONENTS, SplashSlide } from "./Splash";
import { ErrorBox, Field, Segmented, Spinner } from "./ui";

const LAYOUTS: { value: SplashLayout; label: string }[] = [
  { value: "full", label: "Full-screen image" },
  { value: "block", label: "Image block" },
  { value: "icon", label: "Icon" },
  { value: "text", label: "Text only" },
];

const MODES: { value: SplashMode; label: string }[] = [
  { value: "first_launch", label: "First time only" },
  { value: "every_launch", label: "Every time" },
  { value: "off", label: "Never" },
];

/** Colour themes for one-click styling; every colour can still be changed by hand. */
const PRESETS = [
  { name: "Forest", bgColor: "#0e1611", textColor: "#e5ebe5", accentColor: "#57b784" },
  { name: "Emerald", bgColor: "#1d6842", textColor: "#ffffff", accentColor: "#fcf0d5" },
  { name: "Deep green", bgColor: "#123524", textColor: "#f2f5f0", accentColor: "#e8b245" },
  { name: "Sage", bgColor: "#f2f5f0", textColor: "#15231b", accentColor: "#1d6842" },
  { name: "Marigold", bgColor: "#e1a52d", textColor: "#291b00", accentColor: "#15231b" },
  { name: "Night", bgColor: "#000000", textColor: "#ffffff", accentColor: "#57b784" },
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
        <input className="w-full bg-transparent font-mono text-sm outline-none" value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

function ScreenEditor({ s, onChange }: { s: SplashScreen; onChange: (s: SplashScreen) => void }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof SplashScreen>(k: K, v: SplashScreen[K]) => onChange({ ...s, [k]: v });

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      set("imageUrl", await api.uploadImage(file, "splash"));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const needsImage = s.layout === "full" || s.layout === "block";

  return (
    <article className={`card grid gap-5 p-5 md:grid-cols-[220px_1fr] ${s.enabled ? "" : "opacity-70"}`}>
      {/* Live preview in a phone frame */}
      <div className="mx-auto w-[200px] md:mx-0">
        <div className="aspect-[9/19] overflow-hidden rounded-[28px] border-[6px] border-fg/80 shadow-xl">
          <SplashSlide s={s} compact />
        </div>
        <p className="mt-2 text-center text-xs text-muted-fg">Screen {s.id} preview</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Screen {s.id}</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Show this screen
          </label>
        </div>

        <div>
          <span className="label">Layout</span>
          <Segmented options={LAYOUTS} value={s.layout} onChange={(v) => set("layout", v)} />
        </div>

        {needsImage && (
          <div className="flex flex-wrap items-center gap-3">
            {s.imageUrl && <img src={s.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <label className="btn-secondary cursor-pointer">
              <ImagePlus size={16} /> {uploading ? "Uploading…" : s.imageUrl ? "Change image" : "Upload image"}
              <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {s.imageUrl && (
              <button type="button" className="btn-ghost text-error" onClick={() => set("imageUrl", null)}>
                <Trash2 size={16} /> Remove
              </button>
            )}
            <p className="w-full text-xs text-muted-fg">
              {s.layout === "full" ? "Portrait photos work best (about 1080 × 1920). Text sits at the bottom over a dark fade." : "Shown as a rounded card above the text. Square or landscape works well."} Up to 5 MB.
            </p>
          </div>
        )}

        {s.layout === "full" && s.imageUrl && (
          <label className="block">
            <span className="label">Darken image for readable text: {s.overlay}%</span>
            <input type="range" min={0} max={80} value={s.overlay} onChange={(e) => set("overlay", Number(e.target.value))} className="w-full accent-[var(--c-primary)]" />
          </label>
        )}

        {s.layout === "icon" && (
          <div>
            <span className="label">Icon</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SPLASH_ICON_COMPONENTS).map(([key, Icon]) => (
                <button key={key} type="button" aria-label={key} onClick={() => set("icon", key)} className={`chip px-2.5 ${s.icon === key ? "chip-on" : ""}`}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Heading (optional)">
          <input className="input" maxLength={80} value={s.heading ?? ""} onChange={(e) => set("heading", e.target.value)} />
        </Field>
        <Field label="Text (optional)">
          <textarea className="input min-h-20" maxLength={300} value={s.body ?? ""} onChange={(e) => set("body", e.target.value)} />
        </Field>

        <div>
          <span className="label">Colour theme</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" className="chip" onClick={() => onChange({ ...s, bgColor: p.bgColor, textColor: p.textColor, accentColor: p.accentColor })}>
                <span className="h-4 w-4 rounded-full border border-border" style={{ background: p.bgColor }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorField label="Background" value={s.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Text" value={s.textColor} onChange={(v) => set("textColor", v)} />
          <ColorField label="Buttons & dots" value={s.accentColor} onChange={(v) => set("accentColor", v)} />
        </div>
      </div>
    </article>
  );
}

export function SplashAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["admin", "splash"], queryFn: api.adminSplash });
  const [mode, setMode] = useState<SplashMode>("first_launch");
  const [screens, setScreens] = useState<SplashScreen[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data) {
      setMode(q.data.mode);
      setScreens(q.data.screens);
    }
  }, [q.data]);

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;

  const save = async () => {
    setBusy(true);
    try {
      await api.adminSaveSplash(mode, screens);
      toast("Splash screens saved. The apps and website pick them up within a few minutes.");
      qc.invalidateQueries({ queryKey: ["admin", "splash"] });
      qc.invalidateQueries({ queryKey: ["splash"] });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const preview = () => {
    try {
      localStorage.removeItem("kr-splash-seen");
      sessionStorage.removeItem("kr-splash-seen");
    } catch {
      /* ignore */
    }
    window.location.assign("/");
  };

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Welcome screens</h2>
          <p className="text-sm text-muted-fg">Shown when someone opens the app or website, after the age check. Save first, then preview.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={MODES} value={mode} onChange={setMode} />
          <button type="button" className="btn-ghost" onClick={preview}>Preview on site</button>
        </div>
      </section>

      {screens.map((s, i) => (
        <ScreenEditor key={s.id} s={s} onChange={(next) => setScreens((cur) => cur.map((x, j) => (j === i ? next : x)))} />
      ))}

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <button className="btn-primary w-full py-3 shadow-xl" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save splash screens"}
        </button>
      </div>
    </div>
  );
}
