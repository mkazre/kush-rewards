// Website settings. Change these to customise the site without touching components.
import type { StoreType } from "@shared/types/api";

/** Venue types shown on the site. ["club", "lounge"] launches without dispensaries (see docs/APP-STORE-COMPLIANCE.md). */
export const LISTED_TYPES: StoreType[] = ["dispensary", "club", "lounge"];

export const SUPPORT_EMAIL_FALLBACK = "support@kushrewards.online";

/** Map tiles (free OpenStreetMap). Swap for another provider here if you get heavy traffic. */
export const MAP_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** Paths reachable without passing the age gate: app-store reviewers open these directly. */
export const AGE_GATE_BYPASS = ["/privacy", "/terms", "/community-rules", "/support", "/delete-account"];
