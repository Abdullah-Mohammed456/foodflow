import { apiFetch } from "@/lib/api";
import {
  RESTAURANT_SLUG,
  type CartLine,
  type MenuItem,
  type PublicMenu,
} from "@/lib/foodflow";

export async function loadCheckoutMenu(): Promise<MenuItem[]> {
  const items: MenuItem[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const result = await apiFetch<PublicMenu>(
      `/api/restaurants/public/${RESTAURANT_SLUG}/menu?page=${page}&limit=100`,
    );
    items.push(
      ...result.items.map((item) => ({
        ...item,
        category: {
          ...item.category,
          isActive: result.categories.some(
            (category) => category.id === item.category.id && category.isActive,
          ),
        },
      })),
    );
    pageCount = result.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);
  return items;
}

export function reviewCart(lines: CartLine[], menu: MenuItem[]) {
  return lines.map((line) => {
    const item = menu.find((entry) => entry.id === line.menuItemId);
    const variant = item?.variants.find((entry) => entry.size === line.size);
    const available = !!(
      item?.isAvailable &&
      item.category.isActive &&
      variant?.isAvailable
    );
    return {
      line,
      available,
      price: variant?.price ?? line.unitPrice,
      changed: available && Number(variant?.price) !== Number(line.unitPrice),
    };
  });
}

export interface CheckoutAttempt {
  signature: string;
  key: string;
}

export async function checkoutAttempt(
  userId: string,
  payload: object,
  previous: CheckoutAttempt | null,
): Promise<CheckoutAttempt> {
  const bytes = new TextEncoder().encode(JSON.stringify({ userId, payload }));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const signature = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (previous?.signature === signature) return previous;
  const saved = readSavedAttempt();
  if (
    saved &&
    typeof saved === "object" &&
    "signature" in saved &&
    "key" in saved &&
    saved.signature === signature &&
    typeof saved.key === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      saved.key,
    )
  )
    return { signature, key: saved.key };
  const attempt = { signature, key: crypto.randomUUID() };
  try {
    sessionStorage.setItem(
      "foodflow-checkout-attempt",
      JSON.stringify(attempt),
    );
  } catch {
    return attempt;
  }
  return attempt;
}

export function forgetCheckoutAttempt() {
  try {
    sessionStorage.removeItem("foodflow-checkout-attempt");
  } catch {
    return;
  }
}

function readSavedAttempt(): unknown {
  try {
    return JSON.parse(
      sessionStorage.getItem("foodflow-checkout-attempt") ?? "null",
    );
  } catch {
    return null;
  }
}
