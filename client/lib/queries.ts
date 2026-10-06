"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import {
  RESTAURANT_SLUG,
  type PublicMenu,
  type Restaurant,
  type User,
} from "@/lib/foodflow";

export const useRestaurant = () =>
  useQuery({
    queryKey: ["restaurant", RESTAURANT_SLUG],
    queryFn: () =>
      apiFetch<{ restaurant: Restaurant }>(
        `/api/restaurants/public/${RESTAURANT_SLUG}`,
      ).then((value) => value.restaurant),
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
        { signal },
      );
    },
  });

export const userQueryOptions = {
  queryKey: ["me"],
  queryFn: () =>
    apiFetch<{ user: User }>("/api/auth/me").then((value) => value.user),
  retry: false,
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
        { signal },
      ),
    enabled: !!user.data && !!id,
    retry: false,
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
