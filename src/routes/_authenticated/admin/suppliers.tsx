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
import { Mail, Phone, MessageCircleMore, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadSupplierPurchasesReportPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [] });

  const exportSupplierReport = async (supplier: { id: string; name: string }) => {
    const { data: purchases } = await supabase.from("purchases").select("code,created_at,status,total_usd").eq("supplier_id", supplier.id).order("created_at", { ascending: false });
    const rows = (purchases ?? []).map((p) => ({ code: p.code, created_at: p.created_at, status: p.status, total_usd: Number(p.total_usd) }));
    if (!rows.length) {
      toast.info("Aucun achat à exporter pour ce fournisseur.");
      return;
    }
    downloadSupplierPurchasesReportPdf({
      supplierName: supplier.name,
      from: rows[rows.length - 1].created_at.slice(0, 10),
      to: rows[0].created_at.slice(0, 10),
      purchases: rows,
      total: rows.reduce((sum, item) => sum + item.total_usd, 0),
    });
  };
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("suppliers").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Fournisseur ajouté"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setOpen(false); setF({ name: "", phone: "", email: "", address: "", notes: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Fournisseurs</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Contact</TableHead><TableHead>Solde</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{!data?.length && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun fournisseur.</TableCell></TableRow>}
            {data?.map((s) => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell><div className="flex flex-wrap gap-2">{s.phone && <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-sm text-primary"><Phone className="h-3.5 w-3.5" />{s.phone}</a>}{s.email && <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-sm text-primary"><Mail className="h-3.5 w-3.5" />{s.email}</a>}{s.phone && <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary"><MessageCircleMore className="h-3.5 w-3.5" />WhatsApp</a>}</div></TableCell><TableCell>${Number(s.balance_usd).toFixed(2)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => exportSupplierReport(s)}><Download className="mr-2 h-3.5 w-3.5" />Rapport</Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nom du fournisseur" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+243 99 000 0000" /></div><div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="contact@fournisseur.com" /></div></div>
          <div><Label>Adresse</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Adresse complète" /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Informations complémentaires..." /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
