// One function per backend endpoint. Paths, inputs and outputs are the contract
// described in HANDOVER.md section 6; keep the two in sync.
import { http } from "./client";
import { uploadLogo } from "./uploads";
import type {
  AcceptTermsResponse,
  AdminOverview,
  AppleSignInInput,
  AuthResponse,
  BlockReviewerInput,
  BlockReviewerResponse,
  CreateReportInput,
  CreateSubmissionInput,
  GoogleSignInInput,
  LogoUploadInput,
  LogoUploadResponse,
  MySubmissionsResponse,
  PasswordSignInInput,
  RegisterInput,
  ReportResolveInput,
  ReportReviewInput,
  ReviewStatusInput,
  ReviewsQuery,
  ReviewsResponse,
  SiteConfig,
  SaveReviewInput,
  StoreSaveInput,
  StoresListResponse,
  SubmissionDecideInput,
  TapInput,
  User,
} from "../types/api";

type Ok = { ok: true };

export const api = {
  /** Support email and legal details edited in Admin → Settings. */
  siteConfig: () => http.get<SiteConfig>("/config"),

  // ----- Auth -----
  session: () => http.get<{ user: User }>("/auth/session"),
  signInWithGoogle: (input: GoogleSignInInput) => http.post<AuthResponse>("/auth/google", input),
  signInWithApple: (input: AppleSignInInput) => http.post<AuthResponse>("/auth/apple", input),
  signInWithPassword: (input: PasswordSignInInput) => http.post<AuthResponse>("/auth/login_with_password", input),
  register: (input: RegisterInput) => http.post<AuthResponse>("/auth/register_with_password", input),
  logout: () => http.post<Ok>("/auth/logout", {}),

  // ----- Account -----
  /** Records acceptance of the Terms of Use and Community Rules (Google Play UGC policy). */
  acceptTerms: () => http.post<AcceptTermsResponse>("/account/accept_terms", {}),
  /** Permanently deletes the account and its data (Apple 5.1.1(v), Google Play account deletion policy). */
  deleteAccount: () => http.post<Ok>("/account/delete", {}),

  // ----- Stores (public) -----
  listStores: () => http.get<StoresListResponse>("/stores/list"),
  trackTap: (input: TapInput) => http.post<Ok>("/stores/tap", input),

  // ----- Reviews -----
  listReviews: (q: ReviewsQuery) =>
    http.get<ReviewsResponse>("/reviews/list", { storeId: q.storeId, mine: q.mine, limit: q.limit }),
  saveReview: (input: SaveReviewInput) => http.post<{ id: number }>("/reviews/save", input),
  reportReview: (input: ReportReviewInput) => http.post<Ok>("/reviews/report", input),
  blockReviewer: (input: BlockReviewerInput) => http.post<BlockReviewerResponse>("/reviews/block", input),

  // ----- Venue suggestions and wrong-info reports (signed in, Community Rules accepted) -----
  createSubmission: (input: CreateSubmissionInput) => http.post<{ id: number }>("/submissions/create", input),
  mySubmissions: () => http.get<MySubmissionsResponse>("/submissions/mine"),
  createReport: (input: CreateReportInput) => http.post<{ id: number }>("/reports/create", input),

  // ----- Admin (role "admin" only) -----
  adminOverview: () => http.get<AdminOverview>("/admin/overview"),
  adminSaveStore: (input: StoreSaveInput) => http.post<{ id: number }>("/admin/store_save", input),
  adminDecideSubmission: (input: SubmissionDecideInput) => http.post<{ storeId: number | null }>("/admin/submission_decide", input),
  adminResolveReport: (input: ReportResolveInput) => http.post<Ok>("/admin/report_resolve", input),
  adminReviewStatus: (input: ReviewStatusInput) => http.post<Ok>("/admin/review_status", input),
  adminLogoUpload: (input: LogoUploadInput) => http.post<LogoUploadResponse>("/admin/logo_upload", input),
  /** Asks for a signed upload URL, PUTs the image to storage, and returns its public URL. */
  uploadLogo,
};
