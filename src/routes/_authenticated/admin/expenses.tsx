import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSettings, formatMoney, convertToUsd, type Currency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type ExpenseCategory = { id: string; name: string };
type ExpenseRow = { id: string; amount_usd: number; note?: string | null; spent_at: string; category_id?: string | null; expense_categories?: { name?: string | null } | null };
type RentRow = { id: string; amount_usd: number; period_start: string; period_end: string; paid_at?: string | null; note?: string | null };
type SalaryRow = { id: string; amount_usd: number; period_start: string; period_end: string; paid_at?: string | null; note?: string | null; employees?: { full_name?: string | null } | null };
type PurchaseRow = { id: string; total_usd: number; created_at: string; note?: string | null; suppliers?: { name?: string | null } | null };

type AggregatedExpense = { id: string; date: string; category: string; label: string; amount_usd: number; source: "expense" | "rent" | "salary" | "purchase" };

export const Route = createFileRoute("/_authenticated/admin/expenses")({ component: Page });

function Page() {
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const currency = settings?.primary_currency ?? "USD";
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<{ category_id?: string; amount: number; currency: Currency; method: string; note: string; spent_at: string }>({
    amount: 0, currency: "USD", method: "cash", note: "", spent_at: new Date().toISOString().slice(0, 10),
  });
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["exp-cats"], queryFn: async () => (await supabase.from("expense_categories").select("*").order("name")).data as ExpenseCategory[] ?? [] });
  const { data: rows = [] } = useQuery<ExpenseRow[]>({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*, expense_categories(name)").order("spent_at", { ascending: false }).limit(200)).data as ExpenseRow[] ?? [],
  });
  const { data: rentRows = [] } = useQuery<RentRow[]>({ queryKey: ["rent-expenses"], queryFn: async () => (await supabase.from("rent_payments").select("*").order("period_start", { ascending: false })).data as RentRow[] ?? [] });
  const { data: salaryRows = [] } = useQuery<SalaryRow[]>({ queryKey: ["salary-expenses"], queryFn: async () => (await supabase.from("salary_payments").select("*, employees(full_name)").order("paid_at", { ascending: false })).data as SalaryRow[] ?? [] });
  const { data: purchaseRows = [] } = useQuery<PurchaseRow[]>({ queryKey: ["purchase-expenses"], queryFn: async () => (await supabase.from("purchases").select("*, suppliers(name)").order("created_at", { ascending: false })).data as PurchaseRow[] ?? [] });
  const { data: sales = [] } = useQuery<Array<{ total_usd: number; status: string }>>({ queryKey: ["report-sales-short"], queryFn: async () => (await supabase.from("sales").select("total_usd,status")).data as Array<{ total_usd: number; status: string }> ?? [] });
  const { data: orders = [] } = useQuery<Array<{ total_usd: number; status: string }>>({ queryKey: ["report-orders-short"], queryFn: async () => (await supabase.from("online_orders").select("total_usd,status")).data as Array<{ total_usd: number; status: string }> ?? [] });

  const aggregatedRows = useMemo<AggregatedExpense[]>(() => {
    const manual = (rows ?? []).map((row) => ({
      id: row.id,
      date: row.spent_at,
      category: row.expense_categories?.name ?? "Dépense",
      label: row.note ?? "Dépense manuelle",
      amount_usd: Number(row.amount_usd ?? 0),
      source: "expense" as const,
    }));
    const rents = (rentRows ?? []).map((row) => ({
      id: row.id,
      date: row.paid_at ?? row.period_end ?? row.period_start,
      category: "Loyer",
      label: row.note ? `Loyer · ${row.note}` : "Loyer",
      amount_usd: Number(row.amount_usd ?? 0),
      source: "rent" as const,
    }));
    const salaries = (salaryRows ?? []).map((row) => ({
      id: row.id,
      date: row.paid_at ?? row.period_end ?? row.period_start,
      category: "Salaires",
      label: row.employees?.full_name ? `Salaire · ${row.employees.full_name}` : "Salaire",
      amount_usd: Number(row.amount_usd ?? 0),
      source: "salary" as const,
    }));
    const purchases = (purchaseRows ?? []).map((row) => ({
      id: row.id,
      date: row.created_at,
      category: "Achats",
      label: row.suppliers?.name ? `Achat · ${row.suppliers.name}` : "Achat fournisseur",
      amount_usd: Number(row.total_usd ?? 0),
      source: "purchase" as const,
    }));
    return [...manual, ...rents, ...salaries, ...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rows, rentRows, salaryRows, purchaseRows]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>(["all"]);
    aggregatedRows.forEach((row) => values.add(row.category));
    return Array.from(values);
  }, [aggregatedRows]);

  const filteredRows = useMemo(() => aggregatedRows.filter((row) => {
    const afterFrom = !from || new Date(row.date) >= new Date(from);
    const beforeTo = !to || new Date(row.date) <= new Date(`${to}T23:59:59`);
    const categoryMatch = categoryFilter === "all" || row.category === categoryFilter;
    return afterFrom && beforeTo && categoryMatch;
  }), [aggregatedRows, categoryFilter, from, to]);

  const totalExpenses = filteredRows.reduce((sum, row) => sum + row.amount_usd, 0);
  const totalRevenue = [...(sales ?? []), ...(orders ?? [])].filter((entry) => entry.status === "completed" || entry.status === "confirmed").reduce((sum, entry) => sum + Number(entry.total_usd ?? 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (form.amount <= 0) throw new Error("Montant invalide");
      const amount_usd = convertToUsd(form.amount, form.currency, rate);
      const { error } = await supabase.from("expenses").insert({
        category_id: form.category_id ?? null, amount: form.amount, currency: form.currency,
        amount_usd, method: form.method as "cash", note: form.note || null, spent_at: form.spent_at,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dépense enregistrée"); setOpen(false); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["rent-expenses"] }); qc.invalidateQueries({ queryKey: ["salary-expenses"] }); qc.invalidateQueries({ queryKey: ["purchase-expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl font-bold">Dépenses</h1>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle dépense</Button>
      </div>

      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Catégorie</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => <SelectItem key={option} value={option}>{option === "all" ? "Tous" : option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Dépenses</div><div className="mt-2 text-xl font-bold">{formatMoney(totalExpenses, currency, rate)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">CA</div><div className="mt-2 text-xl font-bold">{formatMoney(totalRevenue, currency, rate)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Écart</div><div className="mt-2 text-xl font-bold">{formatMoney(totalRevenue - totalExpenses, currency, rate)}</div></CardContent></Card>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Catégorie</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
        <TableBody>
          {!filteredRows.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune dépense pour cette période.</TableCell></TableRow>}
          {filteredRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>{row.source === "expense" ? "Dépense" : row.source === "rent" ? "Loyer" : row.source === "salary" ? "Salaire" : "Achat"}</TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.label}</TableCell>
              <TableCell className="text-right">{formatMoney(row.amount_usd, currency, rate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Catégorie</Label>
              <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Montant</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div><Label>Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CDF">CDF</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Moyen</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} /></div>
            </div>
            <div><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
