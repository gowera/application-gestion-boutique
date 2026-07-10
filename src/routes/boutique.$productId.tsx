import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, useSettings } from "@/lib/currency";
import { ShoppingCart, Package, ArrowLeft, Heart, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/boutique/$productId")({ component: ProductPage });

function ProductPage() {
  const { productId } = useParams({ from: "/boutique/$productId" });
  const { data: settings } = useSettings();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", productId).maybeSingle()).data,
  });

  if (isLoading) return <SiteShell><div className="py-20 text-center text-muted-foreground">Chargement…</div></SiteShell>;
  if (!p) return <SiteShell><div className="py-20 text-center"><p className="text-muted-foreground">Produit introuvable.</p><Link to="/boutique"><Button className="mt-4">Retour boutique</Button></Link></div></SiteShell>;

  const img = p.images?.[0];

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link to="/boutique" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"><ArrowLeft className="h-4 w-4" /> Retour boutique</Link>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square bg-secondary rounded-2xl flex items-center justify-center overflow-hidden">
            {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-24 w-24 text-muted-foreground/30" />}
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{p.brand ?? "CONETEC"}</div>
            <h1 className="text-display text-3xl font-bold mt-1">{p.name}</h1>
            <div className="mt-2 flex gap-2">
              {p.stock > 0 ? <Badge>En stock ({p.stock})</Badge> : <Badge variant="destructive">Rupture</Badge>}
              {p.sku && <Badge variant="outline">SKU: {p.sku}</Badge>}
            </div>
            <div className="mt-6 text-4xl font-bold text-primary">{formatMoney(Number(p.sale_price), cur, rate)}</div>
            {p.description && <p className="mt-6 text-muted-foreground whitespace-pre-line">{p.description}</p>}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-md border">
                <Button size="sm" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
                <span className="w-10 text-center">{qty}</span>
                <Button size="sm" variant="ghost" onClick={() => setQty(qty + 1)}>+</Button>
              </div>
              <Button size="lg" className="flex-1" disabled={p.stock <= 0} onClick={() => { add({ product_id: p.id, name: p.name, price_usd: Number(p.sale_price), image: img, qty }); toast.success("Ajouté au panier"); }}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
              </Button>
              <Button size="lg" variant="outline" title="Favoris"><Heart className="h-4 w-4" /></Button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4 flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Matériel garanti</CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-primary" /> Livraison rapide</CardContent></Card>
            </div>
            <div className="mt-6">
              <Link to="/devis"><Button variant="link" className="px-0">Besoin d'un devis pour ce produit ?</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
