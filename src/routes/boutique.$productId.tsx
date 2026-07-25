import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, useSettings } from "@/lib/currency";
import {
  ShoppingCart, Package, ChevronRight, Heart, ShieldCheck, Truck, HeadphonesIcon,
  Star, Zap, FileText, ArrowRight,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/boutique/$productId")({
  component: ProductPage,
  head: () => ({ meta: [
    { title: "Fiche produit — CONETEC" },
    { name: "description", content: "Consultez les caractéristiques, disponibilité et prix du matériel CONETEC." },
  ]}),
});

function ProductPage() {
  const { productId } = useParams({ from: "/boutique/$productId" });
  const { data: settings } = useSettings();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", productId).maybeSingle()).data,
  });

  if (isLoading) return <SiteShell><div className="py-24 text-center text-muted-foreground">Chargement…</div></SiteShell>;
  if (!p) return <SiteShell><div className="py-24 text-center"><p className="text-muted-foreground">Produit introuvable.</p><Link to="/boutique"><Button className="mt-4">Retour catalogue</Button></Link></div></SiteShell>;

  const images: string[] = p.images?.length ? p.images : [];
  const price = Number(p.sale_price);
  const oldPrice = p.compare_at_price ? Number(p.compare_at_price) : null;
  const savings = oldPrice && oldPrice > price ? oldPrice - price : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/boutique" className="hover:text-primary">Catalogue</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate">{p.name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          {/* Gallery */}
          <div>
            <div className="relative overflow-hidden rounded-2xl border bg-secondary aspect-square">
              {images[activeImg]
                ? <img src={images[activeImg]} alt={p.name} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center"><Package className="h-24 w-24 text-muted-foreground/30" /></div>}
              {savings && <span className="absolute left-4 top-4 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground">−{Math.round((savings / oldPrice!) * 100)}%</span>}
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.slice(0, 5).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 bg-secondary transition-all ${activeImg === i ? "border-energy" : "border-transparent hover:border-border"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {p.stock > 0
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-energy/10 px-3 py-1 text-xs font-bold text-energy"><span className="h-1.5 w-1.5 rounded-full bg-energy" /> En stock</span>
                : <Badge variant="destructive">Rupture de stock</Badge>}
              <Badge variant="outline" className="border-primary/20 text-primary">{p.brand ?? "CONETEC"}</Badge>
            </div>

            <h1 className="mt-3 text-display text-3xl font-extrabold leading-tight md:text-4xl">{p.name}</h1>

            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((i) => <Star key={i} className="h-4 w-4 fill-energy text-energy" />)}
              </div>
              <span>4.8 · Réf. {p.sku ?? p.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="mt-6 rounded-2xl border-l-4 border-l-energy bg-secondary/50 p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-display text-4xl font-extrabold text-primary">{formatMoney(price, cur, rate)}</span>
                {oldPrice && oldPrice > price && (
                  <span className="text-lg font-medium text-muted-foreground line-through">{formatMoney(oldPrice, cur, rate)}</span>
                )}
              </div>
              {savings && <p className="mt-1 text-sm font-semibold text-energy">Économisez {formatMoney(savings, cur, rate)}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Prix HT · TVA applicable selon règlementation</p>
            </div>

            <div className="mt-6 space-y-2.5 text-sm">
              <Feature icon={ShieldCheck} label="Garantie constructeur incluse" />
              <Feature icon={Truck} label="Livraison rapide Kinshasa & environs" />
              <Feature icon={HeadphonesIcon} label="Support technique 7j/7" />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-md border bg-background">
                <button className="px-3 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button className="px-3 py-2 text-lg" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <Button
                size="lg"
                className="flex-1 bg-energy text-energy-foreground hover:bg-energy/90"
                disabled={p.stock <= 0}
                onClick={() => { add({ product_id: p.id, name: p.name, price_usd: price, image: images[0] ?? null, qty }); toast.success("Ajouté au panier"); }}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
              </Button>
              <Button size="lg" variant="outline" title="Favoris"><Heart className="h-4 w-4" /></Button>
            </div>
            <Link to="/panier">
              <Button size="lg" variant="outline" className="mt-3 w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Acheter maintenant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link to="/devis" className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-accent/30 p-4 transition-colors hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground"><FileText className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-semibold">Demander un devis d'installation</div>
                  <div className="text-xs text-muted-foreground">Pose et mise en service par nos techniciens</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-14">
          <Tabs defaultValue="specs">
            <TabsList className="bg-secondary">
              <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
              <TabsTrigger value="desc">Description</TabsTrigger>
              <TabsTrigger value="reviews">Avis</TabsTrigger>
            </TabsList>
            <TabsContent value="specs" className="rounded-2xl border bg-background p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <SpecRow label="Marque" value={p.brand ?? "—"} />
                <SpecRow label="Référence" value={p.sku ?? "—"} />
                <SpecRow label="Stock disponible" value={p.show_stock_public ? String(p.stock) : "Sur demande"} />
                <SpecRow label="Statut" value={p.status ?? "actif"} />
              </div>
            </TabsContent>
            <TabsContent value="desc" className="rounded-2xl border bg-background p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {p.description || "Contactez notre équipe technique pour une description détaillée de ce produit."}
              </p>
            </TabsContent>
            <TabsContent value="reviews" className="rounded-2xl border bg-background p-6">
              <p className="text-sm text-muted-foreground">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteShell>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></div>
      <span>{label}</span>
    </div>
  );
}
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
