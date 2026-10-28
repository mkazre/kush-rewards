/**
 * API contract between the KushRewards app and its backend.
 * Every request and response body the app sends or expects is typed here.
 * Dates travel as ISO-8601 strings (e.g. "2026-10-14T18:01:18.304Z").
 * See HANDOVER.md section 6 for the endpoint list and rules.
 */

// ---------- Shared enums ----------
/** "partner" = a venue owner or manager, optionally linked to their venue by an admin. */
export type UserRole = "admin" | "partner" | "user";
export type StoreType = "dispensary" | "club" | "lounge";
export type StoreStatus = "live" | "hidden";
export type SubmissionStatus = "pending" | "needs_info" | "approved" | "rejected";
export type ReportStatus = "open" | "confirmed" | "dismissed";
export type ReviewStatus = "visible" | "hidden";
export type ContactKind = "whatsapp" | "call" | "directions";

// ---------- Auth ----------
export interface User {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  /** When the user accepted the Terms of Use and Community Rules; null = not yet (required before posting). */
  termsAcceptedAt: string | null;
}

/** Returned by every sign-in endpoint. `token` goes in `Authorization: Bearer <token>`. */
export interface AuthResponse {
  token: string;
  user: User;
}

export interface GoogleSignInInput {
  /** Google ID token from expo-auth-session; the backend verifies it with Google. */
  idToken: string;
}

/** Sign in with Apple (required on iOS because Google sign-in is offered: App Review Guideline 4.8). */
export interface AppleSignInInput {
  /** JWT from expo-apple-authentication; verify with Apple's public keys (iss https://appleid.apple.com, aud = bundle id). */
  identityToken: string;
  /** Apple sends the name only on the very first sign-in; store it then. */
  givenName: string | null;
  familyName: string | null;
}

/** Block the author of a review: their reviews are hidden for the caller (App Review Guideline 1.2).
 *  The reviewer's user id is never sent to the app; the backend looks it up from the review. */
export interface BlockReviewerInput {
  reviewId: number;
}

export interface BlockReviewerResponse {
  ok: true;
  /** The blocked person's first name, for the confirmation toast. */
  name: string;
}

export interface AcceptTermsResponse {
  termsAcceptedAt: string;
}

export interface PasswordSignInInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string; // min 8 characters
  displayName: string;
}

// ---------- Stores ----------
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** "HH:MM" 24-hour times. close "00:00" means midnight. close earlier than open means it runs past midnight. */
export type DayHours = { open: string; close: string } | null;
export type WeekHours = Partial<Record<DayKey, DayHours>>;

export interface StoreRating {
  average: number; // 1 decimal, e.g. 4.6
  count: number;
  topTags: string[]; // up to 3 most-picked positive review tags
}

export interface PublicStore {
  id: number;
  name: string;
  type: StoreType;
  status: StoreStatus; // always "live" in the public list
  suburb: string;
  address: string;
  latitude: number;
  longitude: number;
  whatsapp: string | null;
  phone: string | null;
  hours: WeekHours;
  hoursNote: string | null;
  /** Always an empty list. v2 never exposes products, prices or price levels (store compliance). */
  products: [];
  features: string[];
  isPartner: boolean;
  isCommunity: boolean; // added by a user and approved
  logoUrl: string | null;
  rating: StoreRating | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoresListResponse {
  stores: PublicStore[];
}

export interface TapInput {
  storeId: number;
  kind: ContactKind;
}

// ---------- Reviews ----------
export interface PublicReview {
  id: number;
  storeId: number;
  storeName: string;
  stars: number; // 1-5
  tags: string[];
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string; // reviewer's first name only
  isMine: boolean;
  isHidden: boolean; // only ever true in the "mine" list
}

export interface ReviewsQuery {
  storeId?: number;
  mine?: boolean;
  limit?: number; // 1-100, default 30
}

export interface ReviewsResponse {
  reviews: PublicReview[];
}

export interface SaveReviewInput {
  storeId: number;
  stars: number; // 1-5
  tags: string[]; // max 6, from REVIEW_TAGS
  comment: string | null; // max 500
}

export interface ReportReviewInput {
  reviewId: number;
}

// ---------- Venue suggestions (Suggest tab; table store_submissions) ----------
export interface CreateSubmissionInput {
  name: string;
  type: StoreType;
  suburb: string;
  address: string;
  whatsapp: string | null;
  hoursNote: string | null;
  isOwner: boolean;
  notes: string | null;
}

export interface Submission extends CreateSubmissionInput {
  id: number;
  status: SubmissionStatus;
  storeId: number | null; // set when approved
  decisionReason: string | null;
  decidedAt: string | null;
  submittedBy: number;
  createdAt: string;
}

export interface MySubmissionsResponse {
  submissions: Submission[];
}

// ---------- Info reports (Report wrong info) ----------
export const REPORT_FIELDS = ["Hours", "Closed for good", "Location", "Contact", "Other"] as const;
export type ReportField = (typeof REPORT_FIELDS)[number];

export interface CreateReportInput {
  storeId: number;
  field: ReportField;
  details: string; // 3-500 chars
}

// ---------- Admin ----------
export interface TapCounts {
  whatsapp: number;
  call: number;
  directions: number;
}

export interface AdminStore extends Omit<PublicStore, "rating" | "products"> {
  addedBy: number | null;
  taps30: TapCounts;
  tapsAll: TapCounts;
}

export interface AdminSubmission extends Submission {
  submitterName: string;
  submitterEmail: string;
}

export interface AdminReport {
  id: number;
  storeId: number;
  storeName: string;
  field: string;
  details: string;
  status: ReportStatus;
  reportedBy: number;
  reporterName: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminReview {
  id: number;
  storeId: number;
  storeName: string;
  userId: number;
  authorName: string; // full display name (admin only)
  authorEmail: string;
  stars: number;
  tags: string[];
  comment: string | null;
  status: ReviewStatus;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  stores: AdminStore[];
  submissions: AdminSubmission[];
  reports: AdminReport[];
  reviews: AdminReview[];
  userCount: number;
}

/** Admin → Users list row (GET /admin/users). */
export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  partnerStoreId: number | null;
  partnerStoreName: string | null;
  reviewCount: number;
  signInMethods: string[]; // "email" | "google" | "apple"
  termsAcceptedAt: string | null;
  createdAt: string;
}

/** POST /admin/user_save. id null creates the user (password required); otherwise password is optional (blank = unchanged). */
export interface AdminUserSaveInput {
  id: number | null;
  displayName: string;
  email: string;
  role: UserRole;
  password: string;
  partnerStoreId: number | null;
}

export interface StoreSaveInput {
  id: number | null; // null creates a new store
  name: string;
  type: StoreType;
  suburb: string;
  address: string;
  latitude: number; // -35 to -22 (South Africa)
  longitude: number; // 16 to 33
  whatsapp: string | null;
  phone: string | null;
  hours: WeekHours;
  hoursNote: string | null;
  features: string[];
  isPartner: boolean;
  status: StoreStatus;
  logoUrl: string | null;
  // No price level or products: the backend leaves those columns unchanged on update.
}

export interface SubmissionDecideInput {
  id: number;
  action: "approve" | "needs_info" | "reject";
  reason: string | null;
}

export interface ReportResolveInput {
  id: number;
  status: "confirmed" | "dismissed";
}

export interface ReviewStatusInput {
  id: number;
  status: ReviewStatus;
}

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"] as const;
export type LogoContentType = (typeof LOGO_TYPES)[number];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export interface LogoUploadInput {
  contentType: LogoContentType;
  sizeBytes: number;
}

export interface LogoUploadResponse {
  presignedUrl: string; // PUT the file bytes here
  headers: Record<string, string>; // send these headers with the PUT
  url: string; // public URL to save as the store's logoUrl
}

/** Error body for any non-2xx response. */
export interface ApiErrorBody {
  error: string;
}
