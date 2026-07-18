import { createFileRoute } from "@tanstack/react-router";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { downloadPurchasePdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/admin/purchases")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [note, setNote] = useState("");
  const [shippingUsd, setShippingUsd] = useState("0");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [status, setStatus] = useState("draft");
  const [lines, setLines] = useState([{ name: "", qty: "1", cost: "0" }]);
  const { data } = useQuery({ queryKey: ["purchases"], queryFn: async () => (await supabase.from("purchases").select("*, suppliers(name)").order("created_at", { ascending: false })).data ?? [] });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers-list"], queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [] });
  const { data: products = [] } = useQuery({ queryKey: ["products-purchase"], queryFn: async () => (await supabase.from("products").select("id,name,sale_price").order("name")).data ?? [] });
  const createPurchase = useMutation({
    mutationFn: async () => {
      const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.cost || 0), 0);
      const total = subtotal + Number(shippingUsd || 0);
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      const { data: purchase, error: purchaseError } = await supabase.from("purchases").insert({ code, supplier_id: supplierId || null, subtotal_usd: subtotal, total_usd: total, shipping_usd: Number(shippingUsd || 0), note: note || null, expected_delivery_at: expectedDeliveryAt || null, delivered_at: deliveredAt || null, status: status as "draft" | "ordered" | "received" | "cancelled" }).select("id").single();
      if (purchaseError || !purchase) throw purchaseError ?? new Error("Création impossible");
      const items = lines.filter((line) => line.name.trim()).map((line) => ({ purchase_id: purchase.id, product_name: line.name, qty: Number(line.qty || 0), unit_cost_usd: Number(line.cost || 0), line_total_usd: Number(line.qty || 0) * Number(line.cost || 0) }));
      if (items.length) {
        const { error: itemsError } = await supabase.from("purchase_items").insert(items);
        if (itemsError) throw itemsError;
      }
      return purchase.id;
    },
    onSuccess: async (purchaseId) => {
      toast.success("Bon d'achat créé");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      const purchase = (await supabase.from("purchases").select("*, suppliers(name)").eq("id", purchaseId).single()).data;
      if (purchase) {
        downloadPurchasePdf({
          code: purchase.code,
          supplierName: (purchase.suppliers as { name: string } | null)?.name ?? "—",
          note: purchase.note ?? "",
          items: (await supabase.from("purchase_items").select("*").eq("purchase_id", purchaseId)).data ?? [],
          subtotal: purchase.subtotal_usd,
          shipping: purchase.shipping_usd,
          total: purchase.total_usd,
        });
      }
      setOpen(false);
      setSupplierId("");
      setNote("");
      setShippingUsd("0");
      setExpectedDeliveryAt("");
      setDeliveredAt("");
      setStatus("draft");
      setLines([{ name: "", qty: "1", cost: "0" }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recv = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("receive_purchase", { _purchase_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Achat reçu, stock mis à jour"); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl font-bold">Achats fournisseurs</h1>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau bon</Button>
      </div>
      <Card><CardContent className="p-4 text-sm text-muted-foreground">Créez des bons d'achat depuis un formulaire enrichi. Cette liste vous permet de valider la réception (le stock s'incrémente automatiquement).</CardContent></Card>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Fournisseur</TableHead><TableHead>Statut</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun achat enregistré.</TableCell></TableRow>}
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell>{(p.suppliers as { name: string } | null)?.name ?? "—"}</TableCell>
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
              <div><Label>Statut</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Choisir un statut" /></SelectTrigger><SelectContent><SelectItem value="draft">Brouillon</SelectItem><SelectItem value="ordered">Commandé</SelectItem><SelectItem value="received">Reçu</SelectItem><SelectItem value="cancelled">Annulé</SelectItem></SelectContent></Select></div>
              <div><Label>Frais de livraison (USD)</Label><Input type="number" value={shippingUsd} onChange={(e) => setShippingUsd(e.target.value)} placeholder="0.00" /></div>
              <div><Label>Livraison prévue</Label><Input type="datetime-local" value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} /></div>
              <div><Label>Livraison réelle</Label><Input type="datetime-local" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Informations complémentaires sur l'achat..." /></div>
            </div>
            <div className="space-y-2">
              <Label>Lignes</Label>
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[2fr_80px_100px_auto]">
                  <div>
                    <input list="products-datalist" value={line.name} onChange={(e) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Produit existant ou nouveau" />
                    <datalist id="products-datalist">{products.map((product) => <option key={product.id} value={product.name} />)}</datalist>
                  </div>
                  <Input type="number" value={line.qty} onChange={(e) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, qty: e.target.value } : item))} />
                  <Input type="number" value={line.cost} onChange={(e) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, cost: e.target.value } : item))} />
                  <Button variant="outline" onClick={() => setLines(lines.filter((_, itemIndex) => itemIndex !== index))}>Retirer</Button>
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
