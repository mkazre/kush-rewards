// Shared constants and pure helpers for stores. Ported 1:1 from the web app.
// The backend should use the same SUBURBS list (approved submissions start at the suburb centre).
import type { DayHours, DayKey, StoreType, WeekHours } from "../types/api";

export const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

// JS getDay(): 0 = Sunday
const JS_DAY_TO_KEY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Suburb name -> [latitude, longitude] of its centre. */
export const SUBURBS: Record<string, [number, number]> = {
  Roodepoort: [-26.162, 27.872],
  Witpoortjie: [-26.152, 27.826],
  Lindhaven: [-26.137, 27.842],
  Horizon: [-26.143, 27.866],
  Florida: [-26.176, 27.91],
  "Constantia Kloof": [-26.141, 27.912],
  Discovery: [-26.165, 27.893],
  Ruimsig: [-26.083, 27.874],
  Wilgeheuwel: [-26.098, 27.902],
  "Little Falls": [-26.104, 27.885],
  Weltevredenpark: [-26.124, 27.938],
  Honeydew: [-26.077, 27.923],
  "Wilro Park": [-26.112, 27.86],
  Randpark: [-26.11, 27.96],
  "Robin Hills": [-26.104, 27.98],
  Randburg: [-26.094, 28.006],
  Northcliff: [-26.145, 27.968],
  Krugersdorp: [-26.099, 27.776],
  Soweto: [-26.249, 27.854],
};

export const TYPE_LABELS: Record<StoreType, string> = {
  dispensary: "Dispensary",
  club: "Private club",
  lounge: "Lounge",
};

export const FEATURE_OPTIONS = [
  "Secure parking",
  "Backup power",
  "Lounge seating",
  "Members only",
  "Live music",
  "Quiet",
  "Wi-Fi",
  "Garden",
  "Pool table",
  "Wheelchair access",
  "Card payments",
  "Friendly staff",
];

export const PRICE_LEVEL_NAMES = ["", "Budget", "Mid-range", "Premium"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isWithin(day: DayHours, minutesNow: number): boolean {
  if (!day) return false;
  const o = toMinutes(day.open);
  let c = toMinutes(day.close);
  if (c === 0) c = 1440;
  if (c > o) return minutesNow >= o && minutesNow < c;
  return minutesNow >= o; // overnight: the after-midnight part is checked from the next day
}

function spillsPastMidnight(day: DayHours, minutesNow: number): boolean {
  if (!day) return false;
  const o = toMinutes(day.open);
  const c = toMinutes(day.close);
  return c !== 0 && c <= o && minutesNow < c;
}

export function hasAnyHours(hours: WeekHours | null | undefined): boolean {
  if (!hours) return false;
  return DAYS.some((d) => !!hours[d.key]);
}

/** "Open · till 20:00", "Closed · opens 10:00", "Hours not listed", computed on the phone in local time. */
export function openState(
  hours: WeekHours | null | undefined,
  now: Date = new Date()
): { isOpen: boolean | null; text: string } {
  if (!hours || !hasAnyHours(hours)) return { isOpen: null, text: "Hours not listed" };
  const idx = now.getDay();
  const key = JS_DAY_TO_KEY[idx];
  const prevKey = JS_DAY_TO_KEY[(idx + 6) % 7];
  const m = now.getHours() * 60 + now.getMinutes();
  const today = hours[key] ?? null;
  const yesterday = hours[prevKey] ?? null;
  if (spillsPastMidnight(yesterday, m) && yesterday) {
    return { isOpen: true, text: `Open · till ${yesterday.close}` };
  }
  if (today && isWithin(today, m)) {
    return { isOpen: true, text: `Open · till ${today.close === "00:00" ? "midnight" : today.close}` };
  }
  if (today && m < toMinutes(today.open)) {
    return { isOpen: false, text: `Closed · opens ${today.open}` };
  }
  for (let i = 1; i <= 7; i++) {
    const k = JS_DAY_TO_KEY[(idx + i) % 7];
    const d = hours[k];
    if (d) {
      const label = i === 1 ? "tomorrow" : DAYS.find((x) => x.key === k)!.label;
      return { isOpen: false, text: `Closed · opens ${label} ${d.open}` };
    }
  }
  return { isOpen: false, text: "Closed" };
}

export function todayKey(now: Date = new Date()): DayKey {
  return JS_DAY_TO_KEY[now.getDay()];
}

/** Straight-line (haversine) distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** "072 000 0000" -> "27720000000" (wa.me / tel format). */
function phoneDigits(n: string): string {
  let d = n.replace(/\D/g, "");
  if (d.startsWith("0")) d = "27" + d.slice(1);
  return d;
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${phoneDigits(number)}?text=${encodeURIComponent(text)}`;
}

export function telLink(number: string): string {
  return `tel:+${phoneDigits(number)}`;
}

export function directionsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Accepts a Google Maps link or "lat, lng" text and returns coordinates inside South Africa. */
export function parseLocation(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) return { lat, lng };
    }
  }
  return null;
}

/** "Paradise Budz" -> "PB" for the monogram tile when a store has no logo. */
export function storeInitials(name: string): string {
  return name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
