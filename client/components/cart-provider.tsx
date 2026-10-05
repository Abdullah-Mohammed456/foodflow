"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { successToast, warningToast } from "@/lib/alerts";
import type { CartLine, MenuItem } from "@/lib/foodflow";

interface CartContextValue {
  lines: CartLine[];
  ready: boolean;
  refreshPrices: (menu: MenuItem[]) => void;
  add: (line: CartLine) => void;
  change: (id: string, size: string, quantity: number) => void;
  changeSize: (id: string, size: string, nextSize: string) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "foodflow-cart-v1";
const cartSchema = z.array(z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  image: z.string().min(1),
  size: z.enum(["REGULAR", "SMALL", "MEDIUM", "LARGE", "SINGLE", "DOUBLE"]),
  unitPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  quantity: z.number().int().min(1).max(20),
  variants: z.array(z.object({ size: z.enum(["REGULAR", "SMALL", "MEDIUM", "LARGE", "SINGLE", "DOUBLE"]), price: z.string().regex(/^\d+(?:\.\d{1,2})?$/) })).optional(),
})).max(50);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = cartSchema.safeParse(JSON.parse(raw));
          if (parsed.success) setLines(parsed.data);
          else localStorage.removeItem(STORAGE_KEY);
        }
      } catch { setAnnouncement("Your browser cannot save your bag. Keep this tab open while ordering."); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); }
    catch {
      queueMicrotask(() => { if (active) setAnnouncement("Your browser cannot save your bag. Keep this tab open while ordering."); });
    }
    return () => { active = false; };
  }, [lines, ready]);
  useEffect(() => { if (!announcement) return; const timer = window.setTimeout(() => setAnnouncement(""), 3200); return () => window.clearTimeout(timer); }, [announcement]);

  const add = (line: CartLine) => {
    if (lines.length >= 50 && !lines.some((item) => item.menuItemId === line.menuItemId && item.size === line.size)) {
      setAnnouncement("Your bag can hold up to 50 different item sizes.");
      void warningToast("YOUR BAG IS FULL.", "Your bag can hold up to 50 different item sizes.");
      return;
    }
    if (lines.some((item) => item.menuItemId === line.menuItemId && item.size === line.size && item.quantity >= 20)) {
      setAnnouncement("You already have the maximum quantity of this item.");
      void warningToast("MAXIMUM QUANTITY.", "You can order up to 20 of each item size.");
      return;
    }
    setAnnouncement(`${line.name} added to your bag.`); void successToast("IN THE BAG.", line.name); setLines((current) => {
    const found = current.find((item) => item.menuItemId === line.menuItemId && item.size === line.size);
    if (!found) { if (current.length >= 50) return current; return [...current, line]; }
    return current.map((item) => item === found ? { ...item, quantity: Math.min(20, item.quantity + line.quantity) } : item);
  }); };
  const change = (id: string, size: string, quantity: number) => setLines((current) =>
    current.map((item) => item.menuItemId === id && item.size === size ? { ...item, quantity: Math.max(0, Math.min(20, quantity)) } : item).filter((item) => item.quantity > 0),
  );
  const changeSize = (id: string, size: string, nextSize: string) => setLines((current) => {
    const source = current.find((item) => item.menuItemId === id && item.size === size);
    const variant = source?.variants?.find((item) => item.size === nextSize);
    if (!source || !variant || size === nextSize) return current;
    const existing = current.find((item) => item.menuItemId === id && item.size === nextSize);
    return current.filter((item) => item !== source).map((item) => item === existing ? { ...item, quantity: Math.min(20, item.quantity + source.quantity) } : item).concat(existing ? [] : [{ ...source, size: variant.size, unitPrice: variant.price }]);
  });
  const refreshPrices = (menu: MenuItem[]) => setLines((current) => current.map((line) => {
    const item = menu.find((entry) => entry.id === line.menuItemId);
    const variant = item?.variants.find((entry) => entry.size === line.size);
    if (!item || !variant?.isAvailable || !item.isAvailable || !item.category.isActive) return line;
    return { ...line, unitPrice: variant.price, variants: item.variants.filter((entry) => entry.isAvailable).map((entry) => ({ size: entry.size, price: entry.price })) };
  }));
  const clear = () => setLines([]);
  return <CartContext.Provider value={{ lines, ready, refreshPrices, add, change, changeSize, clear, count: lines.reduce((sum, line) => sum + line.quantity, 0) }}>{children}{announcement && <div className="sr-only" role="status">{announcement}</div>}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
