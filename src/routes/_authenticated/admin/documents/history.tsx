import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { buildReceiptDoc } from "@/lib/pdf";
import { getStoredDocumentTemplate } from "@/lib/document-template";
import { useLogoDataUrl } from "@/lib/logo";
import { recordPrint } from "@/lib/print-log";
import { useCurrentUser } from "@/hooks/use-auth";
import { PdfPreview } from "@/components/documents/pdf-preview";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/documents/history")({ component: HistoryPage });

type Row = {
  id: string;
  code: string;
  doc_type: DocumentType;
  doc_number: number;
  sale_id: string | null;
  customer_name: string | null;
  customer_id?: string | null;
  total_usd: number;
  created_at: string;
  document_kind?: "standard" | "monthly" | "proforma";
  billing_period?: string | null;
  items?: Array<{ name: string; qty: number; unit: number; total: number }>;
  subtotal_usd?: number;
  discount_usd?: number;
  paid_usd?: number;
  credit_usd?: number;
  note?: string | null;
};

function HistoryPage() {
  const { data: settings } = useSettings();
  const logoDataUrl = useLogoDataUrl();
  const { user } = useCurrentUser();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;

  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | DocumentType | "monthly" | "proforma">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const printAfterRender = useRef(false);
  const onPdfRendered = useCallback(() => {
    if (!printAfterRender.current) return;
    printAfterRender.current = false;
    window.setTimeout(() => window.print(), 100);
  }, []);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["document-history", q, type, from, to],
    queryFn: offlineQueryFn("query:document-history", async () => {
      let query = supabase
        .from("document_registry")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Row[];
    }, "table:document_registry"),
  });

  const visibleData = useMemo(() => data.filter((row) => {
    const needle = q.trim().toLowerCase();
    const matchesType = type === "all"
      || (type === "monthly" && row.document_kind === "monthly")
      || (type === "proforma" && row.document_kind === "proforma")
      || (type === "facture" && row.doc_type === "facture" && row.document_kind !== "proforma")
      || (type === "recu" && row.doc_type === "recu");
    return matchesType
      && (!from || row.created_at >= `${from}T00:00:00`)
      && (!to || row.created_at <= `${to}T23:59:59`)
      && (!needle || row.code.toLowerCase().includes(needle) || (row.customer_name ?? "").toLowerCase().includes(needle));
  }), [data, from, q, to, type]);

  const totals = useMemo(() => {
    const factures = visibleData.filter((r) => r.doc_type === "facture" && r.document_kind !== "proforma");
    const recus = visibleData.filter((r) => r.doc_type === "recu");
    return {
      facturesCount: factures.length,
      recusCount: recus.length,
      totalUsd: visibleData.reduce((s, r) => s + Number(r.total_usd || 0), 0),
    };
  }, [visibleData]);

  async function reprint(row: Row) {
    setReprintingId(row.id);
    try {
      if (row.items?.length) {
        const documentType = row.document_kind === "proforma"
          ? "Facture Proforma"
          : row.document_kind === "monthly" ? "Facture mensuelle" : row.doc_type === "facture" ? "Facture" : "Reçu";
        const pdf = buildReceiptDoc({
          logoDataUrl,
          shopName: settings?.shop_name ?? "Ma boutique",
          address: settings?.address ?? "",
          phone: settings?.phone ?? "",
          code: row.code,
          customer: row.customer_name ?? "Client",
          items: row.items,
          subtotal: Number(row.subtotal_usd ?? row.total_usd),
          discount: Number(row.discount_usd ?? 0),
          total: Number(row.total_usd),
          paid: Number(row.paid_usd ?? 0),
          credit: Number(row.credit_usd ?? row.total_usd),
          currency,
          rate,
          documentType,
          template: getStoredDocumentTemplate(),
          note: row.note ?? undefined,
          billingPeriod: row.billing_period ?? undefined,
        });
        printAfterRender.current = true;
        setPreviewData(pdf.output("datauristring"));
        await recordPrint({
          code: row.code,
          documentType,
          customer: row.customer_name ?? "Client",
          totalUsd: Number(row.total_usd),
          user: user?.email ?? "Utilisateur",
          origin: "réimpression",
        });
        toast.success("Document prêt à imprimer");
      } else if (row.sale_id) {
        setPreviewData(await reprintSaleDocument({ saleId: row.sale_id, docType: row.doc_type, settings }));
        printAfterRender.current = true;
        await recordPrint({
          code: row.code,
          documentType: row.doc_type === "facture" ? "Facture" : "Reçu",
          customer: row.customer_name ?? "Client",
          totalUsd: Number(row.total_usd),
          user: user?.email ?? "Utilisateur",
          origin: "réimpression",
        });
        toast.success("Document prêt à imprimer");
      } else {
        toast.error("Le contenu de ce document n’est pas disponible pour la réimpression.");
      }
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
              <Select value={type} onValueChange={(v) => setType(v as "all" | DocumentType | "monthly" | "proforma")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="facture">Factures</SelectItem>
                  <SelectItem value="monthly">Factures mensuelles</SelectItem>
                  <SelectItem value="proforma">Factures proforma</SelectItem>
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
                      {r.document_kind === "proforma"
                        ? "Facture proforma"
                        : r.document_kind === "monthly"
                          ? `Facture mensuelle${r.billing_period ? ` · ${r.billing_period}` : ""}`
                          : r.doc_type === "facture" ? "Facture" : "Reçu"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.customer_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.created_at, true)}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(r.total_usd), currency, rate)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" disabled={(!r.sale_id && !r.items?.length) || reprintingId === r.id} onClick={() => reprint(r)}>
                      <Printer className="h-3.5 w-3.5 mr-1" />Réimprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={previewData !== null} onOpenChange={(open) => { if (!open) setPreviewData(null); }}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Réimpression du document</DialogTitle></DialogHeader>
          {previewData && <PdfPreview dataUri={previewData} onRendered={onPdfRendered} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewData(null)}>Fermer</Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
