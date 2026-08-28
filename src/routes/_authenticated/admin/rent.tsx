import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { offlineQueryFn } from "@/lib/offline/query";

export const Route = createFileRoute("/_authenticated/admin/rent")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ period_start: "", period_end: "", amount_usd: 0, note: "" });
  const { data } = useQuery({ queryKey: ["rent"], queryFn: offlineQueryFn("query:rent", async () => (await supabase.from("rent_payments").select("*").order("period_start", { ascending: false })).data ?? [], "table:rent_payments") });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("rent_payments").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Loyer enregistré"); qc.invalidateQueries({ queryKey: ["rent"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const pay = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("rent_payments").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Marqué payé"); qc.invalidateQueries({ queryKey: ["rent"] }); },
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Loyer</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle échéance</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Période</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead>Payé le</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune échéance.</TableCell></TableRow>}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.period_start)} → {formatDate(r.period_end)}</TableCell>
                <TableCell>${Number(r.amount_usd).toFixed(2)}</TableCell>
                <TableCell>{r.paid ? <Badge>Payé</Badge> : <Badge variant="destructive">Dû</Badge>}</TableCell>
                <TableCell>{r.paid_at ? formatDate(r.paid_at, true) : "—"}</TableCell>
                <TableCell>{!r.paid && <Button size="sm" onClick={() => pay.mutate(r.id)}><Check className="mr-1 h-3 w-3" />Marquer payé</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouvelle échéance</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Début</Label><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div><div><Label>Fin</Label><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div></div>
          <div><Label>Montant (USD)</Label><Input type="number" step="0.01" value={f.amount_usd} onChange={(e) => setF({ ...f, amount_usd: +e.target.value })} /></div>
          <div><Label>Note</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
