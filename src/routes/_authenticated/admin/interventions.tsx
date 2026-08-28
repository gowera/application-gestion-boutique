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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { offlineQueryFn } from "@/lib/offline/query";

export const Route = createFileRoute("/_authenticated/admin/interventions")({ component: Page });

const STATUS = ["pending", "planned", "in_progress", "completed", "cancelled"] as const;

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ customer_name: "", customer_phone: "", customer_address: "", service_type: "Installation électrique", description: "" });
  const { data } = useQuery({ queryKey: ["interventions"], queryFn: offlineQueryFn("query:interventions", async () => (await supabase.from("interventions").select("*").order("created_at", { ascending: false })).data ?? [], "table:interventions") });
  const save = useMutation({
    mutationFn: async () => {
      const { data: code } = await supabase.rpc("next_intervention_code");
      const { error } = await supabase.from("interventions").insert({ ...f, code: code as unknown as string });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Intervention créée"); qc.invalidateQueries({ queryKey: ["interventions"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("interventions").update({ status: status as "pending" }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interventions"] }); },
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Interventions & SAV</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Client</TableHead><TableHead>Service</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune intervention.</TableCell></TableRow>}
            {data?.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.code}</TableCell>
                <TableCell>{i.customer_name}<div className="text-xs text-muted-foreground">{i.customer_phone}</div></TableCell>
                <TableCell>{i.service_type}</TableCell>
                <TableCell>{formatDate(i.created_at)}</TableCell>
                <TableCell>
                  <Select value={i.status} onValueChange={(v) => upd.mutate({ id: i.id, status: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouvelle intervention</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Client *</Label><Input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} /></div><div><Label>Adresse</Label><Input value={f.customer_address} onChange={(e) => setF({ ...f, customer_address: e.target.value })} /></div></div>
          <div><Label>Type de service</Label><Input value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
