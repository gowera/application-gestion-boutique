import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [] });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("suppliers").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Fournisseur ajouté"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setOpen(false); setF({ name: "", phone: "", email: "", address: "", notes: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Fournisseurs</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead>Email</TableHead><TableHead>Solde</TableHead></TableRow></TableHeader>
          <TableBody>{!data?.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun fournisseur.</TableCell></TableRow>}
            {data?.map((s) => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.phone ?? "—"}</TableCell><TableCell>{s.email ?? "—"}</TableCell><TableCell>${Number(s.balance_usd).toFixed(2)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div>
          <div><Label>Adresse</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
