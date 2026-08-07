import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, useSettings } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { exportToXlsx } from "@/lib/xlsx-export";
import { downloadTablePdf } from "@/lib/pdf-table";
import { downloadReportPdf } from "@/lib/pdf";
import { Download, FileDown } from "lucide-react";
import { CashSessionsSection } from "@/components/admin-sections/cash-sessions-section";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Page });

function Page() {
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const range = { gte: from, lte: `${to}T23:59:59` };
  const { data: sales = [] } = useQuery({ queryKey: ["report-sales", from, to], queryFn: async () => (await supabase.from("sales").select("code, total_usd, credit_usd, status, created_at, channel, due_date, customers(name)").gte("created_at", range.gte).lte("created_at", range.lte)).data ?? [] });
  const { data: orders = [] } = useQuery({ queryKey: ["report-orders", from, to], queryFn: async () => (await supabase.from("online_orders").select("code, total_usd, status, created_at").gte("created_at", range.gte).lte("created_at", range.lte)).data ?? [] });
  const { data: exp = [] } = useQuery({ queryKey: ["report-exp", from, to], queryFn: async () => (await supabase.from("expenses").select("*").gte("created_at", range.gte).lte("created_at", range.lte)).data ?? [] });
  // Credit à payer sources: unpaid purchases + unpaid salaries + unpaid rent
  const { data: purchasesUnpaid = [] } = useQuery({ queryKey: ["report-purchases-unpaid"], queryFn: async () => (await supabase.from("purchases").select("code,total_usd,status,created_at,suppliers(name)").in("status", ["ordered", "draft"])).data ?? [] });
  const { data: salariesUnpaid = [] } = useQuery({ queryKey: ["report-salaries-unpaid"], queryFn: async () => (await supabase.from("salary_payments").select("id,amount_usd,paid_at,status,employees(full_name)").eq("status", "pending")).data ?? [] });
  const { data: rentUnpaid = [] } = useQuery({ queryKey: ["report-rent-unpaid"], queryFn: async () => (await supabase.from("rent_payments").select("id,amount_usd,period_start,period_end,paid").eq("paid", false)).data ?? [] });

  const totalSales = sales.filter((s) => s.status === "completed").reduce((a, s) => a + Number(s.total_usd), 0);
  const totalOrders = orders.reduce((a, o) => a + Number(o.total_usd), 0);
  const totalExp = exp.reduce((a, e) => a + Number(e.amount_usd), 0);
  const creditARecouvrer = sales.reduce((a, s) => a + Number(s.credit_usd ?? 0), 0);
  const profit = totalSales + totalOrders - totalExp;
  const totalEstime = profit + creditARecouvrer;

  const creditAPayerRows = useMemo(() => [
    ...purchasesUnpaid.map((p) => ({ type: "Achat", ref: p.code, party: (p.suppliers as { name?: string } | null)?.name ?? "—", date: p.created_at, amount: Number(p.total_usd) })),
    ...salariesUnpaid.map((s) => ({ type: "Salaire", ref: s.id.slice(0, 8), party: (s.employees as { full_name?: string } | null)?.full_name ?? "—", date: s.paid_at, amount: Number(s.amount_usd) })),
    ...rentUnpaid.map((r) => ({ type: "Loyer", ref: r.id.slice(0, 8), party: `${r.period_start} → ${r.period_end}`, date: r.period_start, amount: Number(r.amount_usd) })),
  ], [purchasesUnpaid, salariesUnpaid, rentUnpaid]);
  const creditAPayerTotal = creditAPayerRows.reduce((a, r) => a + r.amount, 0);

  const exportSummaryPdf = () => downloadReportPdf({
    title: "Rapport de période",
    summary: [
      { label: "Période", value: `${from} → ${to}` },
      { label: "Ventes POS", value: formatMoney(totalSales, cur, rate) },
      { label: "Commandes en ligne", value: formatMoney(totalOrders, cur, rate) },
      { label: "Dépenses", value: formatMoney(totalExp, cur, rate) },
      { label: "Solde", value: formatMoney(profit, cur, rate) },
      { label: "Crédit à recouvrer", value: formatMoney(creditARecouvrer, cur, rate) },
      { label: "Total estimé", value: formatMoney(totalEstime, cur, rate) },
      { label: "Crédit à payer", value: formatMoney(creditAPayerTotal, cur, rate) },
    ],
    sections: [
      { title: "Ventes directes (POS)", rows: sales.slice(0, 8).map((s) => ({ label: s.code, value: formatMoney(Number(s.total_usd), cur, rate) })) },
      { title: "Commandes en ligne", rows: orders.slice(0, 8).map((o) => ({ label: o.code, value: formatMoney(Number(o.total_usd), cur, rate) })) },
    ],
  });

  const creditARecouvrerRows = sales.filter((s) => Number(s.credit_usd ?? 0) > 0);

  return (
    <div className="min-w-0 space-y-6">
      <h1 className="text-display text-2xl font-bold">Rapports de caisse</h1>

      <Tabs defaultValue="periode">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="periode">Rapport de période</TabsTrigger>
          <TabsTrigger value="caisse">Sessions de caisse</TabsTrigger>
          <TabsTrigger value="recouvrer">Crédit à recouvrer</TabsTrigger>
          <TabsTrigger value="payer">Crédit à payer</TabsTrigger>
        </TabsList>

        <TabsContent value="periode" className="space-y-6 mt-4">
          <Card><CardContent className="p-4 flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <Button size="sm" variant="outline" onClick={exportSummaryPdf}><Download className="mr-2 h-4 w-4" />PDF</Button>
          </CardContent></Card>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[
              { label: "Ventes POS", val: totalSales },
              { label: "Commandes en ligne", val: totalOrders },
              { label: "Dépenses", val: totalExp },
              { label: "Solde", val: profit },
              { label: "Crédit à recouvrer", val: creditARecouvrer },
              { label: "Total estimé", val: totalEstime, highlight: true },
              { label: "Crédit à payer", val: creditAPayerTotal },
            ].map((k) => (
              <Card key={k.label} className={k.highlight ? "border-primary" : ""}><CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground">{k.label}</div>
                <div className="mt-2 text-2xl font-bold">{formatMoney(k.val, cur, rate)}</div>
              </CardContent></Card>
            ))}
          </div>

          <Card><CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Ventes directes (POS)</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportToXlsx(`ventes_${from}_${to}.xlsx`, sales as unknown as Record<string, unknown>[])}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                <Button size="sm" variant="outline" onClick={() => downloadTablePdf({ title: "Ventes directes", subtitle: `${from} → ${to}`, columns: ["Code", "Date", "Statut", "Total"], rows: sales.map((s) => [s.code, formatDate(s.created_at, true), s.status, formatMoney(Number(s.total_usd), cur, rate)]), filename: `ventes_${from}_${to}.pdf` })}><Download className="mr-2 h-4 w-4" />PDF</Button>
              </div>
            </div>
            <div className="overflow-x-auto"><Table className="min-w-[600px]"><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{sales.map((s) => <TableRow key={s.code}><TableCell className="font-mono text-xs">{s.code}</TableCell><TableCell>{formatDate(s.created_at, true)}</TableCell><TableCell>{s.status}</TableCell><TableCell className="text-right">{formatMoney(Number(s.total_usd), cur, rate)}</TableCell></TableRow>)}</TableBody>
            </Table></div>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Commandes en ligne</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportToXlsx(`commandes_${from}_${to}.xlsx`, orders as unknown as Record<string, unknown>[])}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                <Button size="sm" variant="outline" onClick={() => downloadTablePdf({ title: "Commandes en ligne", subtitle: `${from} → ${to}`, columns: ["Code", "Date", "Statut", "Total"], rows: orders.map((o) => [o.code, formatDate(o.created_at, true), o.status, formatMoney(Number(o.total_usd), cur, rate)]), filename: `commandes_${from}_${to}.pdf` })}><Download className="mr-2 h-4 w-4" />PDF</Button>
              </div>
            </div>
            <div className="overflow-x-auto"><Table className="min-w-[600px]"><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{orders.map((o) => <TableRow key={o.code}><TableCell className="font-mono text-xs">{o.code}</TableCell><TableCell>{formatDate(o.created_at, true)}</TableCell><TableCell>{o.status}</TableCell><TableCell className="text-right">{formatMoney(Number(o.total_usd), cur, rate)}</TableCell></TableRow>)}</TableBody>
            </Table></div>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Dépenses</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportToXlsx(`depenses_${from}_${to}.xlsx`, exp as unknown as Record<string, unknown>[])}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                <Button size="sm" variant="outline" onClick={() => downloadTablePdf({ title: "Dépenses", subtitle: `${from} → ${to}`, columns: ["Date", "Note", "Montant USD"], rows: (exp as Array<{ spent_at: string; note?: string; amount_usd: number }>).map((e) => [e.spent_at, e.note ?? "—", formatMoney(Number(e.amount_usd), cur, rate)]), filename: `depenses_${from}_${to}.pdf` })}><Download className="mr-2 h-4 w-4" />PDF</Button>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="caisse" className="mt-4"><CashSessionsSection /></TabsContent>

        <TabsContent value="recouvrer" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Crédit à recouvrer</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadTablePdf({ title: "Crédit à recouvrer", columns: ["Code", "Client", "Échéance", "Total", "Crédit"], rows: creditARecouvrerRows.map((s) => [s.code, (s.customers as { name?: string } | null)?.name ?? "—", s.due_date ?? "—", formatMoney(Number(s.total_usd), cur, rate), formatMoney(Number(s.credit_usd), cur, rate)]), footer: [`Total : ${formatMoney(creditARecouvrer, cur, rate)}`], filename: "credit_a_recouvrer.pdf", orientation: "l" })}><Download className="mr-2 h-4 w-4" />PDF</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><Table className="min-w-[600px]"><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Client</TableHead><TableHead>Échéance</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Crédit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!creditARecouvrerRows.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun crédit ouvert.</TableCell></TableRow>}
                  {creditARecouvrerRows.map((s) => (
                    <TableRow key={s.code}>
                      <TableCell className="font-mono text-xs">{s.code}</TableCell>
                      <TableCell>{(s.customers as { name?: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell>{s.due_date ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatMoney(Number(s.total_usd), cur, rate)}</TableCell>
                      <TableCell className="text-right font-semibold text-warning-foreground">{formatMoney(Number(s.credit_usd), cur, rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payer" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Crédit à payer</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadTablePdf({ title: "Crédit à payer", columns: ["Type", "Référence", "Bénéficiaire", "Date", "Montant"], rows: creditAPayerRows.map((r) => [r.type, r.ref, r.party, formatDate(r.date), formatMoney(r.amount, cur, rate)]), footer: [`Total : ${formatMoney(creditAPayerTotal, cur, rate)}`], filename: "credit_a_payer.pdf", orientation: "l" })}><Download className="mr-2 h-4 w-4" />PDF</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><Table className="min-w-[600px]"><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Référence</TableHead><TableHead>Bénéficiaire</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!creditAPayerRows.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune dette à payer.</TableCell></TableRow>}
                  {creditAPayerRows.map((r, i) => (
                    <TableRow key={`${r.type}-${r.ref}-${i}`}>
                      <TableCell>{r.type}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                      <TableCell>{r.party}</TableCell>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(r.amount, cur, rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
