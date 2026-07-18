import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, useSettings } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { exportToXlsx } from "@/lib/xlsx-export";
import { downloadReportPdf } from "@/lib/pdf";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Page });

function Page() {
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const { data: sales } = useQuery({ queryKey: ["report-sales", from, to], queryFn: async () => (await supabase.from("sales").select("code, total_usd, status, created_at, channel").gte("created_at", from).lte("created_at", to + "T23:59:59")).data ?? [] });
  const { data: orders } = useQuery({ queryKey: ["report-orders", from, to], queryFn: async () => (await supabase.from("online_orders").select("code, total_usd, status, created_at").gte("created_at", from).lte("created_at", to + "T23:59:59")).data ?? [] });
  const { data: exp } = useQuery({ queryKey: ["report-exp", from, to], queryFn: async () => (await supabase.from("expenses").select("*").gte("created_at", from).lte("created_at", to + "T23:59:59")).data ?? [] });

  const totalSales = (sales ?? []).filter((s) => s.status === "completed").reduce((a, s) => a + Number(s.total_usd), 0);
  const totalOrders = (orders ?? []).reduce((a, o) => a + Number(o.total_usd), 0);
  const totalExp = (exp ?? []).reduce((a, e) => a + Number(e.amount_usd), 0);
  const totalCredit = (sales ?? []).reduce((a, s) => a + Number(s.credit_usd ?? 0), 0);
  const profit = totalSales + totalOrders - totalExp;

  const exportSummaryPdf = () => {
    downloadReportPdf({
      title: "Rapport de période",
      summary: [
        { label: "Période", value: `${from} → ${to}` },
        { label: "Ventes POS", value: formatMoney(totalSales, cur, rate) },
        { label: "Commandes en ligne", value: formatMoney(totalOrders, cur, rate) },
        { label: "Dépenses", value: formatMoney(totalExp, cur, rate) },
        { label: "Solde", value: formatMoney(profit, cur, rate) },
        { label: "Crédit", value: formatMoney(totalCredit, cur, rate) },
      ],
      sections: [
        { title: "Ventes directes (POS)", rows: (sales ?? []).slice(0, 8).map((s) => ({ label: s.code, value: formatMoney(Number(s.total_usd), cur, rate) })) },
        { title: "Commandes en ligne", rows: (orders ?? []).slice(0, 8).map((o) => ({ label: o.code, value: formatMoney(Number(o.total_usd), cur, rate) })) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Rapports</h1>
      <Card><CardContent className="p-4 flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <Button size="sm" variant="outline" onClick={exportSummaryPdf}><Download className="mr-2 h-4 w-4" />PDF</Button>
      </CardContent></Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Ventes POS", val: totalSales },
          { label: "Commandes en ligne", val: totalOrders },
          { label: "Dépenses", val: totalExp },
          { label: "Solde", val: profit },
          { label: "Crédit", val: totalCredit },
        ].map((k) => (
          <Card key={k.label}><CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(k.val, cur, rate)}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Ventes directes (POS)</h3>
          <Button size="sm" variant="outline" onClick={() => exportToXlsx(`ventes_${from}_${to}.xlsx`, (sales ?? []) as unknown as Record<string, unknown>[])}><Download className="mr-2 h-4 w-4" />Excel</Button>
        </div>
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{sales?.map((s) => <TableRow key={s.code}><TableCell className="font-mono text-xs">{s.code}</TableCell><TableCell>{formatDate(s.created_at, true)}</TableCell><TableCell>{s.status}</TableCell><TableCell className="text-right">{formatMoney(Number(s.total_usd), cur, rate)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Commandes en ligne</h3>
          <Button size="sm" variant="outline" onClick={() => exportToXlsx(`commandes_${from}_${to}.xlsx`, (orders ?? []) as unknown as Record<string, unknown>[])}><Download className="mr-2 h-4 w-4" />Excel</Button>
        </div>
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{orders?.map((o) => <TableRow key={o.code}><TableCell className="font-mono text-xs">{o.code}</TableCell><TableCell>{formatDate(o.created_at, true)}</TableCell><TableCell>{o.status}</TableCell><TableCell className="text-right">{formatMoney(Number(o.total_usd), cur, rate)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Dépenses</h3>
          <Button size="sm" variant="outline" onClick={() => exportToXlsx(`depenses_${from}_${to}.xlsx`, (exp ?? []) as unknown as Record<string, unknown>[])}><Download className="mr-2 h-4 w-4" />Excel</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
