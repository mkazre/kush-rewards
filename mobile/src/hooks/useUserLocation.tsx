// Where the person is, used to sort venues by distance. After the welcome screens the app asks
// for location (the system prompt) and uses GPS; people can also pick a suburb instead.
// Location stays on the phone; it is never sent to the backend.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { SUBURBS } from "../lib/storeUtils";
import { storage } from "../lib/storage";

export type UserLocation = { lat: number; lng: number; label: string; source: "gps" | "suburb"; accuracyM?: number };

const KEY = "kr-location";
const MANUAL_KEY = "kr-location-manual"; // "1" = they picked a suburb, so don't switch to GPS by ourselves
const DEFAULT: UserLocation = { lat: SUBURBS.Roodepoort[0], lng: SUBURBS.Roodepoort[1], label: "Roodepoort", source: "suburb" };
const DENIED = "Location is off. Allow it in your phone's Settings → Apps → KushRewards → Location, or pick your suburb.";

type Ctx = {
  location: UserLocation;
  setSuburb: (name: string) => void;
  /** "Near me": always asks (or explains how to turn location on). */
  useMyLocation: () => Promise<void>;
  /** Called once the age check and welcome screens are done: asks unless they chose a suburb or said no before. */
  autoLocate: () => Promise<void>;
  locating: boolean;
  error: string | null;
};

const LocationContext = createContext<Ctx | undefined>(undefined);

export const UserLocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<UserLocation>(DEFAULT);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoDone = useRef(false);

  useEffect(() => {
    storage.get(KEY).then((raw) => {
      if (!raw) return;
      try {
        const v = JSON.parse(raw);
        if (typeof v?.lat === "number" && typeof v?.lng === "number" && typeof v?.label === "string") setLocation(v);
      } catch {
        /* ignore bad saved value */
      }
    });
  }, []);

  const save = useCallback((loc: UserLocation) => {
    setLocation(loc);
    storage.set(KEY, JSON.stringify(loc));
  }, []);

  const setSuburb = useCallback(
    (name: string) => {
      const c = SUBURBS[name];
      if (c) {
        setError(null);
        storage.set(MANUAL_KEY, "1");
        save({ lat: c[0], lng: c[1], label: name, source: "suburb" });
      }
    },
    [save]
  );

  /** Gets a precise fix: a quick last-known position first, then a fresh high-accuracy one. */
  const locate = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 200 }).catch(() => null);
      if (last) save({ lat: last.coords.latitude, lng: last.coords.longitude, label: "your location", source: "gps", accuracyM: Math.round(last.coords.accuracy ?? 0) || undefined });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      storage.set(MANUAL_KEY, "0");
      save({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location", source: "gps", accuracyM: Math.round(pos.coords.accuracy ?? 0) || undefined });
    } catch {
      const services = await Location.hasServicesEnabledAsync().catch(() => true);
      setError(services ? "We couldn't find your location. Try again, or pick your suburb." : "Your phone's location (GPS) is switched off. Turn it on, or pick your suburb.");
    } finally {
      setLocating(false);
    }
  }, [save]);

  const useMyLocation = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (perm?.status !== "granted") {
      setError(DENIED);
      return;
    }
    await locate();
  }, [locate]);

  const autoLocate = useCallback(async () => {
    if (autoDone.current) return;
    autoDone.current = true;
    if ((await storage.get(MANUAL_KEY)) === "1") return;
    const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!perm) return;
    if (perm.status === "granted") return locate(); // refresh silently on every launch
    if (perm.canAskAgain) {
      const asked = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (asked?.status === "granted") return locate();
    }
    // They said no: keep the suburb; "Near me" still works if they change their mind.
  }, [locate]);

  return (
    <LocationContext.Provider value={{ location, setSuburb, useMyLocation, autoLocate, locating, error }}>
      {children}
    </LocationContext.Provider>
  );
};

export function useUserLocation(): Ctx {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside UserLocationProvider");
  return ctx;
}
