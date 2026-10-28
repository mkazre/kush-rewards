// Where the person is, used to sort stores by distance. Defaults to Roodepoort;
// they can pick a suburb or share GPS. Location stays on the phone; it is never
// sent to the backend.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { SUBURBS } from "../lib/storeUtils";
import { storage } from "../lib/storage";

export type UserLocation = { lat: number; lng: number; label: string; source: "gps" | "suburb" };

const KEY = "kr-location";
const DEFAULT: UserLocation = { lat: SUBURBS.Roodepoort[0], lng: SUBURBS.Roodepoort[1], label: "Roodepoort", source: "suburb" };

type Ctx = {
  location: UserLocation;
  setSuburb: (name: string) => void;
  useMyLocation: () => Promise<void>;
  locating: boolean;
  error: string | null;
};

const LocationContext = createContext<Ctx | undefined>(undefined);

export const UserLocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<UserLocation>(DEFAULT);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        save({ lat: c[0], lng: c[1], label: name, source: "suburb" });
      }
    },
    [save]
  );

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError("We couldn't get your location. Allow location access, or pick your suburb.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      save({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location", source: "gps" });
    } catch {
      setError("We couldn't get your location. Allow location access, or pick your suburb.");
    } finally {
      setLocating(false);
    }
  }, [save]);

  return (
    <LocationContext.Provider value={{ location, setSuburb, useMyLocation, locating, error }}>
      {children}
    </LocationContext.Provider>
  );
};

export function useUserLocation(): Ctx {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside UserLocationProvider");
  return ctx;
}
