"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import {
  RESTAURANT_SLUG,
  type PublicMenu,
  type Restaurant,
  type User,
} from "@/lib/foodflow";

export const COLD_START_TIMEOUT_MS = 60_000;

const coldStartRetryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** attempt, 8000);

const retryColdStartOnly = (failureCount: number, error: unknown) => {
  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  )
    return false;
  return failureCount < 2;
};

export const useRestaurant = () =>
  useQuery({
    queryKey: ["restaurant", RESTAURANT_SLUG],
    queryFn: ({ signal }) =>
      apiFetch<{ restaurant: Restaurant }>(
        `/api/restaurants/public/${RESTAURANT_SLUG}`,
        { signal, timeoutMs: COLD_START_TIMEOUT_MS },
      ).then((value) => value.restaurant),
    retry: retryColdStartOnly,
    retryDelay: coldStartRetryDelay,
  });

export const useMenu = (category = "", search = "", page = 1) =>
  useQuery({
    queryKey: ["menu", category, search, page],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (category) params.set("category", category);
      if (search.trim()) params.set("q", search.trim());
      return apiFetch<PublicMenu>(
        `/api/restaurants/public/${RESTAURANT_SLUG}/menu?${params}`,
        { signal, timeoutMs: COLD_START_TIMEOUT_MS },
      );
    },
    retry: retryColdStartOnly,
    retryDelay: coldStartRetryDelay,
  });

export const userQueryOptions = {
  queryKey: ["me"],
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    apiFetch<{ user: User }>("/api/auth/me", {
      signal,
      timeoutMs: COLD_START_TIMEOUT_MS,
    }).then((value) => value.user),
  retry: retryColdStartOnly,
  retryDelay: coldStartRetryDelay,
  // Keep an unauthenticated result across child mounts; login replaces this cache.
  retryOnMount: false,
} as const;

export const useUser = () => useQuery(userQueryOptions);

export function useStaffAccess() {
  const user = useUser();
  const restaurant = useRestaurant();
  const id = restaurant.data?.id;
  const access = useQuery({
    queryKey: ["staff-access", id, user.data?.id],
    queryFn: ({ signal }) =>
      apiFetch<{ role: "OWNER" | "MANAGER" | "KITCHEN" | null }>(
        `/api/auth/access?restaurantId=${id}`,
        { signal, timeoutMs: COLD_START_TIMEOUT_MS },
      ),
    enabled: !!user.data && !!id,
    retry: retryColdStartOnly,
    retryDelay: coldStartRetryDelay,
    staleTime: 60_000,
  });
  const role = access.data?.role;
  return {
    canUseKitchen: !!role,
    canManage: role === "OWNER" || role === "MANAGER",
    isStaff: !!role || user.data?.role === "ADMIN",
    isChecking:
      user.isPending ||
      (!!user.data && (restaurant.isPending || (!!id && access.isPending))),
    error: user.data
      ? (restaurant.error ?? access.error)
      : user.error &&
          !(user.error instanceof ApiError && user.error.status === 401)
        ? user.error
        : null,
    refetch: () =>
      Promise.all([
        user.refetch(),
        restaurant.refetch(),
        ...(user.data && id ? [access.refetch()] : []),
      ]),
  };
}
