import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, useSettings } from "@/lib/currency";
import { Search, ShoppingCart, Package } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/boutique")({
  component: ShopPage,
  head: () => ({ meta: [
    { title: "Boutique — CONETEC" },
    { name: "description", content: "Découvrez le catalogue CONETEC : matériels électriques, solaires, sécurité, réseaux, climatisation." },
  ]}),
});

function ShopPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const { data: settings } = useSettings();
  const { add } = useCart();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: cats } = useQuery({ queryKey: ["cats-public"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products", q, cat],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("status", "active");
      if (q) query = query.ilike("name", `%${q}%`);
      if (cat !== "all") query = query.eq("category_id", cat);
      const { data } = await query.order("name");
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-display text-3xl md:text-5xl font-bold">Boutique CONETEC</h1>
          <p className="mt-2 text-primary-foreground/80">Tout le matériel technique dont vous avez besoin.</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" className="pl-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Chargement…</div>
        ) : !products?.length ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Aucun produit trouvé.</CardContent></Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Card key={p.id} className="group h-full overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all">
                <Link to="/boutique/$productId" params={{ productId: p.id }}>
                  <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Package className="h-12 w-12 text-muted-foreground/30" />}
                  </div>
                </Link>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{p.brand ?? "—"}</div>
                    {p.stock <= 0 && <Badge variant="destructive" className="text-[10px]">Rupture</Badge>}
                  </div>
                  <Link to="/boutique/$productId" params={{ productId: p.id }} className="block text-sm font-medium line-clamp-2 min-h-[2.5rem] hover:text-primary">{p.name}</Link>
                  <div className="flex items-center justify-between">
                    <div className="text-primary font-bold">{formatMoney(Number(p.sale_price), cur, rate)}</div>
                    <Button size="sm" variant="outline" disabled={p.stock <= 0} onClick={() => { add({ product_id: p.id, name: p.name, price_usd: Number(p.sale_price), image: p.images?.[0] ?? null }); toast.success("Ajouté au panier"); }}>
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {p.show_stock_public && <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
