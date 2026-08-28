"use client";

/**
 * Shopping cart (Module C). One cart, grouped by shop — each group becomes
 * its own order at checkout. Entries carry a product snapshot so the cart
 * renders instantly and stays consistent with what the shopper saw.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";

export interface CartLine {
  productId: string;
  shopId: string;
  shopName: string;
  nameEn: string;
  nameAm: string;
  price: number;
  photo: string;
  qty: number;
  maxQty: number;
}

interface CartContextValue {
  lines: CartLine[];
  /** Lines grouped by shop, ordered by first insertion. */
  groups: { shopId: string; shopName: string; lines: CartLine[]; subtotal: number }[];
  count: number;
  total: number;
  add: (product: Product, opts?: { qty?: number; shopName?: string; silent?: boolean }) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  removeShop: (shopId: string) => void;
  clear: () => void;
  qtyOf: (productId: string) => number;
  has: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "addissuq.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the persisted cart after mount (SSR renders an empty cart).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setLines(JSON.parse(saved) as CartLine[]);
    } catch {
      // ignore corrupted carts
    }
     
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  const add = useCallback((product: Product, opts?: { qty?: number; shopName?: string; silent?: boolean }) => {
    const qty = opts?.qty ?? 1;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      const nextQty = Math.min((existing?.qty ?? 0) + qty, Math.max(product.quantity, 1));
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, qty: nextQty, price: product.price } : l));
      }
      return [
        ...prev,
        {
          productId: product.id,
          shopId: product.shopId,
          shopName: opts?.shopName ?? "",
          nameEn: product.nameEn,
          nameAm: product.nameAm,
          price: product.price,
          photo: product.photos[0],
          qty: nextQty,
          maxQty: product.quantity,
        },
      ];
    });
    if (!opts?.silent) {
      toast.success("Added to cart", { description: product.nameEn });
    }
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, Math.min(qty, l.maxQty)) } : l))
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
    toast.success("Removed from cart");
  }, []);

  const removeShop = useCallback((shopId: string) => {
    setLines((prev) => prev.filter((l) => l.shopId !== shopId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const groups = useMemo(() => {
    const map = new Map<string, { shopId: string; shopName: string; lines: CartLine[]; subtotal: number }>();
    for (const line of lines) {
      const g = map.get(line.shopId) ?? { shopId: line.shopId, shopName: line.shopName, lines: [], subtotal: 0 };
      g.lines.push(line);
      g.subtotal += line.price * line.qty;
      map.set(line.shopId, g);
    }
    return [...map.values()];
  }, [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      groups,
      count: lines.reduce((s, l) => s + l.qty, 0),
      total: lines.reduce((s, l) => s + l.price * l.qty, 0),
      add,
      setQty,
      remove,
      removeShop,
      clear,
      qtyOf: (productId) => lines.find((l) => l.productId === productId)?.qty ?? 0,
      has: (productId) => lines.some((l) => l.productId === productId),
    }),
    [lines, groups, add, setQty, remove, removeShop, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
