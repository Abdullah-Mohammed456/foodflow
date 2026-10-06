export const RESTAURANT_SLUG = "foodflow";

export type Size =
  "REGULAR" | "SMALL" | "MEDIUM" | "LARGE" | "SINGLE" | "DOUBLE";
export type OrderStatus =
  "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
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

export interface Variant {
  id: string;
  size: Size;
  price: string;
  isAvailable: boolean;
}

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

export interface Page<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; pageCount: number };
}
export interface PublicMenu extends Page<MenuItem> {
  restaurant: Restaurant;
  categories: Category[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

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
  pizza: "/media/menu/pizza.jpg",
  burgers: "/media/menu/cosmos_1718309446.webp",
  sandwiches: "/media/menu/club-sandwich.jpg",
  "fries-sides": "/media/menu/cosmos_1096855834.webp",
  chicken: "/media/menu/chicken.jpg",
  drinks: "/media/menu/drinks.jpg",
  desserts: "/media/menu/dessert.jpg",
  "combos-deals": "/media/menu/combo.jpg",
};

export const CATEGORY_ORDER = [
  "pizza",
  "burgers",
  "sandwiches",
  "fries-sides",
  "chicken",
  "drinks",
  "desserts",
  "combos-deals",
];
export const photoFor = (slug: string): string =>
  photos[slug] ?? "/media/menu/cosmos_1718309446.webp";
const editorialPhotos: Record<string, string> = {
  pizza: "/media/menu/editorial-pizza.jpg",
  burgers: "/media/menu/cosmos_1965868063.webp",
  sandwiches: "/media/menu/sandwich.jpg",
  "fries-sides": "/media/menu/editorial-fries.jpg",
  chicken: "/media/menu/editorial-chicken.jpg",
  drinks: "/media/menu/editorial-drinks.jpg",
  desserts: "/media/menu/editorial-desserts.jpg",
  "combos-deals": "/media/menu/editorial-combo.jpg",
};
export const editorialPhotoFor = (slug: string): string =>
  editorialPhotos[slug] ?? photoFor(slug);
const itemPhotos: Record<string, string> = {
  "margherita-pizza": "/media/menu/margherita.jpg",
  "pepperoni-pizza": "/media/menu/pepperoni.jpg",
  "classic-cheeseburger": "/media/menu/cosmos_1718309446.webp",
  "double-smash-burger": "/media/menu/cosmos_1965868063.webp",
  "crispy-chicken-sandwich": "/media/menu/crispy-chicken-sandwich.jpg",
  "club-sandwich": "/media/menu/club-sandwich.jpg",
  "french-fries": "/media/menu/cosmos_1096855834.webp",
  "loaded-fries": "/media/menu/loaded-fries.jpg",
  "chicken-nuggets": "/media/menu/nuggets.jpg",
  cola: "/media/menu/cola.jpg",
  milkshake: "/media/menu/milkshake.jpg",
  "chocolate-cake": "/media/menu/chocolate-cake.jpg",
  "burger-fries-drink-combo": "/media/menu/cosmos_339898762.webp",
};
export const itemPhoto = (item: MenuItem) =>
  item.imageUrl ?? itemPhotos[item.slug] ?? photoFor(item.category.slug);
export const money = (value: string | number) =>
  `${Number(value).toFixed(2)} EGP`;
export const human = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
