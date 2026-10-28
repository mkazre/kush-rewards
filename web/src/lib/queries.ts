// React Query hooks and cache keys. After a write, invalidate the matching key so lists refresh.
import { useQuery } from "@tanstack/react-query";
import type { PublicStore } from "@shared/types/api";
import { api } from "./api";
import { useAuth } from "./auth";
import { LISTED_TYPES } from "./site";

export const keys = {
  stores: ["stores"] as const,
  reviews: (scope: string) => ["reviews", scope] as const,
  allReviews: ["reviews"] as const,
  mySubmissions: ["submissions", "mine"] as const,
  admin: ["admin"] as const,
  config: ["config"] as const,
};

export function useStores() {
  return useQuery({
    queryKey: keys.stores,
    queryFn: api.listStores,
    select: (d): PublicStore[] => d.stores.filter((s) => LISTED_TYPES.includes(s.type)),
    staleTime: 30_000,
  });
}

export function useReviews(q: { storeId?: number; mine?: boolean; limit?: number }, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    // The user id is in the key because blocked people are filtered per user.
    queryKey: keys.reviews(`${q.storeId ?? "all"}:${q.mine ? "mine" : "public"}:${q.limit ?? 30}:${user?.id ?? 0}`),
    queryFn: () => api.listReviews(q),
    select: (d) => d.reviews,
    enabled,
  });
}

export function useSiteConfig() {
  return useQuery({ queryKey: keys.config, queryFn: api.config, staleTime: Infinity });
}
