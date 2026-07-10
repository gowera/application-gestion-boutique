import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/salaries")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ employee_id: "", period_start: "", period_end: "", amount_usd: 0, advance: false, note: "" });
  const { data: emps } = useQuery({ queryKey: ["employees"], queryFn: async () => (await supabase.from("employees").select("id, full_name").order("full_name")).data ?? [] });
  const { data } = useQuery({ queryKey: ["salaries"], queryFn: async () => (await supabase.from("salary_payments").select("*, employees(full_name)").order("paid_at", { ascending: false })).data ?? [] });
  const save = useMutation({
    mutationFn: async () => { if (!f.employee_id) throw new Error("Employé requis"); const { error } = await supabase.from("salary_payments").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Paiement enregistré"); qc.invalidateQueries({ queryKey: ["salaries"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Salaires</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau paiement</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Employé</TableHead><TableHead>Période</TableHead><TableHead>Montant</TableHead><TableHead>Type</TableHead><TableHead>Payé le</TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun paiement.</TableCell></TableRow>}
            {data?.map((s) => <TableRow key={s.id}><TableCell>{(s.employees as { full_name: string } | null)?.full_name ?? "—"}</TableCell><TableCell>{formatDate(s.period_start)} → {formatDate(s.period_end)}</TableCell><TableCell>${Number(s.amount_usd).toFixed(2)}</TableCell><TableCell>{s.advance ? "Avance" : "Salaire"}</TableCell><TableCell>{formatDate(s.paid_at, true)}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouveau paiement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Employé *</Label>
            <Select value={f.employee_id} onValueChange={(v) => setF({ ...f, employee_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>{emps?.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Début</Label><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div><div><Label>Fin</Label><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div></div>
          <div><Label>Montant (USD)</Label><Input type="number" step="0.01" value={f.amount_usd} onChange={(e) => setF({ ...f, amount_usd: +e.target.value })} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={f.advance} onChange={(e) => setF({ ...f, advance: e.target.checked })} /> <Label>Avance sur salaire</Label></div>
          <div><Label>Note</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
