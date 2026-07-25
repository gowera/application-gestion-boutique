import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, useSettings } from "@/lib/currency";
import { Search, ShoppingCart, Package, Star, SlidersHorizontal, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/boutique")({
  component: ShopPage,
  head: () => ({ meta: [
    { title: "Boutique — CONETEC" },
    { name: "description", content: "Catalogue complet CONETEC : matériels électriques, solaires, CCTV, réseaux, climatisation et outillage professionnel." },
    { property: "og:title", content: "Boutique CONETEC" },
    { property: "og:description", content: "Matériel technique certifié pour professionnels et particuliers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

const STORAGE_KEY = "conetec:shop-filters:v1";

type SavedFilters = {
  q: string;
  cat: string;
  inStock: boolean;
  sort: string;
  minPrice: string;
  maxPrice: string;
};

const DEFAULTS: SavedFilters = { q: "", cat: "all", inStock: false, sort: "recent", minPrice: "", maxPrice: "" };

function loadFilters(): SavedFilters {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

function ShopPage() {
  const [f, setF] = useState<SavedFilters>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  useEffect(() => { setF(loadFilters()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); }, [f, ready]);

  const patch = (p: Partial<SavedFilters>) => setF((prev) => ({ ...prev, ...p }));
  const reset = () => setF(DEFAULTS);

  const { data: cats } = useQuery({ queryKey: ["cats-public"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: products, isLoading, isFetching } = useQuery({
    queryKey: ["shop-products", f.q, f.cat, f.sort, f.minPrice, f.maxPrice],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("status", "active");
      if (f.q) query = query.ilike("name", `%${f.q}%`);
      if (f.cat !== "all") query = query.eq("category_id", f.cat);
      if (f.minPrice) query = query.gte("sale_price", Number(f.minPrice));
      if (f.maxPrice) query = query.lte("sale_price", Number(f.maxPrice));
      if (f.sort === "price_asc") query = query.order("sale_price", { ascending: true });
      else if (f.sort === "price_desc") query = query.order("sale_price", { ascending: false });
      else if (f.sort === "name") query = query.order("name");
      else query = query.order("created_at", { ascending: false });
      const { data } = await query;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  const list = useMemo(() => (products ?? []).filter((p) => (f.inStock ? p.stock > 0 : true)), [products, f.inStock]);
  const hasActive = f.q || f.cat !== "all" || f.inStock || f.minPrice || f.maxPrice || f.sort !== "recent";

  return (
    <SiteShell>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-energy">Boutique</p>
          <h1 className="mt-2 text-display text-3xl font-extrabold md:text-4xl">Matériel technique certifié</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Explorez notre sélection : énergie solaire, CCTV, réseaux, climatisation et outillage professionnel. Vos filtres sont sauvegardés automatiquement.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3 shadow-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={f.q} onChange={(e) => patch({ q: e.target.value })} placeholder="Rechercher (nom, marque, réf…)" className="pl-9 border-transparent bg-secondary" />
          </div>
          <Select value={f.sort} onValueChange={(v) => patch({ sort: v })}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1"><X className="h-4 w-4" />Réinitialiser</Button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-display text-sm font-bold uppercase tracking-wide"><SlidersHorizontal className="h-4 w-4 text-energy" /> Filtres</h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Catégorie / service</p>
                  <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" checked={f.cat === "all"} onChange={() => patch({ cat: "all" })} className="accent-energy" />
                      Toutes
                    </label>
                    {cats?.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" checked={f.cat === c.id} onChange={() => patch({ cat: c.id })} className="accent-energy" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Prix ({cur})</p>
                  <div className="flex gap-2">
                    <Input type="number" min={0} placeholder="Min" value={f.minPrice} onChange={(e) => patch({ minPrice: e.target.value })} className="h-9" />
                    <Input type="number" min={0} placeholder="Max" value={f.maxPrice} onChange={(e) => patch({ maxPrice: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={f.inStock} onCheckedChange={(v) => patch({ inStock: Boolean(v) })} /> En stock uniquement
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
              <span>
                {list.length} produit{list.length > 1 ? "s" : ""}
                {isFetching && !isLoading && <span className="ml-2 text-xs text-energy animate-pulse">Actualisation…</span>}
              </span>
            </div>
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border bg-background p-4 animate-pulse">
                    <div className="aspect-square rounded-lg bg-muted" />
                    <div className="mt-3 h-4 bg-muted rounded w-3/4" />
                    <div className="mt-2 h-4 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : !list.length ? (
              <div className="rounded-xl border bg-background p-16 text-center text-muted-foreground">
                Aucun produit trouvé.
                {hasActive && <div className="mt-3"><Button variant="outline" size="sm" onClick={reset}>Réinitialiser les filtres</Button></div>}
              </div>
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
