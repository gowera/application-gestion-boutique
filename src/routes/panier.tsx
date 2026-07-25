import { StorageImage } from "@/components/storage-image";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney, useSettings } from "@/lib/currency";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/panier")({ component: CartPage });

function CartPage() {
  const { items, update, remove, subtotal, count } = useCart();
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-display text-3xl font-bold">Mon panier</h1>
        {!items.length ? (
          <Card className="mt-8"><CardContent className="p-12 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">Votre panier est vide.</p>
            <Link to="/boutique"><Button className="mt-4">Aller à la boutique</Button></Link>
          </CardContent></Card>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {items.map((it) => (
                <Card key={it.product_id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-20 w-20 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                      <StorageImage src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-2">{it.name}</div>
                      <div className="text-sm text-muted-foreground">{formatMoney(it.price_usd, cur, rate)}</div>
                    </div>
                    <div className="flex items-center rounded-md border">
                      <Button size="sm" variant="ghost" onClick={() => update(it.product_id, it.qty - 1)}>−</Button>
                      <span className="w-8 text-center">{it.qty}</span>
                      <Button size="sm" variant="ghost" onClick={() => update(it.product_id, it.qty + 1)}>+</Button>
                    </div>
                    <div className="w-24 text-right font-semibold">{formatMoney(it.price_usd * it.qty, cur, rate)}</div>
                    <Button size="sm" variant="ghost" onClick={() => remove(it.product_id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="h-fit">
              <CardContent className="p-6">
                <h3 className="text-display font-semibold">Résumé</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Articles</dt><dd>{count}</dd></div>
                  <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatMoney(subtotal, cur, rate)}</dd></div>
                  <div className="flex justify-between"><dt>Livraison</dt><dd className="text-muted-foreground">Calculée au checkout</dd></div>
                </dl>
                <div className="mt-4 border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span><span>{formatMoney(subtotal, cur, rate)}</span>
                </div>
                <Link to="/checkout"><Button size="lg" className="w-full mt-6">Passer à la commande <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
