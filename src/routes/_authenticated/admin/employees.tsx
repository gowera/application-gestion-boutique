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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/employees")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", phone: "", email: "", position: "", monthly_salary_usd: 0 });
  const { data } = useQuery({ queryKey: ["employees"], queryFn: async () => (await supabase.from("employees").select("*").order("full_name")).data ?? [] });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("employees").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Employé ajouté"); qc.invalidateQueries({ queryKey: ["employees"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Employés</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Fonction</TableHead><TableHead>Téléphone</TableHead><TableHead>Salaire</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun employé.</TableCell></TableRow>}
            {data?.map((e) => (<TableRow key={e.id}><TableCell className="font-medium">{e.full_name}</TableCell><TableCell>{e.position ?? "—"}</TableCell><TableCell>{e.phone ?? "—"}</TableCell><TableCell>${Number(e.monthly_salary_usd).toFixed(2)}</TableCell><TableCell>{e.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell></TableRow>))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom complet *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div>
          <div><Label>Fonction</Label><Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></div>
          <div><Label>Salaire mensuel (USD)</Label><Input type="number" step="0.01" value={f.monthly_salary_usd} onChange={(e) => setF({ ...f, monthly_salary_usd: +e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
