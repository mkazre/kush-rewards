// Per-browser preferences: theme and location. Location stays in this browser and is never
// sent to the server (Privacy Policy, HANDOVER 3.8).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUBURBS } from "@shared/lib/storeUtils";

export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  },
};

export type ThemeMode = "light" | "dark" | "auto";

type Location = { label: string; lat: number; lng: number; isGps: boolean; accuracyM?: number };

type PrefsCtx = {
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  location: Location;
  setSuburb: (name: string) => void;
  locateMe: () => void;
  /** Asks for location automatically (the browser shows its prompt) unless the person picked an area by hand or blocked location. */
  autoLocate: () => void;
  locating: boolean;
  locationError: string | null;
};

const Ctx = createContext<PrefsCtx | undefined>(undefined);
const DEFAULT_SUBURB = "Roodepoort";
const MANUAL_KEY = "kr-location-manual";

function suburbLocation(name: string): Location {
  const [lat, lng] = SUBURBS[name] ?? SUBURBS[DEFAULT_SUBURB];
  return { label: SUBURBS[name] ? name : DEFAULT_SUBURB, lat, lng, isGps: false };
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => (store.get("kr-theme-mode") as ThemeMode) || "auto");
  const [location, setLocation] = useState<Location>(() => {
    try {
      const saved = JSON.parse(store.get("kr-location") || "null");
      if (saved && typeof saved.lat === "number") return saved;
    } catch {
      /* ignore */
    }
    return suburbLocation(DEFAULT_SUBURB);
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "auto" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((m: ThemeMode) => {
    setThemeState(m);
    store.set("kr-theme-mode", m);
  }, []);

  const save = (l: Location) => {
    setLocation(l);
    store.set("kr-location", JSON.stringify(l));
  };

  const setSuburb = useCallback((name: string) => {
    setLocationError(null);
    store.set(MANUAL_KEY, "1"); // they chose an area: don't override it with GPS
    save(suburbLocation(name));
  }, []);

  const locateMe = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Your browser can't share your location. Pick an area instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        store.set(MANUAL_KEY, "0");
        // Full precision so distances are accurate. It never leaves this browser.
        save({ label: "Your location", lat: pos.coords.latitude, lng: pos.coords.longitude, isGps: true, accuracyM: Math.round(pos.coords.accuracy) });
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings (the icon left of the address bar), or pick an area."
            : "We couldn't find your location. Try again, or pick an area."
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }, []);

  const autoLocate = useCallback(() => {
    if (store.get(MANUAL_KEY) === "1" || !("geolocation" in navigator)) return;
    const go = () => locateMe();
    // Don't nag people who already said no; the "Near me" button still works.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => p.state !== "denied" && go())
        .catch(go);
    } else {
      go();
    }
  }, [locateMe]);

  const value = useMemo(
    () => ({ theme, setTheme, location, setSuburb, locateMe, autoLocate, locating, locationError }),
    [theme, setTheme, location, setSuburb, locateMe, autoLocate, locating, locationError]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}
