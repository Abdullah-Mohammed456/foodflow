export const RESTAURANT_SLUG = "foodflow";

export type Size = "REGULAR" | "SMALL" | "MEDIUM" | "LARGE" | "SINGLE" | "DOUBLE";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isOpen: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface Variant { id: string; size: Size; price: string; isAvailable: boolean }

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  category: Category;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isCombo: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  variants: Variant[];
}

export interface Page<T> { items: T[]; pagination: { page: number; limit: number; total: number; pageCount: number } }
export interface PublicMenu extends Page<MenuItem> { restaurant: Restaurant; categories: Category[] }

export interface User { id: string; email: string; name: string; role: string }

export interface OrderItem {
  id: string;
  nameSnapshot: string;
  descriptionSnapshot: string | null;
  sizeSnapshot: Size;
  isComboSnapshot: boolean;
  prepTimeMinutesSnapshot: number;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  publicId: string;
  restaurantId: string;
  orderType: OrderType;
  status: OrderStatus;
  revision: number;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  notes: string | null;
  deliveryAddress: string | null;
  prepDueAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CartLine {
  menuItemId: string;
  name: string;
  image: string;
  size: Size;
  unitPrice: string;
  quantity: number;
  variants?: { size: Size; price: string }[];
}

const photos: Record<string, string> = {
  pizza: "/food/pizza.jpg",
  burgers: "/food/cosmos_1718309446.webp",
  sandwiches: "/food/club-sandwich.jpg",
  "fries-sides": "/food/cosmos_1096855834.webp",
  chicken: "/food/chicken.jpg",
  drinks: "/food/drinks.jpg",
  desserts: "/food/dessert.jpg",
  "combos-deals": "/food/combo.jpg",
};

export const CATEGORY_ORDER = ["pizza", "burgers", "sandwiches", "fries-sides", "chicken", "drinks", "desserts", "combos-deals"];
export const photoFor = (slug: string): string => photos[slug] ?? "/food/cosmos_1718309446.webp";
const itemPhotos: Record<string, string> = {
  "margherita-pizza": "/food/margherita.jpg",
  "pepperoni-pizza": "/food/pepperoni.jpg",
  "classic-cheeseburger": "/food/cosmos_1718309446.webp",
  "double-smash-burger": "/food/cosmos_1965868063.webp",
  "crispy-chicken-sandwich": "/food/crispy-chicken-sandwich.jpg",
  "club-sandwich": "/food/club-sandwich.jpg",
  "french-fries": "/food/cosmos_1096855834.webp",
  "loaded-fries": "/food/loaded-fries.jpg",
  "chicken-nuggets": "/food/nuggets.jpg",
  "cola": "/food/cola.jpg",
  "milkshake": "/food/milkshake.jpg",
  "chocolate-cake": "/food/chocolate-cake.jpg",
  "burger-fries-drink-combo": "/food/cosmos_339898762.webp",
};
export const itemPhoto = (item: MenuItem) => item.imageUrl ?? itemPhotos[item.slug] ?? photoFor(item.category.slug);
export const money = (value: string | number) => `${Number(value).toFixed(2)} EGP`;
export const human = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
