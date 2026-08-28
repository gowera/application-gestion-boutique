import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSettings, formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { XCircle, Eye, FileDown, Printer } from "lucide-react";
import { exportToXlsx } from "@/lib/xlsx-export";
import { downloadTablePdf } from "@/lib/pdf-table";
import { reprintSaleDocument } from "@/lib/reprint";
import { offlineQueryFn } from "@/lib/offline/query";
import { cacheGet } from "@/lib/offline/store";
import { isOffline } from "@/lib/offline/sync";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/sales")({
  component: SalesPage,
});

type SaleRecord = Database["public"]["Tables"]["sales"]["Row"] & { customers?: { id?: string; name?: string; phone?: string | null } | null };
type SaleItemRecord = Database["public"]["Tables"]["sale_items"]["Row"];
type PaymentRecord = Database["public"]["Tables"]["payments"]["Row"];

function SalesPage() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-list"],
    queryFn: offlineQueryFn("query:sales-list", async () => {
      const { data, error } = await supabase.from("sales").select("*, customers(name)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    }, "table:sales"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("cancel_sale", { _sale_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vente annulée"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportAll() {
    if (!sales) return;
    exportToXlsx("ventes.xlsx", sales.map((s) => ({
      Code: s.code, Date: formatDate(s.created_at, true),
      Client: (s as { customers?: { name?: string } }).customers?.name ?? "Anonyme",
      Total_USD: Number(s.total_usd), Payé_USD: Number(s.paid_usd), Crédit_USD: Number(s.credit_usd),
      Statut: s.status,
    })));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl md:text-3xl font-bold">Ventes</h1>
          <p className="text-sm text-muted-foreground">Historique de toutes les ventes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAll}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => sales && downloadTablePdf({
            title: "Historique des ventes",
            columns: ["Code", "Date", "Client", "Total", "Payé", "Crédit", "Statut"],
            rows: sales.map((s) => [s.code, formatDate(s.created_at, true), (s as { customers?: { name?: string } }).customers?.name ?? "Anonyme", formatMoney(Number(s.total_usd), currency, rate), formatMoney(Number(s.paid_usd), currency, rate), Number(s.credit_usd) > 0 ? formatMoney(Number(s.credit_usd), currency, rate) : "—", s.status]),
            filename: "ventes.pdf", orientation: "l",
          })}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">Crédit</TableHead><TableHead>Statut</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
              {sales?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell>{formatDate(s.created_at, true)}</TableCell>
                  <TableCell>{(s as { customers?: { name?: string } }).customers?.name ?? "Anonyme"}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(s.total_usd), currency, rate)}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(s.paid_usd), currency, rate)}</TableCell>
                  <TableCell className="text-right">{Number(s.credit_usd) > 0 ? formatMoney(Number(s.credit_usd), currency, rate) : "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)} title="Détails"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Réimprimer reçu" onClick={async () => {
                        try { await reprintSaleDocument({ saleId: s.id, docType: "recu", settings }); toast.success("Reçu régénéré"); }
                        catch (e) { toast.error((e as Error).message); }
                      }}><Printer className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Réimprimer facture" onClick={async () => {
                        try { await reprintSaleDocument({ saleId: s.id, docType: "facture", settings }); toast.success("Facture régénérée"); }
                        catch (e) { toast.error((e as Error).message); }
                      }}><FileDown className="h-3.5 w-3.5" /></Button>
                      {s.status === "completed" && (
                        <Button size="sm" variant="ghost" className="text-destructive" title="Annuler la vente" onClick={() => confirm("Annuler cette vente ?") && cancel.mutate(s.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <SaleDetail id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function SaleDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const { data } = useQuery<{ sale: SaleRecord | null; items: SaleItemRecord[]; payments: PaymentRecord[] }>({
    queryKey: ["sale-detail", id],
    enabled: !!id,
    queryFn: async () => {
      if (isOffline()) {
        const [sales, items, payments, customers] = await Promise.all([
          cacheGet<SaleRecord[]>("table:sales"),
          cacheGet<SaleItemRecord[]>("table:sale_items"),
          cacheGet<PaymentRecord[]>("table:payments"),
          cacheGet<Array<{ id: string; name: string; phone?: string | null }>>("table:customers"),
        ]);
        const sale = (sales ?? []).find((row) => row.id === id);
        const customer = customers?.find((row) => row.id === sale?.customer_id);
        return { sale: sale ? { ...sale, customers: customer ?? null } : null, items: (items ?? []).filter((row) => row.sale_id === id), payments: (payments ?? []).filter((row) => row.sale_id === id) };
      }
      const [{ data: sale }, { data: items }, { data: payments }] = await Promise.all([
        supabase.from("sales").select("*, customers(name,phone)").eq("id", id!).maybeSingle(),
        supabase.from("sale_items").select("*").eq("sale_id", id!),
        supabase.from("payments").select("*").eq("sale_id", id!),
      ]);
      return { sale: sale as SaleRecord | null, items: (items ?? []) as SaleItemRecord[], payments: (payments ?? []) as PaymentRecord[] };
    },
  });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{data?.sale?.code ?? "Détail"}</DialogTitle></DialogHeader>
        {data?.sale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Client:</span> {(data.sale as { customers?: { name?: string } }).customers?.name ?? "Anonyme"}</div>
              <div><span className="text-muted-foreground">Date:</span> {formatDate(data.sale.created_at, true)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Articles</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">P.U.</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.product_name}</TableCell>
                      <TableCell className="text-right">{i.qty}</TableCell>
                      <TableCell className="text-right">{formatMoney(Number(i.unit_price_usd), currency, rate)}</TableCell>
                      <TableCell className="text-right">{formatMoney(Number(i.line_total_usd), currency, rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Sous-total</span><span>{formatMoney(Number(data.sale.subtotal_usd), currency, rate)}</span></div>
              <div className="flex justify-between"><span>Remise</span><span>{formatMoney(Number(data.sale.discount_usd), currency, rate)}</span></div>
              <div className="flex justify-between font-bold text-display text-lg"><span>Total</span><span>{formatMoney(Number(data.sale.total_usd), currency, rate)}</span></div>
              <div className="flex justify-between"><span>Payé</span><span>{formatMoney(Number(data.sale.paid_usd), currency, rate)}</span></div>
              {Number(data.sale.credit_usd) > 0 && <div className="flex justify-between text-warning-foreground"><span>Crédit</span><span>{formatMoney(Number(data.sale.credit_usd), currency, rate)}</span></div>}
            </div>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Fermer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
