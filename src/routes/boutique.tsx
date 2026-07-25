import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, useSettings } from "@/lib/currency";
import { Search, ShoppingCart, Package, Star, SlidersHorizontal } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/boutique")({
  component: ShopPage,
  head: () => ({ meta: [
    { title: "Catalogue — CONETEC" },
    { name: "description", content: "Catalogue complet CONETEC : matériels électriques, solaires, CCTV, réseaux, climatisation et outillage professionnel." },
    { property: "og:title", content: "Catalogue CONETEC" },
    { property: "og:description", content: "Matériel technique certifié pour professionnels et particuliers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

function ShopPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("recent");
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: cats } = useQuery({ queryKey: ["cats-public"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products", q, cat, sort],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("status", "active");
      if (q) query = query.ilike("name", `%${q}%`);
      if (cat !== "all") query = query.eq("category_id", cat);
      if (sort === "price_asc") query = query.order("sale_price", { ascending: true });
      else if (sort === "price_desc") query = query.order("sale_price", { ascending: false });
      else if (sort === "name") query = query.order("name");
      else query = query.order("created_at", { ascending: false });
      const { data } = await query;
      return data ?? [];
    },
  });

  const list = useMemo(() => (products ?? []).filter((p) => (inStock ? p.stock > 0 : true)), [products, inStock]);

  return (
    <SiteShell>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-energy">Catalogue</p>
          <h1 className="mt-2 text-display text-3xl font-extrabold md:text-4xl">Matériel technique certifié</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Explorez notre sélection : énergie solaire, CCTV, réseaux, climatisation et outillage professionnel.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3 shadow-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, marque, réf…)" className="pl-9 border-transparent bg-secondary" />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-display text-sm font-bold uppercase tracking-wide"><SlidersHorizontal className="h-4 w-4 text-energy" /> Filtres</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Catégorie</p>
                  <div className="space-y-1.5">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" checked={cat === "all"} onChange={() => setCat("all")} className="accent-energy" />
                      Toutes
                    </label>
                    {cats?.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" checked={cat === c.id} onChange={() => setCat(c.id)} className="accent-energy" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={inStock} onCheckedChange={(v) => setInStock(Boolean(v))} /> En stock uniquement
                  </label>
                </div>
              </div>
            </div>
            <div className="rounded-xl border-l-4 border-energy bg-primary p-5 text-primary-foreground">
              <p className="text-display text-sm font-bold">Un projet sur-mesure ?</p>
              <p className="mt-1 text-xs text-primary-foreground/80">Nos ingénieurs vous accompagnent dans le dimensionnement.</p>
              <Link to="/devis"><Button size="sm" className="mt-3 bg-energy text-energy-foreground hover:bg-energy/90">Demander un devis</Button></Link>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{list.length} produit{list.length > 1 ? "s" : ""}</span>
            </div>
            {isLoading ? (
              <div className="rounded-xl border bg-background p-20 text-center text-muted-foreground">Chargement…</div>
            ) : !list.length ? (
              <div className="rounded-xl border bg-background p-16 text-center text-muted-foreground">Aucun produit trouvé.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => (
                  <ProductCard key={p.id} p={p} rate={rate} cur={cur} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function ProductCard({ p, rate, cur }: { p: any; rate: number; cur: any }) {
  const { add } = useCart();
  return (
    <div className="group overflow-hidden rounded-2xl border border-l-4 border-l-energy border-border/60 bg-background shadow-sm transition-all hover:shadow-lg">
      <Link to="/boutique/$productId" params={{ productId: p.id }} className="relative block aspect-square overflow-hidden bg-secondary">
        {p.images?.[0]
          ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          : <div className="grid h-full w-full place-items-center"><Package className="h-12 w-12 text-muted-foreground/30" /></div>}
        {p.stock <= 0 && <Badge variant="destructive" className="absolute left-3 top-3">Rupture</Badge>}
        {p.stock > 0 && <span className="absolute left-3 top-3 rounded bg-energy px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-energy-foreground">En stock</span>}
      </Link>
      <div className="p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-energy text-energy" /> 4.8 · {p.brand ?? "CONETEC"}
        </div>
        <Link to="/boutique/$productId" params={{ productId: p.id }} className="mt-1 block min-h-[2.5rem] text-sm font-semibold hover:text-primary line-clamp-2">{p.name}</Link>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-display text-xl font-extrabold text-primary">{formatMoney(Number(p.sale_price), cur, rate)}</div>
            {p.show_stock_public && <div className="text-[11px] text-muted-foreground">Stock: {p.stock}</div>}
          </div>
          <Button
            size="sm"
            className="bg-energy text-energy-foreground hover:bg-energy/90"
            disabled={p.stock <= 0}
            onClick={() => { add({ product_id: p.id, name: p.name, price_usd: Number(p.sale_price), image: p.images?.[0] ?? null }); toast.success("Ajouté au panier"); }}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Panier
          </Button>
        </div>
      </div>
    </div>
  );
}
