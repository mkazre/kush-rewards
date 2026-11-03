// Welcome (splash) screens from Admin → Splash screens. SplashSlide renders one screen and is
// also used for the live preview in the admin panel; SplashOverlay shows them when the site opens.
import { useQuery } from "@tanstack/react-query";
import { Compass, Heart, Leaf, MapPin, MessageCircle, PartyPopper, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { SplashScreen } from "@shared/types/api";
import { api } from "../lib/api";
import { store } from "../lib/prefs";

export const SPLASH_ICON_COMPONENTS: Record<string, LucideIcon> = {
  leaf: Leaf,
  "map-pin": MapPin,
  star: Star,
  "message-circle": MessageCircle,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  heart: Heart,
  users: Users,
  compass: Compass,
  "party-popper": PartyPopper,
};

/** One screen. `compact` scales it down for the admin preview. */
export function SplashSlide({ s, compact = false }: { s: SplashScreen; compact?: boolean }) {
  const Icon = SPLASH_ICON_COMPONENTS[s.icon ?? "leaf"] ?? Leaf;
  const full = s.layout === "full" && s.imageUrl;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center" style={{ background: s.bgColor, color: s.textColor }}>
      {full && (
        <>
          <img src={s.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${(s.overlay / 100) * 0.4}) 0%, rgba(0,0,0,${s.overlay / 100}) 70%)` }} />
        </>
      )}
      <div className={`relative flex w-full flex-col items-center ${compact ? "gap-2 px-4" : "max-w-md gap-5 px-8"} ${full ? "mt-auto pb-[22%]" : ""}`}>
        {s.layout === "block" && s.imageUrl && (
          <img src={s.imageUrl} alt="" className={`${compact ? "max-h-24 rounded-xl" : "max-h-[42vh] rounded-3xl"} w-auto max-w-full object-contain shadow-2xl`} />
        )}
        {s.layout === "icon" && (
          <div
            className={`flex items-center justify-center rounded-full ${compact ? "h-16 w-16" : "h-32 w-32"}`}
            style={{ background: `${s.accentColor}22`, boxShadow: `0 0 0 ${compact ? 6 : 14}px ${s.accentColor}11` }}
          >
            <Icon size={compact ? 32 : 64} color={s.accentColor} strokeWidth={1.75} />
          </div>
        )}
        {s.heading && <h2 className={`font-display font-extrabold leading-tight ${compact ? "text-base" : "text-3xl md:text-4xl"}`}>{s.heading}</h2>}
        {s.body && <p className={`${compact ? "text-[10px] leading-snug" : "text-base md:text-lg"} opacity-85`}>{s.body}</p>}
      </div>
    </div>
  );
}

const SEEN_KEY = "kr-splash-seen";

function sessionSeen(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/** Shows the enabled screens once per version (first_launch) or every visit (every_launch). */
export function SplashOverlay() {
  const { data } = useQuery({ queryKey: ["splash"], queryFn: api.splash, staleTime: 5 * 60_000 });
  const [dismissed, setDismissed] = useState(false);
  const [i, setI] = useState(0);
  const screens = data?.screens ?? [];
  const show =
    !dismissed &&
    !!data &&
    screens.length > 0 &&
    data.mode !== "off" &&
    (data.mode === "every_launch" ? sessionSeen() !== data.version : store.get(SEEN_KEY) !== data.version);

  const finish = () => {
    if (data) {
      store.set(SEEN_KEY, data.version);
      try {
        sessionStorage.setItem(SEEN_KEY, data.version);
      } catch {
        /* private mode */
      }
    }
    setDismissed(true);
  };

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, screens.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, screens.length]);

  if (!show) return null;
  const s = screens[Math.min(i, screens.length - 1)];
  const last = i >= screens.length - 1;

  return (
    <div className="fixed inset-0 z-[3000]" role="dialog" aria-modal="true" aria-label="Welcome">
      <div key={s.id} className="h-full w-full animate-[fadein_.35s_ease]">
        <SplashSlide s={s} />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2" aria-hidden="true">
          {screens.map((x, n) => (
            <span key={x.id} className="h-2 rounded-full transition-all" style={{ width: n === i ? 24 : 8, background: n === i ? s.accentColor : `${s.textColor}55` }} />
          ))}
        </div>
        <div className="flex w-full max-w-md gap-3">
          {!last && (
            <button className="btn flex-1 py-3" style={{ color: s.textColor }} onClick={finish}>
              Skip
            </button>
          )}
          <button
            className="btn flex-1 py-3 shadow-lg"
            style={{ background: s.accentColor, color: s.bgColor }}
            onClick={() => (last ? finish() : setI(i + 1))}
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
