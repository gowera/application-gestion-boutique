import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney, useSettings } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { feeForCity, useDeliveryConfig, useSelectedCity } from "@/lib/delivery";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { initiateShwaryPayment, getOrderPaymentStatus, cancelUnpaidOrder } from "@/lib/shwary.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { Smartphone, Wallet, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type PayMethod = "shwary" | "cod";

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { data: settings } = useSettings();
  const nav = useNavigate();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  const initShwary = useServerFn(initiateShwaryPayment);
  const checkStatus = useServerFn(getOrderPaymentStatus);
  const cancelOrder = useServerFn(cancelUnpaidOrder);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", note: "",
    mode: "delivery" as "delivery" | "pickup",
    pay: "shwary" as PayMethod,
    payPhone: "",
  });
  const { user } = useCurrentUser();
  const { data: profile } = useQuery({
    queryKey: ["checkout", "profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || profile?.full_name || "",
      phone: f.phone || profile?.phone || "",
      email: f.email || user.email || "",
    }));
  }, [user, profile]);
  const delivery = useDeliveryConfig();
  const { city, setCity } = useSelectedCity();
  const activeCity = delivery.cities.some((c) => c.city === city) ? city : null;
  const deliveryFee = form.mode === "delivery" ? feeForCity(delivery, activeCity) : 0;
  const total = subtotal + deliveryFee;
  const totalCdf = Math.round(total * rate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return toast.error("Panier vide");
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    if (form.mode === "delivery" && delivery.cities.length > 0 && !activeCity) return toast.error("Choisissez la ville de livraison");
    if (form.pay === "shwary" && !form.payPhone) return toast.error("Numéro Mobile Money requis");
    setLoading(true);
    setWaiting(false);
    const { data, error } = await supabase.rpc("create_online_order", {
      _customer_name: form.name,
      _customer_phone: form.phone,
      _customer_email: form.email || (null as unknown as string),
      _delivery_mode: form.mode,
      _delivery_address: (form.mode === "delivery" ? [activeCity, form.address].filter(Boolean).join(" — ") || null : null) as unknown as string,
      _delivery_fee_usd: deliveryFee,
      _items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })) as unknown as string,
      _note: (form.note || null) as unknown as string,
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    const orderId = data as unknown as string;
    const { data: order } = await supabase.from("online_orders").select("code").eq("id", orderId).maybeSingle();
    const code = order?.code as string | undefined;

    if (form.pay === "shwary") {
      // Le paiement doit aboutir avant que la commande soit validée.
      try {
        await initShwary({ data: { orderId, phone: form.payPhone } });
      } catch (err) {
        await cancelOrder({ data: { orderId, reason: "failed" } }).catch(() => {});
        setLoading(false);
        return toast.error(err instanceof Error ? err.message : "Erreur paiement Shwary");
      }
      setWaiting(true);
      toast.info("Validez l'invite Mobile Money sur votre téléphone…");
      const deadline = Date.now() + 180_000;
      let paid = false;
      let failure: string | null = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const st = (await checkStatus({ data: { code: code ?? "" } })) as { paid?: boolean; payment_status?: string | null };
          if (st?.paid) { paid = true; break; }
          if (st?.payment_status === "failed" || st?.payment_status === "cancelled") { failure = st.payment_status; break; }
        } catch { /* réessai */ }
      }
      setWaiting(false);
      if (!paid) {
        await cancelOrder({ data: { orderId, reason: failure ?? "timeout" } }).catch(() => {});
        setLoading(false);
        return toast.error(
          failure === "cancelled" ? "Paiement annulé — commande non validée."
          : failure === "failed" ? "Paiement refusé — commande non validée."
          : "Paiement non confirmé à temps — commande non validée. Réessayez.",
        );
      }
      toast.success("Paiement confirmé ! Commande validée.");
    } else {
      toast.success("Commande enregistrée !");
    }

    await createNotification({
      title: "Nouvelle commande",
      message: `Commande ${code ?? orderId} reçue de ${form.name}${form.pay === "shwary" ? " (payée Mobile Money)" : ""}.`,
      type: "info", entity_type: "online_order", entity_id: orderId,
    });

    clear();
    setLoading(false);
    if (code) nav({ to: "/commande/$code", params: { code } });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-display text-3xl font-bold">Finaliser la commande</h1>
        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card><CardContent className="p-6 space-y-4">
            <h3 className="text-display font-semibold">Vos informations</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Nom complet *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Mode de réception</Label>
              <RadioGroup value={form.mode} onValueChange={(v: "delivery" | "pickup") => setForm({ ...form, mode: v })} className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer"><RadioGroupItem value="delivery" /> Livraison{activeCity ? ` (+${formatMoney(deliveryFee, cur, rate)})` : ""}</label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer"><RadioGroupItem value="pickup" /> Retrait en boutique</label>
              </RadioGroup>
            </div>
            {form.mode === "delivery" && delivery.cities.length > 0 && (
              <div>
                <Label>Ville de livraison *</Label>
                <Select value={activeCity ?? ""} onValueChange={(v) => setCity(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
                  <SelectContent>
                    {delivery.cities.map((c) => (
                      <SelectItem key={c.city} value={c.city}>{c.city} — {formatMoney(c.fee, cur, rate)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">Délai moyen : {delivery.delay}</p>
              </div>
            )}
            {form.mode === "delivery" && <div><Label>Adresse de livraison</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>}
            <div><Label>Note à la commande</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>

            <div className="pt-4 border-t">
              <Label>Mode de paiement</Label>
              <RadioGroup value={form.pay} onValueChange={(v: PayMethod) => setForm({ ...form, pay: v })} className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="shwary" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4 text-primary" /> Mobile Money (Shwary)</div>
                    <p className="text-xs text-muted-foreground mt-1">Orange, Airtel, M-Pesa, Africell. Paiement instantané sécurisé.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="cod" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium"><Wallet className="h-4 w-4 text-primary" /> Paiement à la livraison / en boutique</div>
                    <p className="text-xs text-muted-foreground mt-1">Réglez à la réception ou en magasin.</p>
                  </div>
                </label>
              </RadioGroup>
              {form.pay === "shwary" && (
                <div className="mt-3 rounded-md border bg-primary/5 p-3 space-y-2">
                  <Label className="text-xs">Numéro Mobile Money (RDC)</Label>
                  <Input placeholder="+243 8XX XXX XXX" value={form.payPhone} onChange={(e) => setForm({ ...form, payPhone: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground">Montant à débiter : {totalCdf.toLocaleString("fr-FR")} CDF. Vous recevrez une invite sur votre téléphone.</p>
                </div>
              )}
            </div>
          </CardContent></Card>
          <Card className="h-fit"><CardContent className="p-6">
            <h3 className="text-display font-semibold">Résumé</h3>
            <div className="mt-4 space-y-2 text-sm max-h-48 overflow-auto">
              {items.map((it) => (
                <div key={it.product_id} className="flex justify-between gap-2">
                  <span className="truncate">{it.qty}× {it.name}</span>
                  <span>{formatMoney(it.price_usd * it.qty, cur, rate)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Sous-total</span><span>{formatMoney(subtotal, cur, rate)}</span></div>
              <div className="flex justify-between"><span>Livraison</span><span>{formatMoney(deliveryFee, cur, rate)}</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>{formatMoney(total, cur, rate)}</span></div>
            </div>
            <Button type="submit" size="lg" className="w-full mt-6" disabled={loading || !items.length}>
              {waiting ? "En attente du paiement…" : loading ? "Traitement…" : form.pay === "shwary" ? "Payer avec Mobile Money" : "Confirmer la commande"}
            </Button>
          </CardContent></Card>
        </form>
      </div>
    </SiteShell>
  );
}
