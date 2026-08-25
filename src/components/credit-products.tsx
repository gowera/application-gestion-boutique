import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

export type CreditLine = { product_id: string; name: string; qty: number; unit_price_usd: number; stock: number };

export function useCreditProducts() {
  return useQuery({
    queryKey: ["credit-products"],
    queryFn: async () =>
      ((await supabase
        .from("products")
        .select("id,name,sale_price,stock")
        .eq("status", "active")
        .order("name")
        .limit(300)).data ?? []) as { id: string; name: string; sale_price: number; stock: number }[],
  });
}

export function creditLinesTotal(lines: CreditLine[]) {
  return lines.reduce((s, l) => s + l.qty * l.unit_price_usd, 0);
}

/** Décrémente le stock pour chaque produit emporté à crédit. */
export async function applyCreditStock(lines: CreditLine[], label: string) {
  for (const l of lines) {
    const { error } = await supabase.rpc("adjust_stock", {
      _product_id: l.product_id,
      _delta: -l.qty,
      _reason: "manual_out",
      _note: `Crédit — ${label}`,
    });
    if (error) throw error;
  }
}

export function CreditProductPicker({
  lines,
  onChange,
}: {
  lines: CreditLine[];
  onChange: (lines: CreditLine[]) => void;
}) {
  const { data: products } = useCreditProducts();

  function add(id: string) {
    const p = products?.find((x) => x.id === id);
    if (!p) return;
    const existing = lines.find((l) => l.product_id === id);
    if (existing) {
      onChange(lines.map((l) => (l.product_id === id ? { ...l, qty: l.qty + 1 } : l)));
      return;
    }
    onChange([...lines, { product_id: p.id, name: p.name, qty: 1, unit_price_usd: Number(p.sale_price), stock: p.stock }]);
  }

  return (
    <div className="space-y-2">
      <Label>Produits emportés (optionnel)</Label>
      <div className="flex gap-2">
        <select
          className="w-full border rounded-md h-9 px-2 bg-background text-sm"
          value=""
          onChange={(e) => { add(e.target.value); e.currentTarget.value = ""; }}
        >
          <option value="">Ajouter un produit…</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {Number(p.sale_price).toFixed(2)} $ (stock {p.stock})</option>
          ))}
        </select>
      </div>
      {lines.length > 0 && (
        <div className="space-y-2 rounded-md border p-2">
          {lines.map((l) => (
            <div key={l.product_id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0 text-sm truncate">{l.name}</div>
              <Input
                type="number" min={1} className="h-8 w-16"
                value={l.qty}
                onChange={(e) => onChange(lines.map((x) => x.product_id === l.product_id ? { ...x, qty: Math.max(1, +e.target.value) } : x))}
              />
              <Input
                type="number" step="0.01" className="h-8 w-24"
                value={l.unit_price_usd}
                onChange={(e) => onChange(lines.map((x) => x.product_id === l.product_id ? { ...x, unit_price_usd: +e.target.value } : x))}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                onClick={() => onChange(lines.filter((x) => x.product_id !== l.product_id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium pt-1 border-t">
            <span>Total produits</span><span>{creditLinesTotal(lines).toFixed(2)} $</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Plus className="h-3 w-3" />Le stock sera déduit automatiquement à l'enregistrement.
          </p>
        </div>
      )}
    </div>
  );
}
