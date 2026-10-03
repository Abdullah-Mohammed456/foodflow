"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { RESTAURANT_SLUG, type Order, type Page, type PublicMenu, type Restaurant, type User } from "@/lib/foodflow";

export const useRestaurant = () => useQuery({
  queryKey: ["restaurant", RESTAURANT_SLUG],
  queryFn: () => apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/public/${RESTAURANT_SLUG}`).then((value) => value.restaurant),
});

export const useMenu = (category = "", search = "", page = 1) => useQuery({
  queryKey: ["menu", category, search, page],
  queryFn: () => {
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (category) params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    return apiFetch<PublicMenu>(`/api/restaurants/public/${RESTAURANT_SLUG}/menu?${params}`);
  },
});

export const useUser = () => useQuery({
  queryKey: ["me"],
  queryFn: () => apiFetch<{ user: User }>("/api/auth/me").then((value) => value.user),
  retry: false,
});

export function useStaffAccess() {
  const user = useUser();
  const restaurant = useRestaurant();
  const id = restaurant.data?.id;
  const kitchen = useQuery({ queryKey: ["staff-kitchen-access", id, user.data?.id], queryFn: () => apiFetch<Page<Order>>(`/api/restaurants/${id}/kitchen/orders?limit=1`), enabled: !!user.data && !!id, retry: false, staleTime: 300000 });
  const manager = useQuery({ queryKey: ["staff-manager-access", id, user.data?.id], queryFn: () => apiFetch(`/api/restaurants/${id}/admin/staff`), enabled: !!user.data && !!id, retry: false, staleTime: 300000 });
  return { canUseKitchen: kitchen.isSuccess, canManage: manager.isSuccess, isChecking: !!user.data && !!id && (kitchen.isPending || manager.isPending) };
}
