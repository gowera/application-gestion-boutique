import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, useSettings } from "@/lib/currency";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/commande/$code")({ component: OrderTracking });

const STATUS_LABEL: Record<string, string> = { pending: "En attente", confirmed: "Confirmée", preparing: "En préparation", shipping: "En livraison", delivered: "Livrée", cancelled: "Annulée", refunded: "Remboursée" };

function OrderTracking() {
  const { code } = useParams({ from: "/commande/$code" });
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-track", code],
    queryFn: async () => {
      const { data } = await supabase.from("online_orders").select("*, order_items(*)").eq("code", code).maybeSingle();
      return data;
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        {isLoading ? <div className="text-center text-muted-foreground py-16">Chargement…</div> :
         !order ? <Card><CardContent className="p-12 text-center"><p className="text-muted-foreground">Commande introuvable.</p><Link to="/boutique"><Button className="mt-4">Boutique</Button></Link></CardContent></Card> :
         <>
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl">✓</div>
            <h1 className="text-display text-3xl font-bold mt-4">Merci pour votre commande !</h1>
            <p className="mt-2 text-muted-foreground">Numéro : <span className="font-mono font-semibold">{order.code}</span></p>
            <Badge className="mt-3">{STATUS_LABEL[order.status]}</Badge>
          </div>
          <Card className="mt-8"><CardContent className="p-6 space-y-4">
            <h3 className="text-display font-semibold">Détails</h3>
            <div className="text-sm space-y-1">
              <div>Passée le {formatDate(order.created_at, true)}</div>
              <div>Client : {order.customer_name} — {order.customer_phone}</div>
              {order.delivery_address && <div>Livraison : {order.delivery_address}</div>}
            </div>
            <div className="border-t pt-4">
              <div className="space-y-2 text-sm">
                {order.order_items?.map((it: { id: string; qty: number; product_name: string; line_total_usd: number }) => (
                  <div key={it.id} className="flex justify-between"><span>{it.qty}× {it.product_name}</span><span>{formatMoney(Number(it.line_total_usd), cur, rate)}</span></div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4 flex justify-between font-bold"><span>Total</span><span>{formatMoney(Number(order.total_usd), cur, rate)}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Nous vous contactons rapidement pour la suite. Pour toute question : +243 996 886 079</p>
          </CardContent></Card>
         </>
        }
      </div>
    </SiteShell>
  );
}
