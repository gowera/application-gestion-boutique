import { shopStoragePath } from "@/lib/shop-storage";
import { createFileRoute } from "@tanstack/react-router";
import { isOffline, queueOperation } from "@/lib/offline/sync";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { useEffect, useState } from "react";
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
import { createNotification } from "@/lib/notifications";
import { StorageImage } from "@/components/storage-image";
import { offlineQueryFn } from "@/lib/offline/query";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string; sku: string | null; name: string; category_id: string | null; brand: string | null;
  description: string | null; cost_price: number; sale_price: number; stock: number;
  low_stock_threshold: number | null; status: "active" | "inactive" | "on_order"; images: string[];
  slug: string | null; show_stock_public: boolean | null;
};

type Supplier = { id: string; name: string };

type ProductSupplier = { supplier_id: string; preferred: boolean };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ProductsPage() {
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const qc = useQueryClient();

  const replenishment = useMutation({
    mutationFn: async (product: Product) => {
      const { data: links = [] } = await supabase.from("product_suppliers").select("supplier_id").eq("product_id", product.id).order("preferred", { ascending: false });
      const supplierId = (links as { supplier_id: string }[])[0]?.supplier_id ?? null;
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      const subtotal = Number(product.cost_price || 0) * 1;
      const total = subtotal;
      const { data: purchase, error: purchaseError } = await supabase.from("purchases").insert({ code, supplier_id: supplierId, subtotal_usd: subtotal, total_usd: total, shipping_usd: 0, note: `Ravitaillement automatique pour ${product.name}`, status: "draft" }).select("id").single();
      if (purchaseError || !purchase) throw purchaseError ?? new Error("Création impossible");
      const { error: itemError } = await supabase.from("purchase_items").insert({ purchase_id: purchase.id, product_name: product.name, qty: 1, unit_cost_usd: Number(product.cost_price || 0), line_total_usd: subtotal });
      if (itemError) throw itemError;
      return purchase.id;
    },
    onSuccess: () => { toast.success("Bon d'achat créé"); qc.invalidateQueries({ queryKey: ["purchases"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: offlineQueryFn("query:categories", async () => (await supabase.from("categories").select("*").order("name")).data ?? [], "table:categories"),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: offlineQueryFn("query:suppliers-list", async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [], "table:suppliers"),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: offlineQueryFn("query:products", async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    }, "table:products"),
  });
  const visibleProducts = (products ?? []).filter((product) => !q || product.name.toLowerCase().includes(q.toLowerCase()) || (product.sku ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <OfflineBanner scope="stock" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl md:text-3xl font-bold">Produits & stock</h1>
          <p className="text-sm text-muted-foreground">Gérez votre catalogue et vos niveaux de stock.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8 w-full sm:w-64" />
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nouveau produit</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && visibleProducts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Aucun produit. Ajoutez-en un.</TableCell></TableRow>
              )}
              {visibleProducts.map((p) => {
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
                        <Button size="sm" variant="secondary" onClick={() => replenishment.mutate(p)}>Ravitailler</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDialog open={open} onOpenChange={setOpen} product={editing} categories={cats ?? []} suppliers={suppliers} onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })} />
      <StockAdjustDialog product={adjust} onOpenChange={(v) => !v && setAdjust(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })} />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product, categories, suppliers, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; product: Product | null;
  categories: { id: string; name: string }[]; suppliers: Supplier[]; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({});
  const [imageInput, setImageInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [preferredSupplier, setPreferredSupplier] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const isEdit = !!product;
  const qc = useQueryClient();
  const { data: settings } = useSettings();

  useEffect(() => {
    if (open) {
      setForm(product ?? {});
      setImageInput((product?.images ?? []).join("\n"));
      setImageFiles([]);
      setSlugManuallyEdited(false);
      if (product?.id) {
        supabase.from("product_suppliers").select("supplier_id,preferred").eq("product_id", product.id).then(({ data }) => {
          const ids = (data ?? []).map((row: ProductSupplier) => row.supplier_id);
          setSelectedSuppliers(ids);
          setPreferredSupplier((data ?? []).find((row: ProductSupplier) => row.preferred)?.supplier_id ?? null);
        });
      } else {
        setSelectedSuppliers([]);
        setPreferredSupplier(null);
      }
    }
  }, [open, product]);

  const save = useMutation({
    mutationFn: async () => {
      setUploadingImages(true);
      const uploadedUrls = await Promise.all(imageFiles.map(async (file) => {
        const path = await shopStoragePath(`${crypto.randomUUID()}-${file.name}`);
        const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }));
      const payload = {
        name: form.name ?? "",
        sku: form.sku || null,
        slug: (form.slug || form.name || "").toString().trim() || null,
        category_id: form.category_id || null,
        brand: form.brand || null,
        description: form.description || null,
        cost_price: Number(form.cost_price ?? 0),
        sale_price: Number(form.sale_price ?? 0),
        stock: Number(form.stock ?? 0),
        low_stock_threshold: form.low_stock_threshold != null ? Number(form.low_stock_threshold) : null,
        status: (form.status as Product["status"]) ?? "active",
        images: [...uploadedUrls, ...imageInput.split(/\n|,/).map((v) => v.trim()).filter(Boolean)],
        show_stock_public: Boolean(form.show_stock_public),
      };
      if (!payload.name.trim()) throw new Error("Nom requis");
      let productId = product?.id;
      const previousStock = product?.stock ?? null;
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", product!.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data?.id;
      }

      if (productId) {
        await supabase.from("product_suppliers").delete().eq("product_id", productId);
        if (selectedSuppliers.length) {
          const rows = selectedSuppliers.map((supplierId) => ({ product_id: productId, supplier_id: supplierId, preferred: supplierId === preferredSupplier }));
          const { error: relErr } = await supabase.from("product_suppliers").insert(rows);
          if (relErr) throw relErr;
        }
      }
      return { productId, previousStock, nextStock: payload.stock };
    },
    onSuccess: async ({ productId, previousStock, nextStock }) => {
      if (productId) {
        const threshold = Number(form.low_stock_threshold ?? settings?.low_stock_threshold ?? 5);
        const shouldAlert = nextStock <= threshold && (previousStock == null || previousStock > threshold || previousStock > nextStock);
        if (shouldAlert) {
          await createNotification({
            title: nextStock <= 0 ? "Rupture de stock" : "Stock faible",
            message: `${form.name ?? "Produit"} est à ${nextStock} unité${nextStock > 1 ? "s" : ""}.`,
            type: "warning",
            entity_type: "product",
            entity_id: productId,
          });
        }
      }
      toast.success("Enregistré"); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["suppliers-list"] }); onSaved(); onOpenChange(false); setUploadingImages(false);
    },
    onError: (e: Error) => { toast.error(e.message); setUploadingImages(false); },
  });

  const createCategoryInline = useMutation({
    mutationFn: async () => {
      if (!newCategoryName.trim()) throw new Error("Nom requis");
      const { data, error } = await supabase.from("categories").insert({ name: newCategoryName.trim(), slug: newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }).select("id").single();
      if (error || !data) throw error ?? new Error("Catégorie non créée");
      return data.id;
    },
    onSuccess: (categoryId) => {
      setForm({ ...form, category_id: categoryId });
      setNewCategoryName("");
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie créée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setForm(product ?? {}); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{isEdit ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Nom *</Label><Input value={form.name ?? ""} onChange={(e) => {
            const nextName = e.target.value;
            setForm((prev) => ({ ...prev, name: nextName, slug: slugManuallyEdited ? prev.slug : slugify(nextName) }));
          }} placeholder="Ex : Disjoncteur 20A" /></div>
          <div><Label>Slug</Label><Input value={form.slug ?? ""} onChange={(e) => { setSlugManuallyEdited(true); setForm((prev) => ({ ...prev, slug: e.target.value })); }} placeholder="slug-automatique" /></div>
          <div><Label>Modèle / Référence</Label><Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex : XR-2400" /></div>
          <div><Label>Marque</Label><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Ex : Schneider" /></div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Sans catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans catégorie</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="mt-2 flex gap-2">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ajouter une catégorie" />
              <Button type="button" variant="outline" onClick={() => createCategoryInline.mutate()} disabled={createCategoryInline.isPending}>Créer</Button>
            </div>
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
          <div><Label>Prix d'achat (USD)</Label><Input type="number" step="0.01" value={form.cost_price ?? 0} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} placeholder="0.00" /></div>
          <div><Label>Prix de vente (USD)</Label><Input type="number" step="0.01" value={form.sale_price ?? 0} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} placeholder="0.00" /></div>
          <div><Label>Stock initial</Label><Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: +e.target.value })} disabled={isEdit} placeholder="0" />{isEdit && <p className="mt-1 text-xs text-muted-foreground">Utilisez « Stock » pour ajuster.</p>}</div>
          <div><Label>Seuil d'alerte</Label><Input type="number" value={form.low_stock_threshold ?? ""} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value === "" ? null : +e.target.value })} placeholder="5" /></div>
          <div className="md:col-span-2">
            <Label>Images du produit</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoutez autant d’images que vous voulez : sélectionnez plusieurs fichiers (ils s’ajoutent aux précédents) et/ou collez des URL, une par ligne. La première image sert d’image principale.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-2 block w-full text-sm"
              title="Choisir des fichiers"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length) setImageFiles((prev) => [...prev, ...picked]);
                e.target.value = "";
              }}
            />
            {imageFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {imageFiles.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                    <img src={URL.createObjectURL(f)} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <Textarea rows={3} value={imageInput} onChange={(e) => setImageInput(e.target.value)} className="mt-2" placeholder="https://exemple.com/image1.jpg&#10;https://exemple.com/image2.jpg" />
            {(() => {
              const urls = imageInput.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
              if (!urls.length) return null;
              return (
                <div className="mt-2 flex flex-wrap gap-2">
                  {urls.map((u, i) => (
                    <span key={`${u}-${i}`} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                      <StorageImage src={u} alt="" className="h-8 w-8 rounded object-cover" />
                      <span className="max-w-[160px] truncate">{u}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setImageInput(urls.filter((_, idx) => idx !== i).join("\n"))}
                      >×</button>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="md:col-span-2 rounded-lg border p-3">
            <Label className="mb-2 block">Fournisseurs associés</Label>
            <div className="flex flex-wrap gap-2">
              {suppliers.map((supplier) => {
                const checked = selectedSuppliers.includes(supplier.id);
                return (
                  <label key={supplier.id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                    <input type="checkbox" checked={checked} onChange={() => {
                      const next = checked ? selectedSuppliers.filter((id) => id !== supplier.id) : [...selectedSuppliers, supplier.id];
                      setSelectedSuppliers(next);
                      if (!checked && preferredSupplier === supplier.id) setPreferredSupplier(null);
                      if (checked && preferredSupplier === supplier.id) setPreferredSupplier(null);
                    }} />
                    <span>{supplier.name}</span>
                  </label>
                );
              })}
            </div>
            {selectedSuppliers.length > 0 && (
              <div className="mt-3">
                <Label>Fournisseur principal</Label>
                <Select value={preferredSupplier ?? "none"} onValueChange={(value) => setPreferredSupplier(value === "none" ? null : value)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {selectedSuppliers.map((id) => {
                      const s = suppliers.find((item) => item.id === id);
                      return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border p-3">
            <input type="checkbox" checked={Boolean(form.show_stock_public)} onChange={(e) => setForm({ ...form, show_stock_public: e.target.checked })} />
            <Label>Afficher le stock sur la boutique en ligne</Label>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez les caractéristiques du produit..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploadingImages}>{save.isPending || uploadingImages ? "…" : "Enregistrer"}</Button>
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
      if (isOffline()) {
        await queueOperation("stock_adjust", `Stock ${product.name} ${signed > 0 ? "+" : ""}${signed}`, {
          product_id: product.id, delta: signed, reason, note: note || null,
        });
        return;
      }
      const { error } = await supabase.rpc("adjust_stock", { _product_id: product.id, _delta: signed, _reason: reason, _note: note || undefined });
      if (error) throw error;
    },
    onSuccess: async () => {
      if (product) {
        await createNotification({
          title: "Mouvement de stock",
          message: `${product.name} a été ajusté${reason === "manual_out" ? " en sortie" : reason === "manual_in" ? " en entrée" : reason === "return" ? " en retour" : ""}.`,
          type: "warning",
          entity_type: "product",
          entity_id: product.id,
        });
      }
      toast.success("Stock mis à jour"); onSaved(); onOpenChange(false); setDelta(0); setNote("");
    },
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
