import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/_authenticated/admin/expenses")({ component: Page });

function Page() {
  const { data: settings } = useSettings();
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const currency = settings?.primary_currency ?? "USD";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ category_id?: string; amount: number; currency: Currency; method: string; note: string; spent_at: string }>({
    amount: 0, currency: "USD", method: "cash", note: "", spent_at: new Date().toISOString().slice(0, 10),
  });
  const qc = useQueryClient();

  const { data: cats } = useQuery({ queryKey: ["exp-cats"], queryFn: async () => (await supabase.from("expense_categories").select("*").order("name")).data ?? [] });
  const { data: rows } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*, expense_categories(name)").order("spent_at", { ascending: false }).limit(200)).data ?? [],
  });

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
    onSuccess: () => { toast.success("Dépense enregistrée"); setOpen(false); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-display text-2xl font-bold">Dépenses</h1>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle dépense</Button>
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Catégorie</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDate(r.spent_at)}</TableCell>
              <TableCell>{(r as { expense_categories?: { name?: string } }).expense_categories?.name ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.note ?? "—"}</TableCell>
              <TableCell className="text-right">{formatMoney(Number(r.amount_usd), currency, rate)}</TableCell>
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
