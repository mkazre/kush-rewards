// React Query hooks for every read in the app. After a write, invalidate the
// matching key(s) so screens refresh (see each mutation in the screens).
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { config } from "../config";
import type { ReviewsQuery, StoresListResponse } from "../types/api";

export const queryKeys = {
  stores: ["stores", "list"] as const,
  reviews: ["reviews"] as const,
  reviewsFor: (q: ReviewsQuery) => ["reviews", q] as const,
  mySubmissions: ["submissions", "mine"] as const,
  adminOverview: ["admin", "overview"] as const,
};

/**
 * All live venues of the types this build lists (config.listedStoreTypes).
 * The backend always returns products: [] (v2 store-compliant contract); clearing it
 * here as well guarantees nothing product-related can ever render, even from an old backend.
 */
export function useStores() {
  return useQuery({
    queryKey: queryKeys.stores,
    queryFn: api.listStores,
    placeholderData: (prev) => prev,
    select: (d: StoresListResponse): StoresListResponse => ({
      ...d,
      stores: d.stores.filter((s) => config.listedStoreTypes.includes(s.type)).map((s) => ({ ...s, products: [] as [] })),
    }),
  });
}

export function useReviews(q: ReviewsQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reviewsFor(q),
    queryFn: () => api.listReviews(q),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useMySubmissions(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.mySubmissions, queryFn: api.mySubmissions, enabled, placeholderData: (prev) => prev });
}

export function useAdminOverview(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.adminOverview, queryFn: api.adminOverview, enabled, placeholderData: (prev) => prev });
}
