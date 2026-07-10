import { useCallback, useEffect, useState } from "react";

export type CartItem = { product_id: string; name: string; price_usd: number; qty: number; image?: string | null };

const KEY = "conetec_cart_v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("conetec-cart"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener("conetec-cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("conetec-cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((it: Omit<CartItem, "qty"> & { qty?: number }) => {
    const cur = read();
    const idx = cur.findIndex((c) => c.product_id === it.product_id);
    if (idx >= 0) cur[idx].qty += it.qty ?? 1;
    else cur.push({ ...it, qty: it.qty ?? 1 });
    write(cur);
  }, []);

  const update = useCallback((product_id: string, qty: number) => {
    const cur = read().map((c) => (c.product_id === product_id ? { ...c, qty: Math.max(1, qty) } : c));
    write(cur);
  }, []);

  const remove = useCallback((product_id: string) => {
    write(read().filter((c) => c.product_id !== product_id));
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price_usd, 0);

  return { items, add, update, remove, clear, count, subtotal };
}
