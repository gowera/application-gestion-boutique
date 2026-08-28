import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Search, FileText } from "lucide-react";
import { useSettings, formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { reprintSaleDocument } from "@/lib/reprint";
import type { DocumentType } from "@/lib/documents";
import { offlineQueryFn } from "@/lib/offline/query";

export const Route = createFileRoute("/_authenticated/admin/documents/history")({ component: HistoryPage });

type Row = {
  id: string;
  code: string;
  doc_type: DocumentType;
  doc_number: number;
  sale_id: string | null;
  customer_name: string | null;
  total_usd: number;
  created_at: string;
};

function HistoryPage() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;

  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | DocumentType>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["document-history", q, type, from, to],
    queryFn: offlineQueryFn("query:document-history", async () => {
      let query = supabase
        .from("document_registry")
        .select("id, code, doc_type, doc_number, sale_id, customer_name, total_usd, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Row[];
    }, "table:document_registry"),
  });

  const visibleData = useMemo(() => data.filter((row) => {
    const needle = q.trim().toLowerCase();
    return (type === "all" || row.doc_type === type)
      && (!from || row.created_at >= `${from}T00:00:00`)
      && (!to || row.created_at <= `${to}T23:59:59`)
      && (!needle || row.code.toLowerCase().includes(needle) || (row.customer_name ?? "").toLowerCase().includes(needle));
  }), [data, from, q, to, type]);

  const totals = useMemo(() => {
    const factures = visibleData.filter((r) => r.doc_type === "facture");
    const recus = visibleData.filter((r) => r.doc_type === "recu");
    return {
      facturesCount: factures.length,
      recusCount: recus.length,
      totalUsd: visibleData.reduce((s, r) => s + Number(r.total_usd || 0), 0),
    };
  }, [visibleData]);

  async function reprint(row: Row) {
    if (!row.sale_id) { toast.error("Document sans vente liée — réimpression impossible."); return; }
    setReprintingId(row.id);
    try {
      await reprintSaleDocument({ saleId: row.sale_id, docType: row.doc_type, settings });
      toast.success("Document régénéré");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReprintingId(null);
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl md:text-3xl font-bold">Historique des documents</h1>
          <p className="text-sm text-muted-foreground">Factures et reçus émis, avec recherche et réimpression PDF.</p>
        </div>
        <Button asChild variant="outline"><Link to="/admin/documents"><FileText className="mr-2 h-4 w-4" />Éditeur de modèles</Link></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Factures</div><div className="text-2xl font-bold text-display">{totals.facturesCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Reçus</div><div className="text-2xl font-bold text-display">{totals.recusCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total émis</div><div className="text-2xl font-bold text-display">{formatMoney(totals.totalUsd, currency, rate)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recherche</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Code ou client</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="FACT-2026-… ou nom du client" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "all" | DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="facture">Factures</SelectItem>
                  <SelectItem value="recu">Reçus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && visibleData.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Aucun document.</TableCell></TableRow>}
              {visibleData.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>
                    <Badge variant={r.doc_type === "facture" ? "default" : "secondary"}>
                      {r.doc_type === "facture" ? "Facture" : "Reçu"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.customer_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.created_at, true)}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(r.total_usd), currency, rate)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" disabled={!r.sale_id || reprintingId === r.id} onClick={() => reprint(r)}>
                      <Printer className="h-3.5 w-3.5 mr-1" />Réimprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
