// Filter for user-written public text (review comments, venue suggestion notes and hours).
// Mirrors the backend filter in the v2 web app (helpers/contentFilter); the backend is the
// real gatekeeper and must run the same check. This copy gives instant feedback in the form.
// Blocks prices, offers to buy/sell, contact details and links, which would turn reviews into a
// sales channel (Google Play marijuana policy, Apple 1.4.3), plus a small offensive-language list
// (Apple 1.2 "a method for filtering objectionable material").

const SELLING_PATTERNS: RegExp[] = [
  /\bR\s?\d+/i, // R75, R 150
  /\d+\s?(rand|zar)\b/i,
  /\brands?\b/i,
  /\bper\s?(gram|g|ounce|oz)\b/i,
  /\b(price|prices|priced|pricing|cheap|cheaper|cheapest|discount|discounts|special|specials|deal|deals)\b/i,
  /\b(buy|buying|sell|selling|sells|order|orders|ordering|deliver|delivers|delivery|deliveries|stock|stocks|menu|menus)\b/i,
  /(\+?27|\b0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/, // SA phone numbers
  /https?:\/\/|www\.|\.co\.za\b|\.com\b|\.net\b|\.org\b/i,
  /(^|\s)@[a-z0-9_.]{3,}/i, // @handles
];

// Keep short and extend server-side over time; not meant to be exhaustive.
const OFFENSIVE = ["fuck", "shit", "cunt", "bitch", "kaffir", "poes", "naai", "moer", "faggot", "nigger"];

export const SELLING_MESSAGE = "Please remove prices, contact details, links or offers to buy or sell.";
export const OFFENSIVE_MESSAGE = "Please keep it respectful: remove offensive language.";

/** Offensive-language check only (used for wrong-info reports, which may need to include a new phone number). */
export function offensiveProblem(text: string | null | undefined): string | null {
  if (!text) return null;
  return OFFENSIVE.some((w) => new RegExp(`\\b${w}`, "i").test(text)) ? OFFENSIVE_MESSAGE : null;
}

/** Full check for public text. Returns a user-facing reason, or null if the text is fine. */
export function contentProblem(text: string | null | undefined): string | null {
  if (!text) return null;
  if (SELLING_PATTERNS.some((p) => p.test(text))) return SELLING_MESSAGE;
  return offensiveProblem(text);
}
