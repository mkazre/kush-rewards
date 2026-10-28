// Small building blocks used across pages.
import { Star, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { STAR_LABELS } from "@shared/lib/reviewTags";
import { storeInitials } from "@shared/lib/storeUtils";
import type { StoreType } from "@shared/types/api";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-accent text-accent" : "text-border"} />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => onChange(i)} className="p-1">
            <Star size={32} className={i <= value ? "fill-accent text-accent" : "text-border hover:text-accent"} />
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-muted-fg">{STAR_LABELS[value]}</span>
    </div>
  );
}

const TYPE_TINT: Record<StoreType, string> = {
  dispensary: "bg-secondary text-secondary-fg",
  club: "bg-accent-soft text-accent-soft-fg",
  lounge: "bg-muted text-fg",
};

export function VenueLogo({ name, type, logoUrl, size = 56 }: { name: string; type: StoreType; logoUrl: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (logoUrl) {
    return (
      <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1c1c1c]" style={style}>
        <img src={logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold ${TYPE_TINT[type]}`} style={{ ...style, fontSize: size * 0.34 }}>
      {storeInitials(name) || "?"}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-fg">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-error">{error}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${o.value === value ? "bg-card shadow-sm" : "text-muted-fg hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted-fg" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card px-6 py-10 text-center text-muted-fg">{children}</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const text = error instanceof Error ? error.message : "Something went wrong.";
  return <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{text}</div>;
}
