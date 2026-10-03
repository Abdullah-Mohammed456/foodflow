"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { CartLine } from "@/lib/foodflow";

interface CartContextValue {
  lines: CartLine[];
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
}));

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
      } catch { localStorage.removeItem(STORAGE_KEY); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); }, [lines, ready]);
  useEffect(() => { if (!announcement) return; const timer = window.setTimeout(() => setAnnouncement(""), 3200); return () => window.clearTimeout(timer); }, [announcement]);

  const add = (line: CartLine) => { setAnnouncement(`${line.name} added to your bag.`); setLines((current) => {
    const found = current.find((item) => item.menuItemId === line.menuItemId && item.size === line.size);
    if (!found) return [...current, line];
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
  const clear = () => setLines([]);
  return <CartContext.Provider value={{ lines, add, change, changeSize, clear, count: lines.reduce((sum, line) => sum + line.quantity, 0) }}>{children}{announcement && <div className="cart-toast" role="status"><span>IN THE BAG</span><strong>{announcement}</strong></div>}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
