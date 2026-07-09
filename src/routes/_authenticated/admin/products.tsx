import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney, useSettings } from "@/lib/currency";
import { Plus, Pencil, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string; sku: string | null; name: string; category_id: string | null; brand: string | null;
  description: string | null; cost_price: number; sale_price: number; stock: number;
  low_stock_threshold: number | null; status: "active" | "inactive" | "on_order"; images: string[];
};

function ProductsPage() {
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const qc = useQueryClient();

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", q],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl md:text-3xl font-bold">Produits & stock</h1>
          <p className="text-sm text-muted-foreground">Gérez votre catalogue et vos niveaux de stock.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8 w-64" />
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nouveau produit</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && products?.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Aucun produit. Ajoutez-en un.</TableCell></TableRow>
              )}
              {products?.map((p) => {
                const low = p.stock <= (p.low_stock_threshold ?? settings?.low_stock_threshold ?? 5);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.brand}</div></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cats?.find((c) => c.id === p.category_id)?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(p.sale_price), settings?.primary_currency ?? "USD", settings?.usd_to_cdf_rate ?? 2800)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-1 ${low ? "text-warning-foreground" : ""}`}>
                        {low && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setAdjust(p)}>Stock</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDialog open={open} onOpenChange={setOpen} product={editing} categories={cats ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })} />
      <StockAdjustDialog product={adjust} onOpenChange={(v) => !v && setAdjust(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })} />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product, categories, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; product: Product | null;
  categories: { id: string; name: string }[]; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({});
  const isEdit = !!product;

  // reset when opening
  useState(() => { setForm(product ?? {}); });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name ?? "",
        sku: form.sku || null,
        category_id: form.category_id || null,
        brand: form.brand || null,
        description: form.description || null,
        cost_price: Number(form.cost_price ?? 0),
        sale_price: Number(form.sale_price ?? 0),
        stock: Number(form.stock ?? 0),
        low_stock_threshold: form.low_stock_threshold != null ? Number(form.low_stock_threshold) : null,
        status: (form.status as Product["status"]) ?? "active",
      };
      if (!payload.name.trim()) throw new Error("Nom requis");
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", product!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Enregistré"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setForm(product ?? {}); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Nom *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>SKU / Référence</Label><Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><Label>Marque</Label><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Sans catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans catégorie</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v as Product["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="on_order">Sur commande</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Prix d'achat (USD)</Label><Input type="number" step="0.01" value={form.cost_price ?? 0} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} /></div>
          <div><Label>Prix de vente (USD)</Label><Input type="number" step="0.01" value={form.sale_price ?? 0} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} /></div>
          <div><Label>Stock initial</Label><Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: +e.target.value })} disabled={isEdit} />{isEdit && <p className="mt-1 text-xs text-muted-foreground">Utilisez « Stock » pour ajuster.</p>}</div>
          <div><Label>Seuil d'alerte</Label><Input type="number" value={form.low_stock_threshold ?? ""} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value === "" ? null : +e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockAdjustDialog({ product, onOpenChange, onSaved }: { product: Product | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<"manual_in" | "manual_out" | "correction" | "return">("manual_in");
  const [note, setNote] = useState("");

  const run = useMutation({
    mutationFn: async () => {
      if (!product || !delta) throw new Error("Quantité requise");
      const signed = reason === "manual_out" ? -Math.abs(delta) : reason === "manual_in" || reason === "return" ? Math.abs(delta) : delta;
      const { error } = await supabase.rpc("adjust_stock", { _product_id: product.id, _delta: signed, _reason: reason, _note: note || undefined });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stock mis à jour"); onSaved(); onOpenChange(false); setDelta(0); setNote(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajuster le stock — {product?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type d'opération</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_in">Entrée manuelle (+)</SelectItem>
                <SelectItem value="manual_out">Sortie manuelle (−)</SelectItem>
                <SelectItem value="return">Retour client (+)</SelectItem>
                <SelectItem value="correction">Correction (signé)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quantité {reason === "correction" && "(peut être négative)"}</Label><Input type="number" value={delta} onChange={(e) => setDelta(+e.target.value)} /></div>
          <div><Label>Motif / note</Label><Textarea rows={2} value={note ?? ""} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
