import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSettings, formatMoney } from "@/lib/currency";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersPage,
});

type Customer = { id: string; name: string; phone: string | null; email: string | null; address: string | null; credit_limit: number; balance: number; notes: string | null };

function CustomersPage() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [open, setOpen] = useState(false);
  const [pay, setPay] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  const qc = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => ((await supabase.from("customers").select("*").eq("is_archived", false).order("name")).data ?? []) as Customer[],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error("Nom requis");
      const { error } = await supabase.from("customers").insert({
        name: form.name, phone: form.phone || null, email: form.email || null,
        address: form.address || null, credit_limit: Number(form.credit_limit ?? 0), notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Client ajouté"); qc.invalidateQueries({ queryKey: ["customers"] }); setOpen(false); setForm({}); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [amount, setAmount] = useState(0);
  const payMut = useMutation({
    mutationFn: async () => {
      if (!pay || amount <= 0) throw new Error("Montant invalide");
      const { error } = await supabase.rpc("record_customer_payment", { _customer_id: pay.id, _amount: amount, _note: "remboursement" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paiement enregistré"); qc.invalidateQueries({ queryKey: ["customers"] }); setPay(null); setAmount(0); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div><h1 className="text-display text-2xl font-bold">Clients & crédits</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead className="text-right">Solde dû</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {customers?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell className={`text-right ${Number(c.balance) > 0 ? "text-destructive font-semibold" : ""}`}>{formatMoney(Number(c.balance), currency, rate)}</TableCell>
              <TableCell>{Number(c.balance) > 0 && <Button size="sm" variant="outline" onClick={() => setPay(c)}><Wallet className="mr-1 h-3 w-3" />Encaisser</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Limite de crédit (USD)</Label><Input type="number" value={form.credit_limit ?? 0} onChange={(e) => setForm({ ...form, credit_limit: +e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pay} onOpenChange={(v) => !v && setPay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Encaisser — {pay?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Solde actuel: <span className="font-semibold text-foreground">{pay && formatMoney(Number(pay.balance), currency, rate)}</span></p>
            <div><Label>Montant reçu (USD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPay(null)}>Annuler</Button><Button onClick={() => payMut.mutate()}>Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
