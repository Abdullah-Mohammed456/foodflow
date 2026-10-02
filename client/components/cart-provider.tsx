"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { CartLine } from "@/lib/foodflow";

interface CartContextValue {
  lines: CartLine[];
  add: (line: CartLine) => void;
  change: (id: string, size: string, quantity: number) => void;
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
}));

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

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

  const add = (line: CartLine) => setLines((current) => {
    const found = current.find((item) => item.menuItemId === line.menuItemId && item.size === line.size);
    if (!found) return [...current, line];
    return current.map((item) => item === found ? { ...item, quantity: Math.min(20, item.quantity + line.quantity) } : item);
  });
  const change = (id: string, size: string, quantity: number) => setLines((current) =>
    current.map((item) => item.menuItemId === id && item.size === size ? { ...item, quantity: Math.max(0, Math.min(20, quantity)) } : item).filter((item) => item.quantity > 0),
  );
  const clear = () => setLines([]);
  return <CartContext.Provider value={{ lines, add, change, clear, count: lines.reduce((sum, line) => sum + line.quantity, 0) }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
