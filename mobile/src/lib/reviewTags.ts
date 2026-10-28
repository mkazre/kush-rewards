// Quick reasons people tap when reviewing a venue (a star rating plus close-ended
// reasons, with free text optional). The backend must accept exactly these tags.
// Store-compliant set: tags describe the venue experience only. There are no tags
// about product quality, prices or stock, because those make reviews read like a
// sales menu (Google Play marijuana policy, Apple 1.4.3).

export const POSITIVE_TAGS = [
  "Friendly staff",
  "Clean & safe",
  "Great vibe",
  "Comfortable space",
  "Knowledgeable staff",
  "Quick service",
  "Easy parking",
] as const;

export const NEGATIVE_TAGS = ["Long wait", "Unfriendly staff", "Not clean", "Too noisy", "Hard to find"] as const;

export const REVIEW_TAGS: string[] = [...POSITIVE_TAGS, ...NEGATIVE_TAGS];

/** Tags from v1 that may still be stored on older reviews. They are never displayed. */
export const RETIRED_TAGS = ["Good quality", "Fair prices", "Pricey", "Poor quality", "Out of stock"];

/** Drops retired product/price tags (the backend already does; this is a second guard). */
export function visibleTags(tags: string[]): string[] {
  return tags.filter((t) => !RETIRED_TAGS.includes(t));
}

export const STAR_LABELS = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

/** Which tags to offer: praise for 4-5 stars, problems for 1-2, a mix for 3. */
export function tagsForStars(stars: number): string[] {
  if (stars >= 4) return [...POSITIVE_TAGS];
  if (stars > 0 && stars <= 2) return [...NEGATIVE_TAGS];
  if (stars === 3) return [...POSITIVE_TAGS.slice(0, 4), ...NEGATIVE_TAGS.slice(0, 3)];
  return [];
}

export function isNegativeTag(tag: string): boolean {
  return (NEGATIVE_TAGS as readonly string[]).includes(tag);
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
