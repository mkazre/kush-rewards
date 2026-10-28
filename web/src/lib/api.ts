// JSON client for the Laravel API at /api. The session lives in an HTTP-only cookie set by
// the sign-in endpoints, so the website never handles the token itself.
import type {
  AcceptTermsResponse,
  AdminOverview,
  AdminUser,
  AdminUserSaveInput,
  AuthResponse,
  BlockReviewerResponse,
  CreateReportInput,
  CreateSubmissionInput,
  LogoUploadResponse,
  MySubmissionsResponse,
  ReportResolveInput,
  ReviewStatusInput,
  ReviewsQuery,
  ReviewsResponse,
  SaveReviewInput,
  SiteConfig,
  StoreSaveInput,
  StoresListResponse,
  SubmissionDecideInput,
  TapInput,
  User,
} from "@shared/types/api";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@shared/types/api";

export interface AdminSettings {
  values: Record<string, string>;
  defaults: Record<string, string>;
  demo: { venues: number; users: number; reviews: number };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined>;

async function request<T>(method: "GET" | "POST", path: string, body?: unknown, query?: Query): Promise<T> {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== false)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v === true ? "1" : String(v))}`)
        .join("&")
    : "";
  let res: Response;
  try {
    res = await fetch(`/api${path}${qs ? `?${qs}` : ""}`, {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach KushRewards. Check your connection and try again.");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/session") onUnauthorized?.();
    throw new ApiError(res.status, (json as { error?: string } | null)?.error || `Something went wrong (${res.status})`);
  }
  return json as T;
}

const get = <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query);
const post = <T>(path: string, body: unknown = {}) => request<T>("POST", path, body);
type Ok = { ok: true };

export const api = {
  config: () => get<SiteConfig>("/config"),

  session: () => get<{ user: User }>("/auth/session"),
  signInWithGoogle: (idToken: string) => post<AuthResponse>("/auth/google", { idToken }),
  signInWithPassword: (email: string, password: string) => post<AuthResponse>("/auth/login_with_password", { email, password }),
  register: (email: string, password: string, displayName: string) =>
    post<AuthResponse>("/auth/register_with_password", { email, password, displayName }),
  logout: () => post<Ok>("/auth/logout"),

  acceptTerms: () => post<AcceptTermsResponse>("/account/accept_terms"),
  deleteAccount: () => post<Ok>("/account/delete"),

  listStores: () => get<StoresListResponse>("/stores/list"),
  trackTap: (input: TapInput) => post<Ok>("/stores/tap", input),

  listReviews: (q: ReviewsQuery) => get<ReviewsResponse>("/reviews/list", { storeId: q.storeId, mine: q.mine, limit: q.limit }),
  saveReview: (input: SaveReviewInput) => post<{ id: number }>("/reviews/save", input),
  reportReview: (reviewId: number) => post<Ok>("/reviews/report", { reviewId }),
  blockReviewer: (reviewId: number) => post<BlockReviewerResponse>("/reviews/block", { reviewId }),

  createSubmission: (input: CreateSubmissionInput) => post<{ id: number }>("/submissions/create", input),
  mySubmissions: () => get<MySubmissionsResponse>("/submissions/mine"),
  createReport: (input: CreateReportInput) => post<{ id: number }>("/reports/create", input),

  adminOverview: () => get<AdminOverview>("/admin/overview"),
  adminSaveStore: (input: StoreSaveInput) => post<{ id: number }>("/admin/store_save", input),
  adminDecideSubmission: (input: SubmissionDecideInput) => post<{ storeId: number | null }>("/admin/submission_decide", input),
  adminResolveReport: (input: ReportResolveInput) => post<Ok>("/admin/report_resolve", input),
  adminReviewStatus: (input: ReviewStatusInput) => post<Ok>("/admin/review_status", input),
  adminUsers: (q?: string) => get<{ users: AdminUser[] }>("/admin/users", { q: q || undefined }),
  adminSaveUser: (input: AdminUserSaveInput) => post<{ id: number }>("/admin/user_save", input),
  adminSettings: () => get<AdminSettings>("/admin/settings"),
  adminSaveSettings: (values: Record<string, string>) => post<Ok>("/admin/settings_save", { values }),
  adminRemoveDemo: () => post<Ok>("/admin/demo_remove"),
  adminDeleteUser: (id: number) => post<Ok>("/admin/user_delete", { id }),

  /** Gets a signed upload URL, PUTs the file, and returns the logo's public URL. */
  async uploadLogo(file: File): Promise<string> {
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) throw new ApiError(400, "Use a PNG, JPG, WEBP, GIF or SVG image");
    if (file.size > LOGO_MAX_BYTES) throw new ApiError(400, "Logo must be 5 MB or smaller");
    const { presignedUrl, headers, url } = await post<LogoUploadResponse>("/admin/logo_upload", { contentType: file.type, sizeBytes: file.size });
    const put = await fetch(presignedUrl, { method: "PUT", headers, body: file, credentials: "same-origin" });
    if (!put.ok) {
      const err = (await put.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(put.status, err?.error || "Upload failed. Please try again.");
    }
    return url;
  },
};
