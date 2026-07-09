import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, type Currency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Page });

function Page() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [f, setF] = useState({ shop_name: "", address: "", phone: "", whatsapp: "", email: "", primary_currency: "USD" as Currency, usd_to_cdf_rate: 2800, low_stock_threshold: 5, invoice_prefix: "CNT" });
  useEffect(() => { if (data) setF({ shop_name: data.shop_name, address: data.address ?? "", phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", email: data.email ?? "", primary_currency: data.primary_currency, usd_to_cdf_rate: data.usd_to_cdf_rate, low_stock_threshold: data.low_stock_threshold, invoice_prefix: data.invoice_prefix }); }, [data]);
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("settings").update(f).eq("id", 1); if (error) throw error; },
    onSuccess: () => { toast.success("Paramètres enregistrés"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-display text-2xl font-bold">Paramètres</h1>
      <Card><CardContent className="p-6 space-y-4">
        <div><Label>Nom de la boutique</Label><Input value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Adresse</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Devise principale</Label>
            <Select value={f.primary_currency} onValueChange={(v) => setF({ ...f, primary_currency: v as Currency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CDF">CDF</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Taux USD → CDF</Label><Input type="number" value={f.usd_to_cdf_rate} onChange={(e) => setF({ ...f, usd_to_cdf_rate: +e.target.value })} /></div>
          <div><Label>Seuil stock global</Label><Input type="number" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: +e.target.value })} /></div>
        </div>
        <div><Label>Préfixe reçus/factures</Label><Input value={f.invoice_prefix} onChange={(e) => setF({ ...f, invoice_prefix: e.target.value })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
      </CardContent></Card>
    </div>
  );
}
