import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, useSettings } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: Page });

const STATUS = ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled", "refunded"] as const;
const LABEL: Record<string, string> = { pending: "En attente", confirmed: "Confirmée", preparing: "Préparation", shipping: "Livraison", delivered: "Livrée", cancelled: "Annulée", refunded: "Remboursée" };

const PAY_LABEL: Record<string, string> = { pending: "En attente", processing: "En cours", initiated: "Initié", completed: "Payé", success: "Payé", successful: "Payé", paid: "Payé", failed: "Échoué", cancelled: "Annulé", timeout: "Expiré" };
function payLabel(paid: boolean | null, status: string | null) {
  if (paid) return "Payé";
  if (!status) return "Non payé";
  return PAY_LABEL[status.toLowerCase()] ?? status;
}
function payVariant(paid: boolean | null, status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (paid) return "default";
  const s = (status ?? "").toLowerCase();
  if (["failed", "cancelled", "timeout"].includes(s)) return "destructive";
  if (s) return "secondary";
  return "outline";
}

function Page() {
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  const qc = useQueryClient();
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: async () => (await supabase.from("online_orders").select("*").order("created_at", { ascending: false })).data ?? [] });
  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("online_orders").update({ status: status as "pending" }).eq("id", id); if (error) throw error; },
    onSuccess: async (_data, variables) => {
      const { data: order } = await supabase.from("online_orders").select("code").eq("id", variables.id).maybeSingle();
      await createNotification({ title: "Commande mise à jour", message: `La commande ${order?.code ?? variables.id} est passée au statut ${LABEL[variables.status] ?? variables.status}.`, type: "info", entity_type: "online_order", entity_id: variables.id });
      toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Commandes en ligne</h1>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Paiement</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {!orders?.length && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Aucune commande.</TableCell></TableRow>}
            {orders?.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.code}</TableCell>
                <TableCell>{formatDate(o.created_at, true)}</TableCell>
                <TableCell>{o.customer_name}<div className="text-xs text-muted-foreground">{o.customer_phone}</div></TableCell>
                <TableCell><Badge variant="outline">{o.delivery_mode}</Badge></TableCell>
                <TableCell className="text-right">{formatMoney(Number(o.total_usd), cur, rate)}</TableCell>
                <TableCell>
                  <Badge variant={payVariant(o.paid, o.payment_status)}>{payLabel(o.paid, o.payment_status)}</Badge>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {(o.payment_method ?? o.payment_provider) ? `${o.payment_provider ?? ""} ${o.payment_method ?? ""}`.trim() : "—"}
                    {o.payment_ref ? ` · ${o.payment_ref}` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => upd.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
