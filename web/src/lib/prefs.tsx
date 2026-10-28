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

type Location = { label: string; lat: number; lng: number; isGps: boolean };

type PrefsCtx = {
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  location: Location;
  setSuburb: (name: string) => void;
  locateMe: () => void;
  locating: boolean;
  locationError: string | null;
};

const Ctx = createContext<PrefsCtx | undefined>(undefined);
const DEFAULT_SUBURB = "Roodepoort";

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
        // Rounded to about 1 km: we only sort by distance.
        save({ label: "Your location", lat: +pos.coords.latitude.toFixed(2), lng: +pos.coords.longitude.toFixed(2), isGps: true });
      },
      () => {
        setLocating(false);
        setLocationError("Location is off. Allow it in your browser, or pick an area instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, location, setSuburb, locateMe, locating, locationError }),
    [theme, setTheme, location, setSuburb, locateMe, locating, locationError]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}
