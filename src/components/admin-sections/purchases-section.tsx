import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadPurchasePdf } from "@/lib/pdf";
import { downloadTablePdf } from "@/lib/pdf-table";

type PurchaseRow = { id: string; code: string; total_usd: number; status: string; created_at: string; suppliers?: { name?: string } | null };

export function PurchasesSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [note, setNote] = useState("");
  const [shippingUsd, setShippingUsd] = useState("0");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [status, setStatus] = useState("draft");
  const [lines, setLines] = useState([{ name: "", qty: "1", cost: "0" }]);
  const { data = [] } = useQuery<PurchaseRow[]>({ queryKey: ["purchases"], queryFn: async () => (await supabase.from("purchases").select("*, suppliers(name)").order("created_at", { ascending: false })).data as PurchaseRow[] ?? [] });
  const { data: suppliers = [] } = useQuery<Array<{ id: string; name: string }>>({ queryKey: ["suppliers-list"], queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [] });
  const { data: products = [] } = useQuery<Array<{ id: string; name: string }>>({ queryKey: ["products-purchase"], queryFn: async () => (await supabase.from("products").select("id,name").order("name")).data ?? [] });

  const createPurchase = useMutation({
    mutationFn: async () => {
      const subtotal = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.cost || 0), 0);
      const total = subtotal + Number(shippingUsd || 0);
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      const { data: p, error } = await supabase.from("purchases").insert({
        code, supplier_id: supplierId || null, subtotal_usd: subtotal, total_usd: total, shipping_usd: Number(shippingUsd || 0),
        note: note || null, expected_delivery_at: expectedDeliveryAt || null, delivered_at: deliveredAt || null,
        status: status as "draft" | "ordered" | "received" | "cancelled",
      }).select("id").single();
      if (error || !p) throw error ?? new Error("Création impossible");
      const items = lines.filter((l) => l.name.trim()).map((l) => ({ purchase_id: p.id, product_name: l.name, qty: Number(l.qty || 0), unit_cost_usd: Number(l.cost || 0), line_total_usd: Number(l.qty || 0) * Number(l.cost || 0) }));
      if (items.length) { const { error: e2 } = await supabase.from("purchase_items").insert(items); if (e2) throw e2; }
      return p.id;
    },
    onSuccess: async (id) => {
      toast.success("Bon d'achat créé");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      const p = (await supabase.from("purchases").select("*, suppliers(name)").eq("id", id).single()).data;
      if (p) downloadPurchasePdf({
        code: p.code, supplierName: (p.suppliers as { name: string } | null)?.name ?? "—", note: p.note ?? "",
        items: (await supabase.from("purchase_items").select("*").eq("purchase_id", id)).data ?? [],
        subtotal: p.subtotal_usd, shipping: p.shipping_usd, total: p.total_usd,
      });
      setOpen(false); setSupplierId(""); setNote(""); setShippingUsd("0"); setExpectedDeliveryAt(""); setDeliveredAt(""); setStatus("draft"); setLines([{ name: "", qty: "1", cost: "0" }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recv = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("receive_purchase", { _purchase_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Achat réceptionné"); qc.invalidateQueries({ queryKey: ["purchases"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportPdf = () => downloadTablePdf({
    title: "Bons d'achat",
    columns: ["Code", "Fournisseur", "Statut", "Total (USD)", "Date"],
    rows: data.map((p) => [p.code, p.suppliers?.name ?? "—", p.status, Number(p.total_usd).toFixed(2), formatDate(p.created_at)]),
    filename: "achats.pdf",
    orientation: "l",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPdf}><Download className="mr-2 h-4 w-4" />PDF</Button>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau bon</Button>
      </div>
      <Card><CardContent className="p-4 text-sm text-muted-foreground">Créez des bons d'achat et validez leur réception pour incrémenter automatiquement le stock.</CardContent></Card>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Fournisseur</TableHead><TableHead>Statut</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {!data.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun achat enregistré.</TableCell></TableRow>}
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell>{p.suppliers?.name ?? "—"}</TableCell>
                <TableCell><Badge>{p.status}</Badge></TableCell>
                <TableCell>${Number(p.total_usd).toFixed(2)}</TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell>{p.status !== "received" && <Button size="sm" onClick={() => recv.mutate(p.id)}>Réceptionner</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Nouveau bon d'achat</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Fournisseur</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Statut</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Brouillon</SelectItem><SelectItem value="ordered">Commandé</SelectItem><SelectItem value="received">Reçu</SelectItem><SelectItem value="cancelled">Annulé</SelectItem></SelectContent></Select></div>
              <div><Label>Frais de livraison (USD)</Label><Input type="number" value={shippingUsd} onChange={(e) => setShippingUsd(e.target.value)} /></div>
              <div><Label>Livraison prévue</Label><Input type="datetime-local" value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} /></div>
              <div><Label>Livraison réelle</Label><Input type="datetime-local" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Lignes</Label>
              {lines.map((line, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[2fr_80px_100px_auto]">
                  <div>
                    <input list="products-datalist" value={line.name} onChange={(e) => setLines(lines.map((it, ix) => ix === i ? { ...it, name: e.target.value } : it))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Produit existant ou nouveau" />
                    <datalist id="products-datalist">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
                  </div>
                  <Input type="number" value={line.qty} onChange={(e) => setLines(lines.map((it, ix) => ix === i ? { ...it, qty: e.target.value } : it))} />
                  <Input type="number" value={line.cost} onChange={(e) => setLines(lines.map((it, ix) => ix === i ? { ...it, cost: e.target.value } : it))} />
                  <Button variant="outline" onClick={() => setLines(lines.filter((_, ix) => ix !== i))}>Retirer</Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setLines([...lines, { name: "", qty: "1", cost: "0" }])}>Ajouter une ligne</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => createPurchase.mutate()} disabled={createPurchase.isPending}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
